from __future__ import annotations

import os
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.core.errors import AppError
from app.db.session import SessionLocal
from app.models.report import Report, ReportAutoConfig, ReportCycle, ReportStatus
from app.models.rbac import RoleDataScope, User
from app.services.audit import create_audit_log
from app.services.data_center import to_datetime
from app.services.data_scope import DataScopeProfile
from app.services.metrics_dashboard import get_category_distribution, get_overview, get_root_cause_top, normalize_filters
from app.services.notification import create_notification
from app.tasks.progress import update_task_progress


REPORT_DIR = "/workspace/backend/.data/reports"


def new_id() -> str:
    return uuid.uuid4().hex


def ensure_dirs() -> None:
    os.makedirs(REPORT_DIR, exist_ok=True)


def _safe_filename(name: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9.\-_]+", "_", name)[:120]
    return safe or "report"


def _system_actor() -> CurrentUser:
    profile = DataScopeProfile(scope=RoleDataScope.ALL, user_id=0, dept_id=None, custom_dept_ids=frozenset())
    return CurrentUser(id=0, username="system", dept_id=None, permission_codes=frozenset(), menu_ids=frozenset(), data_scope=profile)


def _load_actor_stub(db: Session, actor_id: int | None) -> CurrentUser | None:
    if actor_id is None:
        return None
    user = db.get(User, actor_id)
    if user is None:
        return None
    profile = DataScopeProfile(scope=RoleDataScope.ALL, user_id=user.id, dept_id=user.department_id, custom_dept_ids=frozenset())
    return CurrentUser(id=user.id, username=user.username, dept_id=user.department_id, permission_codes=frozenset(), menu_ids=frozenset(), data_scope=profile)


def _guess_cycle(report_type: str, start_time: datetime | None, end_time: datetime | None) -> str:
    if report_type in {ReportCycle.DAILY.value, ReportCycle.WEEKLY.value, ReportCycle.MONTHLY.value, ReportCycle.QUARTERLY.value}:
        return report_type
    if start_time and end_time:
        delta = end_time.date() - start_time.date()
        if delta.days <= 1:
            return ReportCycle.DAILY.value
        if delta.days <= 7:
            return ReportCycle.WEEKLY.value
        if delta.days <= 31:
            return ReportCycle.MONTHLY.value
    return ReportCycle.CUSTOM.value


def _default_range(report_type: str) -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc).astimezone(ZoneInfo("Asia/Shanghai"))
    today = now.date()
    if report_type == ReportCycle.DAILY.value:
        start = datetime.combine(today - timedelta(days=1), datetime.min.time(), tzinfo=ZoneInfo("Asia/Shanghai"))
        end = start + timedelta(days=1) - timedelta(seconds=1)
    elif report_type == ReportCycle.WEEKLY.value:
        start_day = today - timedelta(days=7)
        start = datetime.combine(start_day, datetime.min.time(), tzinfo=ZoneInfo("Asia/Shanghai"))
        end = datetime.combine(today, datetime.min.time(), tzinfo=ZoneInfo("Asia/Shanghai")) - timedelta(seconds=1)
    elif report_type == ReportCycle.MONTHLY.value:
        first_this = date(today.year, today.month, 1)
        last_prev = first_this - timedelta(days=1)
        first_prev = date(last_prev.year, last_prev.month, 1)
        start = datetime.combine(first_prev, datetime.min.time(), tzinfo=ZoneInfo("Asia/Shanghai"))
        end = datetime.combine(first_this, datetime.min.time(), tzinfo=ZoneInfo("Asia/Shanghai")) - timedelta(seconds=1)
    else:
        start = datetime.combine(today - timedelta(days=30), datetime.min.time(), tzinfo=ZoneInfo("Asia/Shanghai"))
        end = datetime.combine(today, datetime.min.time(), tzinfo=ZoneInfo("Asia/Shanghai")) - timedelta(seconds=1)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


def _format_range(start: datetime | None, end: datetime | None) -> str:
    if not start or not end:
        return "-"
    s = start.astimezone(ZoneInfo("Asia/Shanghai")).strftime("%Y-%m-%d")
    e = end.astimezone(ZoneInfo("Asia/Shanghai")).strftime("%Y-%m-%d")
    return f"{s}~{e}"


def _build_report_payload(db: Session, *, report_type: str, start: datetime, end: datetime, actor: CurrentUser) -> dict:
    filters = normalize_filters(start_time=start.isoformat(), end_time=end.isoformat(), dept_id=None, category=None)
    overview = get_overview(db, filters=filters, actor=actor)
    category = get_category_distribution(db, filters=filters, actor=actor, limit=10)
    root_top = get_root_cause_top(db, filters=filters, actor=actor, level="deep", limit=10)
    return {"overview": overview, "categoryDistribution": category, "rootCauseTop": root_top}


def _build_report_text(report_type: str, title: str, start: datetime, end: datetime, payload: dict) -> str:
    overview = payload.get("overview") if isinstance(payload, dict) else None
    if not isinstance(overview, dict):
        overview = {}
    total = overview.get("totalComplaints")
    repeat_rate = overview.get("repeatRate")
    overdue = overview.get("overdueWorkOrders")
    sat = overview.get("satisfactionAvg")

    lines = [
        f"标题：{title}",
        f"报告类型：{report_type}",
        f"统计周期：{_format_range(start, end)}",
        "",
        "核心数据摘要：",
        f"- 投诉总量：{total if total is not None else 0}",
        f"- 重复投诉率：{round(float(repeat_rate) * 100, 2)}%" if repeat_rate is not None else "- 重复投诉率：-",
        f"- 逾期工单数：{overdue if overdue is not None else 0}",
        f"- 满意度均分：{sat if sat is not None else '-'}",
        "",
    ]

    cd = payload.get("categoryDistribution") if isinstance(payload, dict) else None
    items = (cd.get("items") if isinstance(cd, dict) else None) or []
    if isinstance(items, list) and items:
        lines.append("分类分布 TOP：")
        for it in items[:10]:
            if isinstance(it, dict):
                name = str(it.get("name") or "").strip()
                cnt = it.get("count")
                if name:
                    lines.append(f"- {name}：{int(cnt or 0)}")
        lines.append("")

    rt = payload.get("rootCauseTop") if isinstance(payload, dict) else None
    ritems = (rt.get("items") if isinstance(rt, dict) else None) or []
    if isinstance(ritems, list) and ritems:
        lines.append("深层根因 TOP：")
        for it in ritems[:10]:
            if isinstance(it, dict):
                name = str(it.get("name") or "").strip()
                cnt = it.get("count")
                if name:
                    lines.append(f"- {name}：{int(cnt or 0)}")
        lines.append("")

    lines.append("建议：")
    lines.append("- 针对高频分类与深层根因建立专项整改与闭环跟踪")
    lines.append("- 对逾期工单持续预警并按规则升级")
    lines.append("- 对重复投诉问题开展原因复盘与制度优化")
    return "\n".join(lines).strip() + "\n"


def create_report_row(
    db: Session,
    *,
    report_id: str,
    report_type: str,
    start: datetime | None,
    end: datetime | None,
    actor: CurrentUser | None,
) -> Report:
    cycle = _guess_cycle(report_type, start, end)
    title = f"{report_type} 投诉治理分析报告（{_format_range(start, end)}）"
    row = Report(
        id=report_id,
        report_type=report_type,
        cycle=cycle,
        status=ReportStatus.GENERATING.value,
        title=title,
        period_start=start,
        period_end=end,
        created_by=actor.id if actor else None,
    )
    db.add(row)
    return row


def generate_report(
    db: Session,
    *,
    report_id: str,
    notify_user_ids: list[int] | None,
    actor: CurrentUser | None,
    source: str,
) -> Report:
    row = db.get(Report, report_id)
    if row is None:
        raise AppError(code="NOT_FOUND", msg="报告不存在", status_code=404)

    if not isinstance(row.period_start, datetime) or not isinstance(row.period_end, datetime):
        start, end = _default_range(row.report_type)
        row.period_start = start
        row.period_end = end
    start = row.period_start
    end = row.period_end
    report_actor = actor or _system_actor()
    payload = _build_report_payload(db, report_type=row.report_type, start=start, end=end, actor=report_actor)
    text = _build_report_text(row.report_type, row.title, start, end, payload)
    row.content = text
    row.content_json = payload
    row.status = ReportStatus.GENERATED.value
    row.generated_at = datetime.now(timezone.utc)
    db.add(row)

    target_ids = list(dict.fromkeys((notify_user_ids or []) + ([actor.id] if actor and actor.id else [])))
    if not target_ids and row.created_by:
        target_ids = [int(row.created_by)]

    for uid in target_ids:
        create_notification(
            db,
            user_id=int(uid),
            title=f"报告已生成：{row.title}",
            content=f"报告ID：{row.id}\n报告类型：{row.report_type}\n统计周期：{_format_range(start, end)}",
            category="report",
            source=source,
        )
    return row


def run_report_generate_task(
    *,
    task_id: str,
    report_id: str,
    report_type: str,
    start_time: str | None,
    end_time: str | None,
    notify_user_ids: list[int] | None,
    actor_id: int | None,
) -> None:
    update_task_progress(None, task_id=task_id, progress=0, message="开始生成报告")
    with SessionLocal() as db:
        actor = _load_actor_stub(db, actor_id)
        start = to_datetime(start_time) if start_time else None
        end = to_datetime(end_time) if end_time else None
        if start is None or end is None:
            ds, de = _default_range(report_type)
            start = start or ds
            end = end or de
        if start > end:
            start, end = end, start
        create_report_row(db, report_id=report_id, report_type=report_type, start=start, end=end, actor=actor)
        create_audit_log(
            db,
            entity_type="report",
            entity_id=report_id,
            action="REPORT_GENERATE_START",
            actor=actor,
            after={"reportType": report_type, "startTime": start.isoformat(), "endTime": end.isoformat()},
            source=f"api:/report/generate",
        )
        db.commit()

        try:
            update_task_progress(None, task_id=task_id, progress=30, message="正在汇总指标")
            row = generate_report(db, report_id=report_id, notify_user_ids=notify_user_ids, actor=actor, source="report_generate")
            create_audit_log(
                db,
                entity_type="report",
                entity_id=row.id,
                action="REPORT_GENERATE_FINISH",
                actor=actor,
                after={"status": row.status},
                source=f"api:/report/generate",
            )
            db.commit()
            update_task_progress(None, task_id=task_id, progress=100, message="报告生成完成", status="SUCCESS", extra={"reportId": report_id})
        except AppError as e:
            db.rollback()
            r = db.get(Report, report_id)
            if r is not None:
                r.status = ReportStatus.FAILED.value
                r.content = f"生成失败：{e.msg}"
                db.add(r)
                create_audit_log(
                    db,
                    entity_type="report",
                    entity_id=report_id,
                    action="REPORT_GENERATE_FAIL",
                    actor=actor,
                    after={"code": e.code, "msg": e.msg},
                    source=f"api:/report/generate",
                )
                db.commit()
            update_task_progress(None, task_id=task_id, progress=100, message=e.msg, status="FAILURE")
        except Exception:
            db.rollback()
            r = db.get(Report, report_id)
            if r is not None:
                r.status = ReportStatus.FAILED.value
                r.content = "生成失败：系统内部错误"
                db.add(r)
                create_audit_log(
                    db,
                    entity_type="report",
                    entity_id=report_id,
                    action="REPORT_GENERATE_FAIL",
                    actor=actor,
                    after={"code": "INTERNAL_ERROR", "msg": "系统内部错误"},
                    source=f"api:/report/generate",
                )
                db.commit()
            update_task_progress(None, task_id=task_id, progress=100, message="系统内部错误", status="FAILURE")


def _simple_pdf_bytes(text: str) -> bytes:
    safe = text.replace("\r\n", "\n").replace("\r", "\n")
    safe = safe.encode("utf-8", errors="replace")
    body = b"BT\n/F1 12 Tf\n72 770 Td\n14 TL\n(" + safe.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)").replace(b"\n", b") Tj\nT*\n(") + b") Tj\nET"

    objects: list[bytes] = []
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append(b"<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    objects.append(b"<< /Length " + str(len(body)).encode() + b" >>\nstream\n" + body + b"\nendstream")

    xref: list[int] = [0]
    out = bytearray()
    out.extend(b"%PDF-1.4\n")
    for i, obj in enumerate(objects, start=1):
        xref.append(len(out))
        out.extend(f"{i} 0 obj\n".encode())
        out.extend(obj)
        out.extend(b"\nendobj\n")
    startxref = len(out)
    out.extend(b"xref\n0 " + str(len(objects) + 1).encode() + b"\n")
    out.extend(b"0000000000 65535 f \n")
    for off in xref[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode())
    out.extend(b"trailer\n<< /Size " + str(len(objects) + 1).encode() + b" /Root 1 0 R >>\n")
    out.extend(b"startxref\n" + str(startxref).encode() + b"\n%%EOF")
    return bytes(out)


def export_report_pdf(db: Session, *, report_id: str, actor: CurrentUser, source: str) -> str:
    row = db.get(Report, report_id)
    if row is None:
        raise AppError(code="NOT_FOUND", msg="报告不存在", status_code=404)
    if row.status != ReportStatus.GENERATED.value:
        raise AppError(code="REPORT_NOT_READY", msg="报告尚未生成完成", status_code=400)

    ensure_dirs()
    start = row.period_start if isinstance(row.period_start, datetime) else None
    end = row.period_end if isinstance(row.period_end, datetime) else None
    filename = _safe_filename(f"{row.report_type}_{_format_range(start, end)}_{row.id}.pdf")
    path = os.path.join(REPORT_DIR, filename)
    content = row.content or ""
    pdf = _simple_pdf_bytes(content)
    with open(path, "wb") as f:
        f.write(pdf)

    before = row.file_ref if isinstance(row.file_ref, dict) else None
    row.file_ref = {"pdf": {"path": path, "filename": filename}}
    db.add(row)
    create_audit_log(
        db,
        entity_type="report",
        entity_id=row.id,
        action="REPORT_EXPORT",
        actor=actor,
        before={"fileRef": before},
        after={"fileRef": row.file_ref},
        source=source,
    )
    return path


def scan_report_auto_configs(db: Session, *, now: datetime | None = None) -> int:
    now_dt = now or datetime.now(timezone.utc)
    sh_now = now_dt.astimezone(ZoneInfo("Asia/Shanghai"))

    rows = db.execute(select(ReportAutoConfig).where(ReportAutoConfig.enabled.is_(True))).scalars().all()
    triggered = 0
    for cfg in rows:
        if not cfg.run_time:
            continue
        m = re.match(r"^(\d{1,2}):(\d{2})$", str(cfg.run_time).strip())
        if not m:
            continue
        hh = int(m.group(1))
        mm = int(m.group(2))
        if not (0 <= hh <= 23 and 0 <= mm <= 59):
            continue
        due_time = sh_now.replace(hour=hh, minute=mm, second=0, microsecond=0)
        if sh_now < due_time:
            continue

        last = cfg.last_run_at.astimezone(ZoneInfo("Asia/Shanghai")).date() if isinstance(cfg.last_run_at, datetime) else None
        if last == sh_now.date():
            continue

        if cfg.cycle == ReportCycle.WEEKLY.value:
            weekday = int(cfg.weekday or 1)
            if sh_now.isoweekday() != weekday:
                continue
        if cfg.cycle == ReportCycle.MONTHLY.value:
            dom = int(cfg.day_of_month or 1)
            if sh_now.day != dom:
                continue

        start, end = _default_range(cfg.cycle)
        report_id = new_id()
        actor = _load_actor_stub(db, cfg.created_by) or _system_actor()
        create_report_row(db, report_id=report_id, report_type=cfg.report_type, start=start, end=end, actor=actor if actor.id else None)
        create_audit_log(
            db,
            entity_type="report_auto_config",
            entity_id=str(cfg.id),
            action="REPORT_AUTO_TRIGGER",
            actor=actor if actor.id else None,
            after={"reportId": report_id, "reportType": cfg.report_type, "cycle": cfg.cycle},
            source="scheduler",
        )
        generate_report(db, report_id=report_id, notify_user_ids=(cfg.notify_user_ids if isinstance(cfg.notify_user_ids, list) else None), actor=actor if actor.id else None, source="scheduler")
        cfg.last_run_at = now_dt
        db.add(cfg)
        triggered += 1

    return triggered

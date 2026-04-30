from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.auth import CurrentUser
from app.core.config import get_settings
from app.core.errors import AppError
from app.models.complaint_analysis import ComplaintAnalysis
from app.models.data_center import DataRecord, DataType
from app.models.rbac import Department, User
from app.models.work_order import SatisfactionRecord, WorkOrder, WorkOrderActionLog
from app.services.audit import create_audit_log
from app.services.data_scope import apply_data_scope
from app.services.notification import create_notification
from app.services.workorder_warning import get_workorder_warning_rule


class WorkOrderRectificationStatus:
    PENDING = "待整改"
    IN_PROGRESS = "整改中"
    WAIT_VERIFY = "待核验"
    CLOSED = "已闭环"
    FAILED = "整改失败"


class WorkOrderVerifyStatus:
    PENDING = "待核验"
    PASSED = "核验通过"
    REJECTED = "核验不通过"


class WorkOrderCloseStatus:
    OPEN = "未闭环"
    CLOSED = "已闭环"
    OVERDUE = "逾期未闭环"


class WorkOrderWarningStatus:
    NORMAL = "正常"
    SOON = "即将逾期"
    OVERDUE = "已逾期"


class SatisfactionCheckStatus:
    PENDING = "待校验"
    PASSED = "校验通过"
    FAILED = "校验不通过"


def new_id() -> str:
    return uuid.uuid4().hex


def _parse_deadline(v: Any) -> datetime | None:
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if isinstance(v, str):
        s = v.strip()
        if not s:
            return None
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S", "%Y-%m-%d"):
            try:
                dt = datetime.strptime(s, fmt)
                return dt.replace(tzinfo=timezone.utc)
            except Exception:
                continue
        try:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


def _to_str_time(v: Any) -> str | None:
    if isinstance(v, datetime):
        dt = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    return None


def _owner_info(record: DataRecord | None) -> str | None:
    if record is None:
        return None
    parts = [x for x in [record.owner_name, record.building_room, record.phone] if x]
    return " / ".join(parts) if parts else None


def _compute_warning_status(db: Session, deadline: datetime | None) -> str:
    if not deadline:
        return WorkOrderWarningStatus.NORMAL
    rule = get_workorder_warning_rule(db)
    now = datetime.now(timezone.utc)
    dl = deadline if deadline.tzinfo else deadline.replace(tzinfo=timezone.utc)
    if now > dl:
        return WorkOrderWarningStatus.OVERDUE
    if dl - now <= timedelta(hours=rule.warning_hours):
        return WorkOrderWarningStatus.SOON
    return WorkOrderWarningStatus.NORMAL


def _display_status(row: WorkOrder) -> str:
    if row.close_status == WorkOrderCloseStatus.CLOSED or row.rectification_status == WorkOrderRectificationStatus.CLOSED:
        return "已完成"
    if row.verify_status == WorkOrderVerifyStatus.REJECTED:
        return "已退回"
    if row.satisfaction_check_status == SatisfactionCheckStatus.FAILED and row.rectification_status == WorkOrderRectificationStatus.IN_PROGRESS:
        return "已退回"
    return row.rectification_status


def _snapshot(row: WorkOrder) -> dict[str, Any]:
    return {
        "rectification_status": row.rectification_status,
        "verify_status": row.verify_status,
        "close_status": row.close_status,
        "warning_status": row.warning_status,
        "satisfaction_check_status": row.satisfaction_check_status,
        "deadline": _to_str_time(row.deadline),
        "result": row.result,
        "verify_reason": row.verify_reason,
        "forced_close": row.forced_close,
        "forced_reason": row.forced_reason,
        "urge_count": row.urge_count,
        "last_urged_at": _to_str_time(row.last_urged_at),
    }


def _log_action(
    db: Session,
    *,
    work_order_id: str,
    action: str,
    actor: CurrentUser | None,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
    reason: str | None = None,
    message: str | None = None,
    payload: object | None = None,
) -> WorkOrderActionLog:
    row = WorkOrderActionLog(
        work_order_id=work_order_id,
        action=action,
        operator_id=actor.id if actor else None,
        reason=reason,
        message=message,
        before=before,
        after=after,
        payload=payload,
    )
    db.add(row)
    return row


def create_work_order(
    db: Session,
    *,
    analysis_id: str | None,
    work_order_no: str | None,
    actor: CurrentUser | None,
) -> WorkOrder:
    analysis_id = analysis_id.strip() if analysis_id else None
    work_order_no = work_order_no.strip() if work_order_no else None
    if not analysis_id and not work_order_no:
        raise AppError(code="PARAM_REQUIRED", msg="analysisId 或 workOrderNo 至少提供一个", status_code=400)

    existing = None
    if analysis_id:
        existing = db.execute(select(WorkOrder).where(WorkOrder.analysis_id == analysis_id)).scalars().first()
    if existing is None and work_order_no:
        existing = db.execute(select(WorkOrder).where(WorkOrder.work_order_no == work_order_no)).scalars().first()
    if existing is not None:
        return existing

    analysis_row = db.get(ComplaintAnalysis, analysis_id) if analysis_id else None
    if analysis_id and analysis_row is None:
        raise AppError(code="NOT_FOUND", msg="分析记录不存在", status_code=404)

    resolved_work_order_no = work_order_no or (analysis_row.work_order_no.strip() if analysis_row and analysis_row.work_order_no else None)
    if not resolved_work_order_no:
        raise AppError(code="WORK_ORDER_NO_REQUIRED", msg="关联工单号不能为空", status_code=400)

    if analysis_row is not None and analysis_row.work_order_no and analysis_row.work_order_no.strip() != resolved_work_order_no:
        before = {"work_order_no": analysis_row.work_order_no}
        analysis_row.work_order_no = resolved_work_order_no
        create_audit_log(
            db,
            entity_type="complaint_analysis",
            entity_id=analysis_row.id,
            action="WORKORDER_WORK_ORDER_NO_SYNC",
            actor=actor,
            before=before,
            after={"work_order_no": analysis_row.work_order_no},
            reason="生成工单时同步工单号",
        )

    dept_name = analysis_row.responsible_dept if analysis_row else None
    dept_id = None
    if dept_name:
        dept = db.execute(select(Department).where(Department.name == dept_name)).scalars().first()
        dept_id = dept.id if dept else None

    suggested = analysis_row.suggested_rectification if analysis_row and isinstance(analysis_row.suggested_rectification, dict) else {}
    requirement = suggested.get("requirement") if isinstance(suggested, dict) else None
    deadline = _parse_deadline(suggested.get("deadline") if isinstance(suggested, dict) else None)

    wo = WorkOrder(
        id=new_id(),
        analysis_id=analysis_row.id if analysis_row else None,
        work_order_no=resolved_work_order_no,
        rectification_status=WorkOrderRectificationStatus.PENDING,
        verify_status=WorkOrderVerifyStatus.PENDING,
        close_status=WorkOrderCloseStatus.OPEN,
        warning_status=_compute_warning_status(db, deadline),
        satisfaction_check_status=SatisfactionCheckStatus.PENDING,
        department_id=dept_id,
        department_name=dept_name,
        assignee_id=None,
        requirement=requirement,
        deadline=deadline,
        result=None,
        created_by=actor.id if actor else None,
    )
    db.add(wo)
    db.flush()

    before = None
    after = _snapshot(wo)
    _log_action(
        db,
        work_order_id=wo.id,
        action="WORKORDER_CREATE",
        actor=actor,
        before=before,
        after=after,
        payload={"analysis_id": analysis_id, "work_order_no": resolved_work_order_no},
    )
    create_audit_log(
        db,
        entity_type="work_order",
        entity_id=wo.id,
        action="WORKORDER_CREATE",
        actor=actor,
        after={"analysis_id": wo.analysis_id, "work_order_no": wo.work_order_no, "department": wo.department_name},
    )
    return wo


def query_work_order_page(
    db: Session,
    *,
    page: int,
    size: int,
    work_order_no: str | None,
    status: str | None,
    department: str | None,
    assignee: str | None,
    start_time: datetime | None,
    end_time: datetime | None,
    actor: CurrentUser,
) -> tuple[list[WorkOrder], int]:
    clauses = []
    if work_order_no:
        clauses.append(WorkOrder.work_order_no.like(f"%{work_order_no.strip()}%"))
    if department:
        k = department.strip()
        clauses.append(WorkOrder.department_name.like(f"%{k}%"))
    if assignee:
        k = assignee.strip()
        clauses.append(WorkOrder.assignee.has(User.username.like(f"%{k}%")))
    if status:
        s = status.strip()
        if s == "已完成":
            clauses.append(WorkOrder.close_status == WorkOrderCloseStatus.CLOSED)
        elif s == "已退回":
            clauses.append(
                or_(
                    WorkOrder.verify_status == WorkOrderVerifyStatus.REJECTED,
                    WorkOrder.satisfaction_check_status == SatisfactionCheckStatus.FAILED,
                )
            )
        else:
            clauses.append(WorkOrder.rectification_status == s)
    if start_time:
        clauses.append(WorkOrder.created_at >= start_time)
    if end_time:
        clauses.append(WorkOrder.created_at <= end_time)

    where = and_(*clauses) if clauses else None
    base = select(WorkOrder).options(
        selectinload(WorkOrder.analysis).selectinload(ComplaintAnalysis.complaint_record),
        selectinload(WorkOrder.assignee),
    )
    if where is not None:
        base = base.where(where)

    base = apply_data_scope(db, base, actor.data_scope, dept_column=WorkOrder.department_id, user_column=WorkOrder.created_by)

    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    rows = (
        db.execute(base.order_by(WorkOrder.created_at.desc()).offset((page - 1) * size).limit(size))
        .scalars()
        .all()
    )
    return rows, int(total)


def get_work_order(db: Session, *, work_order_id: str, actor: CurrentUser) -> WorkOrder:
    row = db.get(WorkOrder, work_order_id)
    if row is None:
        raise AppError(code="NOT_FOUND", msg="工单不存在", status_code=404)
    scoped = apply_data_scope(db, select(WorkOrder.id).where(WorkOrder.id == work_order_id), actor.data_scope, dept_column=WorkOrder.department_id, user_column=WorkOrder.created_by)
    ok = db.execute(select(func.count()).select_from(scoped.subquery())).scalar_one()
    if int(ok) <= 0:
        raise AppError(code="FORBIDDEN", msg="无权限访问", status_code=403)
    return row


def submit_work_order(db: Session, *, work_order_id: str, result: str, actor: CurrentUser) -> WorkOrder:
    row = get_work_order(db, work_order_id=work_order_id, actor=actor)
    if row.close_status == WorkOrderCloseStatus.CLOSED:
        raise AppError(code="INVALID_STATE", msg="工单已闭环，无法提交整改", status_code=400)
    if row.rectification_status not in {WorkOrderRectificationStatus.PENDING, WorkOrderRectificationStatus.IN_PROGRESS}:
        raise AppError(code="INVALID_STATE", msg="当前状态不允许提交整改", status_code=400)
    if not result or not result.strip():
        raise AppError(code="RESULT_REQUIRED", msg="整改结果不能为空", status_code=400)

    before = _snapshot(row)
    row.result = result.strip()
    row.rectification_status = WorkOrderRectificationStatus.WAIT_VERIFY
    row.verify_status = WorkOrderVerifyStatus.PENDING
    row.verify_reason = None
    row.satisfaction_check_status = SatisfactionCheckStatus.PENDING
    row.warning_status = _compute_warning_status(db, row.deadline)
    after = _snapshot(row)

    _log_action(db, work_order_id=row.id, action="WORKORDER_SUBMIT", actor=actor, before=before, after=after)
    create_audit_log(
        db,
        entity_type="work_order",
        entity_id=row.id,
        action="WORKORDER_SUBMIT",
        actor=actor,
        before=before,
        after=after,
    )
    return row


def _threshold_mapping() -> dict[str, Any]:
    settings = get_settings()
    good_min = int(settings.satisfaction_good_min_score)
    ok_min = int(settings.satisfaction_ok_min_score)
    good_min = max(1, min(10, good_min))
    ok_min = max(1, min(good_min, ok_min))
    mapping = [
        {"label": "满意", "min": good_min, "max": 10},
        {"label": "基本满意", "min": ok_min, "max": good_min - 1},
        {"label": "不满意", "min": 1, "max": ok_min - 1},
    ]
    return {"mapping": mapping, "goodMin": good_min, "okMin": ok_min}


def _pick_best_satisfaction_data(db: Session, *, work_order_no: str) -> DataRecord | None:
    candidates = (
        db.execute(
            select(DataRecord)
            .where(
                and_(
                    DataRecord.work_order_no == work_order_no,
                    DataRecord.data_type.in_([DataType.SATISFACTION_400.value, DataType.CALL_AUDIT.value]),
                )
            )
            .order_by(DataRecord.event_time.desc().nullslast(), DataRecord.created_at.desc())
        )
        .scalars()
        .all()
    )
    if not candidates:
        return None
    best_400 = [r for r in candidates if r.data_type == DataType.SATISFACTION_400.value]
    return best_400[0] if best_400 else candidates[0]


def _record_rule_hit(rule_hits: list[dict[str, Any]], *, code: str, msg: str, detail: dict[str, Any] | None = None) -> None:
    payload: dict[str, Any] = {"code": code, "msg": msg, "hitAt": datetime.now(timezone.utc).isoformat()}
    if detail:
        payload["detail"] = detail
    rule_hits.append(payload)


def run_satisfaction_check(db: Session, *, row: WorkOrder, actor: CurrentUser | None, trigger: str) -> SatisfactionRecord:
    if row.close_status == WorkOrderCloseStatus.CLOSED:
        hits: list[dict[str, Any]] = []
        _record_rule_hit(hits, code="ALREADY_CLOSED", msg="工单已闭环，跳过满意度校验")
        rec = SatisfactionRecord(
            work_order_id=row.id,
            source_data_record_id=None,
            score=None,
            result=None,
            check_status=row.satisfaction_check_status,
            threshold_mapping=_threshold_mapping(),
            rule_hits=hits,
            checked_at=datetime.now(timezone.utc),
        )
        db.add(rec)
        return rec

    mapping = _threshold_mapping()
    best = _pick_best_satisfaction_data(db, work_order_no=row.work_order_no or "")
    hits: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc)

    if best is None:
        _record_rule_hit(hits, code="NO_SATISFACTION_DATA", msg="未找到可用于校验的满意度数据")
        rec = SatisfactionRecord(
            work_order_id=row.id,
            source_data_record_id=None,
            score=None,
            result=None,
            check_status=SatisfactionCheckStatus.PENDING,
            threshold_mapping=mapping,
            rule_hits=hits,
            checked_at=now,
        )
        db.add(rec)
        before = _snapshot(row)
        row.satisfaction_check_status = SatisfactionCheckStatus.PENDING
        after = _snapshot(row)
        _log_action(
            db,
            work_order_id=row.id,
            action="WORKORDER_SATISFACTION_PENDING",
            actor=actor,
            before=before,
            after=after,
            payload={"trigger": trigger},
        )
        create_audit_log(
            db,
            entity_type="work_order",
            entity_id=row.id,
            action="WORKORDER_SATISFACTION_CHECK",
            actor=actor,
            before=before,
            after={"status": row.satisfaction_check_status, "ruleHits": hits, "trigger": trigger},
        )
        return rec

    score = best.satisfaction_score
    if not isinstance(score, int) or not (1 <= score <= 10):
        _record_rule_hit(hits, code="INVALID_SCORE", msg="满意度评分不合法", detail={"score": score, "dataRecordId": best.id})
        rec = SatisfactionRecord(
            work_order_id=row.id,
            source_data_record_id=best.id,
            score=score if isinstance(score, int) else None,
            result=None,
            check_status=SatisfactionCheckStatus.PENDING,
            threshold_mapping=mapping,
            rule_hits=hits,
            checked_at=now,
        )
        db.add(rec)
        before = _snapshot(row)
        row.satisfaction_check_status = SatisfactionCheckStatus.PENDING
        after = _snapshot(row)
        _log_action(
            db,
            work_order_id=row.id,
            action="WORKORDER_SATISFACTION_PENDING",
            actor=actor,
            before=before,
            after=after,
            payload={"trigger": trigger, "dataRecordId": best.id},
        )
        create_audit_log(
            db,
            entity_type="work_order",
            entity_id=row.id,
            action="WORKORDER_SATISFACTION_CHECK",
            actor=actor,
            before=before,
            after={"status": row.satisfaction_check_status, "ruleHits": hits, "trigger": trigger, "dataRecordId": best.id},
        )
        return rec

    good_min = int(mapping["goodMin"])
    ok_min = int(mapping["okMin"])
    if score >= good_min:
        mapped = "满意"
    elif score >= ok_min:
        mapped = "基本满意"
    else:
        mapped = "不满意"

    passed = score >= ok_min
    check_status = SatisfactionCheckStatus.PASSED if passed else SatisfactionCheckStatus.FAILED
    if not passed:
        _record_rule_hit(
            hits,
            code="SCORE_TOO_LOW",
            msg="满意度低于阈值",
            detail={"score": score, "okMin": ok_min, "dataRecordId": best.id, "mapped": mapped},
        )

    rec = SatisfactionRecord(
        work_order_id=row.id,
        source_data_record_id=best.id,
        score=score,
        result=mapped,
        check_status=check_status,
        threshold_mapping=mapping,
        rule_hits=hits,
        checked_at=now,
    )
    db.add(rec)

    before = _snapshot(row)
    row.satisfaction_check_status = check_status
    row.warning_status = _compute_warning_status(db, row.deadline)
    if passed:
        row.close_status = WorkOrderCloseStatus.CLOSED
        row.rectification_status = WorkOrderRectificationStatus.CLOSED
    else:
        if get_settings().workorder_auto_return_on_satisfaction_fail:
            row.rectification_status = WorkOrderRectificationStatus.IN_PROGRESS
    after = _snapshot(row)

    _log_action(
        db,
        work_order_id=row.id,
        action="WORKORDER_SATISFACTION_CHECK",
        actor=actor,
        before=before,
        after=after,
        payload={"trigger": trigger, "dataRecordId": best.id, "score": score, "mapped": mapped, "passed": passed},
    )
    create_audit_log(
        db,
        entity_type="work_order",
        entity_id=row.id,
        action="WORKORDER_SATISFACTION_CHECK",
        actor=actor,
        before=before,
        after={"status": check_status, "mapped": mapped, "score": score, "trigger": trigger, "ruleHits": hits},
    )
    if passed:
        _log_action(
            db,
            work_order_id=row.id,
            action="WORKORDER_CLOSE",
            actor=actor,
            before=before,
            after=after,
            message="满意度校验通过并闭环",
        )
        create_audit_log(
            db,
            entity_type="work_order",
            entity_id=row.id,
            action="WORKORDER_CLOSE",
            actor=actor,
            before=before,
            after=after,
            reason="满意度校验通过并闭环",
        )
    elif row.rectification_status == WorkOrderRectificationStatus.IN_PROGRESS and row.satisfaction_check_status == SatisfactionCheckStatus.FAILED:
        _log_action(
            db,
            work_order_id=row.id,
            action="WORKORDER_AUTO_RETURN",
            actor=actor,
            before=before,
            after=after,
            reason="满意度校验不通过自动退回整改",
        )
        create_audit_log(
            db,
            entity_type="work_order",
            entity_id=row.id,
            action="WORKORDER_AUTO_RETURN",
            actor=actor,
            before=before,
            after=after,
            reason="满意度校验不通过自动退回整改",
        )
    return rec


def verify_work_order(db: Session, *, work_order_id: str, passed: bool, reason: str | None, actor: CurrentUser) -> WorkOrder:
    row = get_work_order(db, work_order_id=work_order_id, actor=actor)
    if row.close_status == WorkOrderCloseStatus.CLOSED:
        raise AppError(code="INVALID_STATE", msg="工单已闭环，无法核验", status_code=400)
    if row.rectification_status != WorkOrderRectificationStatus.WAIT_VERIFY:
        raise AppError(code="INVALID_STATE", msg="当前状态不允许核验", status_code=400)

    if not passed and (reason is None or not reason.strip()):
        raise AppError(code="REASON_REQUIRED", msg="退回原因不能为空", status_code=400)

    before = _snapshot(row)
    row.verify_reason = reason.strip() if reason else None
    row.warning_status = _compute_warning_status(db, row.deadline)
    if not passed:
        row.verify_status = WorkOrderVerifyStatus.REJECTED
        row.rectification_status = WorkOrderRectificationStatus.IN_PROGRESS
        after = _snapshot(row)
        _log_action(
            db,
            work_order_id=row.id,
            action="WORKORDER_VERIFY_REJECT",
            actor=actor,
            before=before,
            after=after,
            reason=row.verify_reason,
        )
        create_audit_log(
            db,
            entity_type="work_order",
            entity_id=row.id,
            action="WORKORDER_VERIFY_REJECT",
            actor=actor,
            before=before,
            after=after,
            reason=row.verify_reason,
        )
        return row

    row.verify_status = WorkOrderVerifyStatus.PASSED
    after = _snapshot(row)
    _log_action(
        db,
        work_order_id=row.id,
        action="WORKORDER_VERIFY_PASS",
        actor=actor,
        before=before,
        after=after,
        reason=row.verify_reason,
    )
    create_audit_log(
        db,
        entity_type="work_order",
        entity_id=row.id,
        action="WORKORDER_VERIFY_PASS",
        actor=actor,
        before=before,
        after=after,
        reason=row.verify_reason,
    )

    run_satisfaction_check(db, row=row, actor=actor, trigger="verify")
    return row


def urge_work_order(db: Session, *, work_order_id: str, message: str | None, actor: CurrentUser) -> WorkOrder:
    row = get_work_order(db, work_order_id=work_order_id, actor=actor)
    if row.close_status == WorkOrderCloseStatus.CLOSED:
        raise AppError(code="INVALID_STATE", msg="工单已闭环，无需催办", status_code=400)
    before = _snapshot(row)
    row.urge_count = int(row.urge_count or 0) + 1
    row.last_urged_at = datetime.now(timezone.utc)
    row.warning_status = _compute_warning_status(db, row.deadline)
    after = _snapshot(row)
    _log_action(
        db,
        work_order_id=row.id,
        action="WORKORDER_URGE",
        actor=actor,
        before=before,
        after=after,
        payload={"message": message.strip() if message else None},
    )
    create_audit_log(
        db,
        entity_type="work_order",
        entity_id=row.id,
        action="WORKORDER_URGE",
        actor=actor,
        before=before,
        after=after,
    )
    if row.assignee_id:
        title = "工单催办提醒"
        content = f"工单号 {row.work_order_no or row.id} 收到催办"
        if message and message.strip():
            content = f"{content}：{message.strip()}"
        create_notification(db, user_id=row.assignee_id, title=title, content=content, category="workorder", source=row.id)
    return row


def force_close_work_order(db: Session, *, work_order_id: str, reason: str, actor: CurrentUser) -> WorkOrder:
    row = get_work_order(db, work_order_id=work_order_id, actor=actor)
    if not reason or not reason.strip():
        raise AppError(code="REASON_REQUIRED", msg="原因不能为空", status_code=400)
    if row.close_status == WorkOrderCloseStatus.CLOSED:
        raise AppError(code="INVALID_STATE", msg="工单已闭环", status_code=400)
    before = _snapshot(row)
    row.rectification_status = WorkOrderRectificationStatus.CLOSED
    row.close_status = WorkOrderCloseStatus.CLOSED
    row.forced_close = True
    row.forced_reason = reason.strip()
    row.satisfaction_check_status = SatisfactionCheckStatus.PENDING
    row.warning_status = _compute_warning_status(db, row.deadline)
    after = _snapshot(row)
    _log_action(
        db,
        work_order_id=row.id,
        action="WORKORDER_FORCE_CLOSE",
        actor=actor,
        before=before,
        after=after,
        reason=row.forced_reason,
    )
    create_audit_log(
        db,
        entity_type="work_order",
        entity_id=row.id,
        action="WORKORDER_FORCE_CLOSE",
        actor=actor,
        before=before,
        after=after,
        reason=row.forced_reason,
    )
    return row


def list_action_logs(db: Session, *, work_order_id: str) -> list[WorkOrderActionLog]:
    return (
        db.execute(
            select(WorkOrderActionLog)
            .where(WorkOrderActionLog.work_order_id == work_order_id)
            .order_by(WorkOrderActionLog.created_at.asc(), WorkOrderActionLog.id.asc())
        )
        .scalars()
        .all()
    )


def list_satisfaction_records(db: Session, *, work_order_id: str) -> list[SatisfactionRecord]:
    return (
        db.execute(
            select(SatisfactionRecord)
            .where(SatisfactionRecord.work_order_id == work_order_id)
            .order_by(SatisfactionRecord.created_at.desc(), SatisfactionRecord.id.desc())
        )
        .scalars()
        .all()
    )

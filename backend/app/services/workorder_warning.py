from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.work_order import WorkOrder, WorkOrderActionLog
from app.models.system_rule import SystemRule
from app.services.audit import create_audit_log
from app.services.notification import create_notification


WORKORDER_WARNING_RULE_KEY = "workorder_warning_rule"


class WorkdayBasis:
    NATURAL = "NATURAL"
    WORKDAY = "WORKDAY"


@dataclass(frozen=True)
class WorkOrderWarningRule:
    warning_hours: int
    escalation_workdays: int
    day_basis: str
    holiday_calendar: dict[str, Any] | None
    calendar_enabled: bool


def _default_rule() -> WorkOrderWarningRule:
    settings = get_settings()
    return WorkOrderWarningRule(
        warning_hours=max(1, int(settings.workorder_warning_hours)),
        escalation_workdays=3,
        day_basis=WorkdayBasis.NATURAL,
        holiday_calendar=None,
        calendar_enabled=False,
    )


def _normalize_rule_payload(payload: object | None) -> WorkOrderWarningRule:
    base = _default_rule()
    if not isinstance(payload, dict):
        return base
    warning_hours = payload.get("warningHours")
    escalation_workdays = payload.get("escalationWorkdays")
    day_basis = payload.get("dayBasis")
    holiday_calendar = payload.get("holidayCalendar")

    wh = base.warning_hours
    if isinstance(warning_hours, int) and warning_hours > 0:
        wh = warning_hours

    ew = base.escalation_workdays
    if isinstance(escalation_workdays, int) and escalation_workdays > 0:
        ew = escalation_workdays

    dbasis = base.day_basis
    if isinstance(day_basis, str) and day_basis.strip().upper() in {WorkdayBasis.NATURAL, WorkdayBasis.WORKDAY}:
        dbasis = day_basis.strip().upper()

    cal: dict[str, Any] | None = None
    if isinstance(holiday_calendar, dict):
        cal = holiday_calendar

    enabled = False
    if dbasis == WorkdayBasis.WORKDAY and cal and (cal.get("holidays") or cal.get("workdays")):
        enabled = True
    if dbasis == WorkdayBasis.WORKDAY and not enabled:
        dbasis = WorkdayBasis.NATURAL

    return WorkOrderWarningRule(
        warning_hours=wh,
        escalation_workdays=ew,
        day_basis=dbasis,
        holiday_calendar=cal,
        calendar_enabled=enabled,
    )


def get_workorder_warning_rule(db: Session) -> WorkOrderWarningRule:
    row = db.get(SystemRule, WORKORDER_WARNING_RULE_KEY)
    payload = row.value if row else None
    return _normalize_rule_payload(payload)


def save_workorder_warning_rule(db: Session, *, payload: dict[str, Any], actor) -> WorkOrderWarningRule:
    normalized = _normalize_rule_payload(payload)
    before_row = db.get(SystemRule, WORKORDER_WARNING_RULE_KEY)
    before = before_row.value if before_row else None

    if before_row is None:
        before_row = SystemRule(key=WORKORDER_WARNING_RULE_KEY, value=payload)
        db.add(before_row)
    else:
        before_row.value = payload

    create_audit_log(
        db,
        entity_type="system_rule",
        entity_id=WORKORDER_WARNING_RULE_KEY,
        action="SYSTEM_RULE_SAVE",
        actor=actor,
        before=before,
        after=payload,
        reason="保存工单预警与升级规则",
        source="api",
    )
    return normalized


def _date_range_inclusive(start: date, end: date) -> list[date]:
    if end < start:
        return []
    days = (end - start).days
    return [start + timedelta(days=i) for i in range(days + 1)]


def _parse_iso_date(v: object) -> date | None:
    if not isinstance(v, str):
        return None
    s = v.strip()
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except Exception:
        return None


def _is_workday(d: date, *, calendar: dict[str, Any] | None) -> bool:
    if not calendar:
        return d.weekday() < 5
    workdays_raw = calendar.get("workdays")
    holidays_raw = calendar.get("holidays")
    workdays = {_parse_iso_date(x) for x in workdays_raw} if isinstance(workdays_raw, list) else set()
    holidays = {_parse_iso_date(x) for x in holidays_raw} if isinstance(holidays_raw, list) else set()
    workdays.discard(None)
    holidays.discard(None)
    if d in workdays:
        return True
    if d in holidays:
        return False
    return d.weekday() < 5


def compute_overdue_days(
    *,
    deadline: datetime,
    now: datetime,
    rule: WorkOrderWarningRule,
    tz: ZoneInfo | None = None,
) -> int:
    if now <= deadline:
        return 0
    tz = tz or ZoneInfo("Asia/Shanghai")
    dl_local = deadline.astimezone(tz)
    now_local = now.astimezone(tz)
    start = dl_local.date() + timedelta(days=1)
    end = now_local.date()
    if end < start:
        return 0
    if rule.day_basis == WorkdayBasis.NATURAL:
        return int((end - dl_local.date()).days)
    days = 0
    for d in _date_range_inclusive(start, end):
        if _is_workday(d, calendar=rule.holiday_calendar):
            days += 1
    return days


def list_users_by_permission_in_department(db: Session, *, department_id: int, permission_code: str) -> list[int]:
    from app.models.rbac import Permission, Role, User, role_permission, user_role

    stmt = (
        select(User.id)
        .select_from(User)
        .join(user_role, user_role.c.user_id == User.id)
        .join(Role, Role.id == user_role.c.role_id)
        .join(role_permission, role_permission.c.role_id == Role.id)
        .join(Permission, Permission.id == role_permission.c.permission_id)
        .where(
            User.department_id == department_id,
            User.is_active.is_(True),
            Role.is_active.is_(True),
            Permission.is_active.is_(True),
            Permission.code == permission_code,
        )
    )
    return list(db.execute(stmt).scalars().all())


class _WarnStatus:
    NORMAL = "正常"
    SOON = "即将逾期"
    OVERDUE = "已逾期"


class _CloseStatus:
    OPEN = "未闭环"
    CLOSED = "已闭环"
    OVERDUE = "逾期未闭环"


def _snapshot_for_scan(row: WorkOrder) -> dict[str, Any]:
    dl = row.deadline
    dl_str = None
    if isinstance(dl, datetime):
        dl_str = dl.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    return {"warning_status": row.warning_status, "close_status": row.close_status, "deadline": dl_str}


def _compute_warning_status_by_rule(deadline: datetime | None, *, now: datetime, rule: WorkOrderWarningRule) -> str:
    if not deadline:
        return _WarnStatus.NORMAL
    dl = deadline if deadline.tzinfo else deadline.replace(tzinfo=timezone.utc)
    if now > dl:
        return _WarnStatus.OVERDUE
    if dl - now <= timedelta(hours=rule.warning_hours):
        return _WarnStatus.SOON
    return _WarnStatus.NORMAL


def scan_workorder_warning(
    db: Session,
    *,
    actor,
    source: str,
) -> dict[str, Any]:
    rule = get_workorder_warning_rule(db)
    now = datetime.now(timezone.utc)

    rows = (
        db.execute(
            select(WorkOrder).where(
                WorkOrder.close_status != _CloseStatus.CLOSED,
                WorkOrder.deadline.is_not(None),
            )
        )
        .scalars()
        .all()
    )

    warning_updated = 0
    close_updated = 0
    notified_soon = 0
    notified_overdue = 0
    escalated = 0

    for row in rows:
        before = _snapshot_for_scan(row)

        new_warning = _compute_warning_status_by_rule(row.deadline, now=now, rule=rule)
        new_close = row.close_status
        if row.deadline and now > row.deadline:
            if row.close_status != _CloseStatus.CLOSED:
                new_close = _CloseStatus.OVERDUE
        else:
            if row.close_status == _CloseStatus.OVERDUE:
                new_close = _CloseStatus.OPEN

        if new_warning == _WarnStatus.NORMAL:
            row.soon_notified_at = None
            if row.deadline and now <= row.deadline:
                row.overdue_notified_at = None
                row.escalated_at = None
        elif new_warning == _WarnStatus.SOON:
            row.overdue_notified_at = None
            row.escalated_at = None
        elif new_warning == _WarnStatus.OVERDUE:
            row.soon_notified_at = None

        if row.warning_status != new_warning:
            row.warning_status = new_warning
            warning_updated += 1
        if row.close_status != new_close:
            row.close_status = new_close
            close_updated += 1

        if new_warning == _WarnStatus.SOON and row.soon_notified_at is None:
            target_ids = [x for x in [row.assignee_id, row.created_by] if isinstance(x, int)]
            if target_ids:
                title = "工单即将逾期提醒"
                content = f"工单号 {row.work_order_no or row.id} 即将逾期，请尽快处理"
                for uid in dict.fromkeys(target_ids):
                    create_notification(db, user_id=uid, title=title, content=content, category="workorder", source=row.id)
                row.soon_notified_at = now
                notified_soon += 1

        if new_warning == _WarnStatus.OVERDUE and row.overdue_notified_at is None:
            target_ids = [x for x in [row.assignee_id, row.created_by] if isinstance(x, int)]
            if target_ids:
                title = "工单已逾期提醒"
                content = f"工单号 {row.work_order_no or row.id} 已逾期，请尽快处理"
                for uid in dict.fromkeys(target_ids):
                    create_notification(db, user_id=uid, title=title, content=content, category="workorder", source=row.id)
                row.overdue_notified_at = now
                notified_overdue += 1

        if new_warning == _WarnStatus.OVERDUE and row.escalated_at is None and row.deadline:
            overdue_days = compute_overdue_days(deadline=row.deadline, now=now, rule=rule)
            if overdue_days >= rule.escalation_workdays:
                manager_ids: list[int] = []
                if isinstance(row.department_id, int):
                    manager_ids = list_users_by_permission_in_department(
                        db, department_id=row.department_id, permission_code="workorder:verify"
                    )
                if not manager_ids:
                    manager_ids = [x for x in [row.created_by] if isinstance(x, int)]
                if manager_ids:
                    title = "工单逾期升级提醒"
                    content = f"工单号 {row.work_order_no or row.id} 已逾期 {overdue_days} 天，已自动升级处理"
                    for uid in dict.fromkeys(manager_ids):
                        create_notification(db, user_id=uid, title=title, content=content, category="workorder", source=row.id)
                    row.escalated_at = now
                    escalated += 1
                    db.add(
                        WorkOrderActionLog(
                            work_order_id=row.id,
                            action="WORKORDER_ESCALATE",
                            operator_id=actor.id if actor else None,
                            reason="逾期自动升级",
                            before=before,
                            after=_snapshot_for_scan(row),
                            payload={"overdueDays": overdue_days, "threshold": rule.escalation_workdays},
                        )
                    )
                    create_audit_log(
                        db,
                        entity_type="work_order",
                        entity_id=row.id,
                        action="WORKORDER_ESCALATE",
                        actor=actor,
                        before=before,
                        after={"overdueDays": overdue_days, "threshold": rule.escalation_workdays, "targets": manager_ids},
                        reason="逾期自动升级",
                        source=source,
                    )

        after = _snapshot_for_scan(row)
        if before != after:
            db.add(
                WorkOrderActionLog(
                    work_order_id=row.id,
                    action="WORKORDER_WARNING_SCAN",
                    operator_id=actor.id if actor else None,
                    before=before,
                    after=after,
                    payload={"source": source, "calendarEnabled": rule.calendar_enabled},
                )
            )
            create_audit_log(
                db,
                entity_type="work_order",
                entity_id=row.id,
                action="WORKORDER_WARNING_SCAN_UPDATE",
                actor=actor,
                before=before,
                after=after,
                source=source,
            )

    return {
        "scanned": len(rows),
        "warningStatusUpdated": warning_updated,
        "closeStatusUpdated": close_updated,
        "notifiedSoon": notified_soon,
        "notifiedOverdue": notified_overdue,
        "escalated": escalated,
        "calendarEnabled": bool(rule.calendar_enabled),
    }

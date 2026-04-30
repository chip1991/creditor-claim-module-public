from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, case, func, literal, or_, select
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.models.complaint_analysis import ComplaintAnalysis
from app.models.data_center import DataRecord, DataType
from app.models.rbac import Department, RoleDataScope, User
from app.models.work_order import WorkOrder
from app.services.data_center import to_datetime
from app.services.data_scope import resolve_allowed_dept_ids


@dataclass(frozen=True)
class DashboardFilters:
    start_time: datetime | None
    end_time: datetime | None
    dept_id: int | None
    category: str | None


def _default_time_range() -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=30)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    end = now
    return start, end


def normalize_filters(
    *,
    start_time: str | None = None,
    end_time: str | None = None,
    dept_id: int | None = None,
    category: str | None = None,
) -> DashboardFilters:
    start_dt = to_datetime(start_time) if start_time else None
    end_dt = to_datetime(end_time) if end_time else None
    if start_dt is None or end_dt is None:
        ds, de = _default_time_range()
        start_dt = start_dt or ds
        end_dt = end_dt or de
    if start_dt and end_dt and start_dt > end_dt:
        start_dt, end_dt = end_dt, start_dt
    return DashboardFilters(start_time=start_dt, end_time=end_dt, dept_id=dept_id, category=category.strip() if category else None)


def _dept_name_by_id(db: Session, dept_id: int) -> str | None:
    row = db.get(Department, dept_id)
    return row.name if row else None


def _resolve_allowed_dept_names(db: Session, actor: CurrentUser) -> set[str] | None:
    ids = resolve_allowed_dept_ids(db, actor.data_scope)
    if ids is None:
        return None
    if not ids:
        return set()
    rows = db.execute(select(Department.name).where(Department.id.in_(list(ids)))).scalars().all()
    return {r for r in rows if isinstance(r, str) and r.strip()}


def _date_key_expr(db: Session, col):
    name = getattr(getattr(db, "bind", None), "dialect", None)
    dialect_name = getattr(name, "name", "") if name else ""
    if dialect_name == "postgresql":
        return func.to_char(col, "YYYY-MM-DD")
    return func.strftime("%Y-%m-%d", col)


def _iter_dates(start: datetime, end: datetime) -> list[str]:
    sd = (start.date() if isinstance(start, datetime) else start) if start else date.today()
    ed = (end.date() if isinstance(end, datetime) else end) if end else date.today()
    if sd > ed:
        sd, ed = ed, sd
    out: list[str] = []
    cur = sd
    while cur <= ed:
        out.append(cur.strftime("%Y-%m-%d"))
        cur = cur + timedelta(days=1)
    return out


def _apply_dept_filter(
    stmt,
    *,
    dept_id: int | None,
    dept_name: str | None,
    workorder_dept_id_col=None,
    analysis_dept_name_col=None,
    creator_dept_id_col=None,
):
    if dept_id is None and not dept_name:
        return stmt
    clauses = []
    if dept_id is not None and workorder_dept_id_col is not None:
        clauses.append(workorder_dept_id_col == dept_id)
    if dept_name and analysis_dept_name_col is not None:
        clauses.append(analysis_dept_name_col == dept_name)
    if dept_id is not None and creator_dept_id_col is not None:
        clauses.append(creator_dept_id_col == dept_id)
    if not clauses:
        return stmt
    return stmt.where(or_(*clauses))


def _apply_scope(
    db: Session,
    stmt,
    actor: CurrentUser,
    *,
    user_id_col=None,
    creator_dept_id_col=None,
    analysis_dept_name_col=None,
    workorder_dept_id_col=None,
):
    if actor.data_scope.scope == RoleDataScope.SELF:
        if user_id_col is None:
            return stmt.where(literal(False))
        return stmt.where(user_id_col == actor.id)
    allowed_ids = resolve_allowed_dept_ids(db, actor.data_scope)
    allowed_names = _resolve_allowed_dept_names(db, actor)
    if allowed_ids is None:
        return stmt
    if not allowed_ids:
        return stmt.where(literal(False))
    clauses = []
    if creator_dept_id_col is not None:
        clauses.append(creator_dept_id_col.in_(list(allowed_ids)))
    if workorder_dept_id_col is not None:
        clauses.append(workorder_dept_id_col.in_(list(allowed_ids)))
    if analysis_dept_name_col is not None and allowed_names is not None:
        if allowed_names:
            clauses.append(analysis_dept_name_col.in_(list(allowed_names)))
        else:
            clauses.append(literal(False))
    if not clauses:
        return stmt.where(literal(False))
    return stmt.where(or_(*clauses))


def get_overview(db: Session, *, filters: DashboardFilters, actor: CurrentUser) -> dict:
    dept_name = _dept_name_by_id(db, filters.dept_id) if filters.dept_id else None

    complaint_stmt = (
        select(func.count())
        .select_from(DataRecord)
        .join(User, User.id == DataRecord.created_by, isouter=True)
        .join(ComplaintAnalysis, ComplaintAnalysis.complaint_record_id == DataRecord.id, isouter=True)
        .where(DataRecord.data_type == DataType.COMPLAINT.value)
    )
    if filters.start_time:
        complaint_stmt = complaint_stmt.where(DataRecord.event_time >= filters.start_time)
    if filters.end_time:
        complaint_stmt = complaint_stmt.where(DataRecord.event_time <= filters.end_time)
    if filters.category:
        complaint_stmt = complaint_stmt.where(ComplaintAnalysis.category_lv1 == filters.category)
    complaint_stmt = _apply_dept_filter(
        complaint_stmt,
        dept_id=filters.dept_id,
        dept_name=dept_name,
        analysis_dept_name_col=ComplaintAnalysis.responsible_dept,
        creator_dept_id_col=User.department_id,
    )
    complaint_stmt = _apply_scope(
        db,
        complaint_stmt,
        actor,
        user_id_col=DataRecord.created_by,
        creator_dept_id_col=User.department_id,
        analysis_dept_name_col=ComplaintAnalysis.responsible_dept,
    )
    total_complaints = int(db.execute(complaint_stmt).scalar_one() or 0)

    analysis_base = (
        select(func.count(), func.sum(case((ComplaintAnalysis.is_repeated.is_(True), 1), else_=0)))
        .select_from(ComplaintAnalysis)
        .join(DataRecord, ComplaintAnalysis.complaint_record_id == DataRecord.id)
        .where(ComplaintAnalysis.status != "待分析")
    )
    if filters.start_time:
        analysis_base = analysis_base.where(DataRecord.event_time >= filters.start_time)
    if filters.end_time:
        analysis_base = analysis_base.where(DataRecord.event_time <= filters.end_time)
    if filters.category:
        analysis_base = analysis_base.where(ComplaintAnalysis.category_lv1 == filters.category)
    analysis_base = _apply_dept_filter(
        analysis_base,
        dept_id=filters.dept_id,
        dept_name=dept_name,
        analysis_dept_name_col=ComplaintAnalysis.responsible_dept,
    )
    analysis_base = _apply_scope(db, analysis_base, actor, user_id_col=ComplaintAnalysis.created_by, analysis_dept_name_col=ComplaintAnalysis.responsible_dept)
    analyzed_total, repeated_total = db.execute(analysis_base).one()
    analyzed_total = int(analyzed_total or 0)
    repeated_total = int(repeated_total or 0)
    repeat_rate = (repeated_total / analyzed_total) if analyzed_total > 0 else None

    wo_stmt = select(func.count()).select_from(WorkOrder)
    if filters.start_time:
        wo_stmt = wo_stmt.where(WorkOrder.created_at >= filters.start_time)
    if filters.end_time:
        wo_stmt = wo_stmt.where(WorkOrder.created_at <= filters.end_time)
    wo_stmt = wo_stmt.where(or_(WorkOrder.warning_status == "已逾期", WorkOrder.close_status == "逾期未闭环"))
    wo_stmt = _apply_dept_filter(wo_stmt, dept_id=filters.dept_id, dept_name=dept_name, workorder_dept_id_col=WorkOrder.department_id)
    wo_stmt = _apply_scope(db, wo_stmt, actor, user_id_col=WorkOrder.created_by, workorder_dept_id_col=WorkOrder.department_id)
    overdue_workorders = int(db.execute(wo_stmt).scalar_one() or 0)

    sat_stmt = (
        select(func.avg(DataRecord.satisfaction_score))
        .select_from(DataRecord)
        .join(User, User.id == DataRecord.created_by, isouter=True)
        .where(DataRecord.data_type.in_([DataType.SATISFACTION_400.value, DataType.CALL_AUDIT.value]))
        .where(DataRecord.satisfaction_score.is_not(None))
    )
    if filters.start_time:
        sat_stmt = sat_stmt.where(DataRecord.event_time >= filters.start_time)
    if filters.end_time:
        sat_stmt = sat_stmt.where(DataRecord.event_time <= filters.end_time)
    sat_stmt = _apply_dept_filter(sat_stmt, dept_id=filters.dept_id, dept_name=dept_name, creator_dept_id_col=User.department_id)
    sat_stmt = _apply_scope(db, sat_stmt, actor, user_id_col=DataRecord.created_by, creator_dept_id_col=User.department_id)
    satisfaction_avg = db.execute(sat_stmt).scalar_one()
    satisfaction_avg_value = round(float(satisfaction_avg), 2) if satisfaction_avg is not None else None

    return {
        "range": {
            "startTime": filters.start_time.isoformat() if filters.start_time else None,
            "endTime": filters.end_time.isoformat() if filters.end_time else None,
            "deptId": filters.dept_id,
            "deptName": dept_name,
            "category": filters.category,
        },
        "totalComplaints": total_complaints,
        "repeatRate": repeat_rate,
        "overdueWorkOrders": overdue_workorders,
        "satisfactionAvg": satisfaction_avg_value,
    }


def get_category_distribution(db: Session, *, filters: DashboardFilters, actor: CurrentUser, limit: int = 20) -> dict:
    dept_name = _dept_name_by_id(db, filters.dept_id) if filters.dept_id else None
    stmt = (
        select(ComplaintAnalysis.category_lv1, func.count())
        .select_from(ComplaintAnalysis)
        .join(DataRecord, ComplaintAnalysis.complaint_record_id == DataRecord.id)
        .where(ComplaintAnalysis.status != "待分析", ComplaintAnalysis.category_lv1.is_not(None))
    )
    if filters.start_time:
        stmt = stmt.where(DataRecord.event_time >= filters.start_time)
    if filters.end_time:
        stmt = stmt.where(DataRecord.event_time <= filters.end_time)
    stmt = _apply_dept_filter(stmt, dept_id=filters.dept_id, dept_name=dept_name, analysis_dept_name_col=ComplaintAnalysis.responsible_dept)
    stmt = _apply_scope(db, stmt, actor, user_id_col=ComplaintAnalysis.created_by, analysis_dept_name_col=ComplaintAnalysis.responsible_dept)
    stmt = stmt.group_by(ComplaintAnalysis.category_lv1).order_by(func.count().desc()).limit(max(1, min(200, limit)))
    rows = db.execute(stmt).all()
    total = sum(int(c or 0) for _, c in rows) or 0
    items = []
    for name, cnt in rows:
        if not name:
            continue
        v = int(cnt or 0)
        items.append({"name": name, "count": v, "ratio": (v / total) if total else None})
    return {"range": {"startTime": filters.start_time.isoformat(), "endTime": filters.end_time.isoformat(), "deptId": filters.dept_id, "deptName": dept_name}, "total": total, "items": items}


def get_trend(db: Session, *, filters: DashboardFilters, actor: CurrentUser) -> dict:
    dept_name = _dept_name_by_id(db, filters.dept_id) if filters.dept_id else None

    complaint_stmt = (
        select(_date_key_expr(db, DataRecord.event_time).label("d"), func.count())
        .select_from(DataRecord)
        .join(User, User.id == DataRecord.created_by, isouter=True)
        .join(ComplaintAnalysis, ComplaintAnalysis.complaint_record_id == DataRecord.id, isouter=True)
        .where(DataRecord.data_type == DataType.COMPLAINT.value)
        .where(DataRecord.event_time.is_not(None))
    )
    if filters.start_time:
        complaint_stmt = complaint_stmt.where(DataRecord.event_time >= filters.start_time)
    if filters.end_time:
        complaint_stmt = complaint_stmt.where(DataRecord.event_time <= filters.end_time)
    if filters.category:
        complaint_stmt = complaint_stmt.where(ComplaintAnalysis.category_lv1 == filters.category)
    complaint_stmt = _apply_dept_filter(
        complaint_stmt,
        dept_id=filters.dept_id,
        dept_name=dept_name,
        analysis_dept_name_col=ComplaintAnalysis.responsible_dept,
        creator_dept_id_col=User.department_id,
    )
    complaint_stmt = _apply_scope(
        db,
        complaint_stmt,
        actor,
        user_id_col=DataRecord.created_by,
        creator_dept_id_col=User.department_id,
        analysis_dept_name_col=ComplaintAnalysis.responsible_dept,
    )
    complaint_stmt = complaint_stmt.group_by("d").order_by("d")
    complaint_map = {d: int(c or 0) for d, c in db.execute(complaint_stmt).all() if d}

    wo_stmt = select(_date_key_expr(db, WorkOrder.updated_at).label("d"), func.count()).select_from(WorkOrder).where(WorkOrder.close_status == "已闭环")
    if filters.start_time:
        wo_stmt = wo_stmt.where(WorkOrder.updated_at >= filters.start_time)
    if filters.end_time:
        wo_stmt = wo_stmt.where(WorkOrder.updated_at <= filters.end_time)
    wo_stmt = _apply_dept_filter(wo_stmt, dept_id=filters.dept_id, dept_name=dept_name, workorder_dept_id_col=WorkOrder.department_id)
    wo_stmt = _apply_scope(db, wo_stmt, actor, user_id_col=WorkOrder.created_by, workorder_dept_id_col=WorkOrder.department_id)
    wo_stmt = wo_stmt.group_by("d").order_by("d")
    closed_map = {d: int(c or 0) for d, c in db.execute(wo_stmt).all() if d}

    days = _iter_dates(filters.start_time, filters.end_time)
    points = []
    for d in days:
        points.append({"date": d, "complaintCount": complaint_map.get(d, 0), "closedWorkOrderCount": closed_map.get(d, 0)})
    return {"range": {"startTime": filters.start_time.isoformat(), "endTime": filters.end_time.isoformat(), "deptId": filters.dept_id, "deptName": dept_name, "category": filters.category}, "points": points}


def get_root_cause_top(db: Session, *, filters: DashboardFilters, actor: CurrentUser, level: str = "deep", limit: int = 10) -> dict:
    dept_name = _dept_name_by_id(db, filters.dept_id) if filters.dept_id else None
    if level == "surface":
        col = ComplaintAnalysis.root_cause_surface
    elif level == "direct":
        col = ComplaintAnalysis.root_cause_direct
    else:
        col = ComplaintAnalysis.root_cause_deep
    stmt = (
        select(col, func.count())
        .select_from(ComplaintAnalysis)
        .join(DataRecord, ComplaintAnalysis.complaint_record_id == DataRecord.id)
        .where(ComplaintAnalysis.status != "待分析", col.is_not(None))
    )
    if filters.start_time:
        stmt = stmt.where(DataRecord.event_time >= filters.start_time)
    if filters.end_time:
        stmt = stmt.where(DataRecord.event_time <= filters.end_time)
    if filters.category:
        stmt = stmt.where(ComplaintAnalysis.category_lv1 == filters.category)
    stmt = _apply_dept_filter(stmt, dept_id=filters.dept_id, dept_name=dept_name, analysis_dept_name_col=ComplaintAnalysis.responsible_dept)
    stmt = _apply_scope(db, stmt, actor, user_id_col=ComplaintAnalysis.created_by, analysis_dept_name_col=ComplaintAnalysis.responsible_dept)
    stmt = stmt.group_by(col).order_by(func.count().desc()).limit(max(1, min(200, limit)))
    rows = db.execute(stmt).all()
    items = []
    for name, cnt in rows:
        if not name:
            continue
        items.append({"name": name, "count": int(cnt or 0)})
    return {"range": {"startTime": filters.start_time.isoformat(), "endTime": filters.end_time.isoformat(), "deptId": filters.dept_id, "deptName": dept_name, "category": filters.category}, "level": level, "items": items}


def get_workorder_closure(db: Session, *, filters: DashboardFilters, actor: CurrentUser) -> dict:
    dept_name = _dept_name_by_id(db, filters.dept_id) if filters.dept_id else None
    stmt = select(WorkOrder.close_status, WorkOrder.warning_status, func.count()).select_from(WorkOrder)
    if filters.start_time:
        stmt = stmt.where(WorkOrder.created_at >= filters.start_time)
    if filters.end_time:
        stmt = stmt.where(WorkOrder.created_at <= filters.end_time)
    stmt = _apply_dept_filter(stmt, dept_id=filters.dept_id, dept_name=dept_name, workorder_dept_id_col=WorkOrder.department_id)
    stmt = _apply_scope(db, stmt, actor, user_id_col=WorkOrder.created_by, workorder_dept_id_col=WorkOrder.department_id)
    stmt = stmt.group_by(WorkOrder.close_status, WorkOrder.warning_status)
    rows = db.execute(stmt).all()
    total = 0
    closed = 0
    overdue = 0
    soon = 0
    buckets = {}
    for close_status, warning_status, cnt in rows:
        v = int(cnt or 0)
        total += v
        key = f"{close_status or '-'}|{warning_status or '-'}"
        buckets[key] = v
        if close_status == "已闭环":
            closed += v
        if warning_status == "已逾期" or close_status == "逾期未闭环":
            overdue += v
        if warning_status == "即将逾期":
            soon += v
    close_rate = (closed / total) if total else None
    return {
        "range": {"startTime": filters.start_time.isoformat(), "endTime": filters.end_time.isoformat(), "deptId": filters.dept_id, "deptName": dept_name},
        "total": total,
        "closed": closed,
        "overdue": overdue,
        "soonOverdue": soon,
        "closeRate": close_rate,
        "buckets": [{"key": k, "count": v} for k, v in sorted(buckets.items(), key=lambda x: x[1], reverse=True)],
    }


def drilldown_data_records(
    db: Session,
    *,
    filters: DashboardFilters,
    actor: CurrentUser,
    page: int,
    size: int,
) -> tuple[list[dict], int]:
    dept_name = _dept_name_by_id(db, filters.dept_id) if filters.dept_id else None
    base = (
        select(DataRecord, ComplaintAnalysis, WorkOrder, User)
        .select_from(DataRecord)
        .join(User, User.id == DataRecord.created_by, isouter=True)
        .join(ComplaintAnalysis, ComplaintAnalysis.complaint_record_id == DataRecord.id, isouter=True)
        .join(WorkOrder, WorkOrder.analysis_id == ComplaintAnalysis.id, isouter=True)
    )
    if filters.start_time:
        base = base.where(DataRecord.event_time >= filters.start_time)
    if filters.end_time:
        base = base.where(DataRecord.event_time <= filters.end_time)
    if filters.category:
        base = base.where(ComplaintAnalysis.category_lv1 == filters.category)
    base = _apply_dept_filter(
        base,
        dept_id=filters.dept_id,
        dept_name=dept_name,
        workorder_dept_id_col=WorkOrder.department_id,
        analysis_dept_name_col=ComplaintAnalysis.responsible_dept,
        creator_dept_id_col=User.department_id,
    )
    base = _apply_scope(
        db,
        base,
        actor,
        user_id_col=DataRecord.created_by,
        creator_dept_id_col=User.department_id,
        analysis_dept_name_col=ComplaintAnalysis.responsible_dept,
        workorder_dept_id_col=WorkOrder.department_id,
    )

    total = int(db.execute(select(func.count()).select_from(base.subquery())).scalar_one() or 0)
    rows = db.execute(
        base.order_by(DataRecord.event_time.desc().nullslast(), DataRecord.created_at.desc())
        .offset((max(1, page) - 1) * max(1, min(200, size)))
        .limit(max(1, min(200, size)))
    ).all()

    records = []
    for r, a, w, u in rows:
        owner_info = " / ".join([x for x in [r.owner_name, r.building_room, r.phone] if x]) if r else None
        records.append(
            {
                "id": r.id,
                "dataType": r.data_type,
                "status": r.status,
                "workOrderNo": r.work_order_no,
                "eventTime": r.event_time.isoformat() if isinstance(r.event_time, datetime) else None,
                "ownerInfo": owner_info or None,
                "categoryLv1": getattr(a, "category_lv1", None) if a else None,
                "department": (getattr(w, "department_name", None) if w else None) or (getattr(a, "responsible_dept", None) if a else None),
                "analysisId": getattr(a, "id", None) if a else None,
                "workOrderId": getattr(w, "id", None) if w else None,
                "operator": getattr(u, "username", None) if u else None,
            }
        )
    return records, total


def drilldown_analyses(
    db: Session,
    *,
    filters: DashboardFilters,
    actor: CurrentUser,
    page: int,
    size: int,
) -> tuple[list[dict], int]:
    dept_name = _dept_name_by_id(db, filters.dept_id) if filters.dept_id else None
    stmt = (
        select(ComplaintAnalysis, DataRecord)
        .select_from(ComplaintAnalysis)
        .join(DataRecord, ComplaintAnalysis.complaint_record_id == DataRecord.id)
        .where(ComplaintAnalysis.status != "待分析")
    )
    if filters.start_time:
        stmt = stmt.where(DataRecord.event_time >= filters.start_time)
    if filters.end_time:
        stmt = stmt.where(DataRecord.event_time <= filters.end_time)
    if filters.category:
        stmt = stmt.where(ComplaintAnalysis.category_lv1 == filters.category)
    stmt = _apply_dept_filter(stmt, dept_id=filters.dept_id, dept_name=dept_name, analysis_dept_name_col=ComplaintAnalysis.responsible_dept)
    stmt = _apply_scope(db, stmt, actor, user_id_col=ComplaintAnalysis.created_by, analysis_dept_name_col=ComplaintAnalysis.responsible_dept)

    total = int(db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one() or 0)
    rows = db.execute(
        stmt.order_by(DataRecord.event_time.desc().nullslast(), ComplaintAnalysis.updated_at.desc())
        .offset((max(1, page) - 1) * max(1, min(200, size)))
        .limit(max(1, min(200, size)))
    ).all()
    records = []
    for a, d in rows:
        owner_info = " / ".join([x for x in [d.owner_name, d.building_room, d.phone] if x]) if d else None
        summary_src = (d.cleaned_text or d.raw_text or "").strip() if d else ""
        records.append(
            {
                "id": a.id,
                "workOrderNo": a.work_order_no,
                "ownerInfo": owner_info or None,
                "complaintTime": d.event_time.isoformat() if isinstance(d.event_time, datetime) else None,
                "complaintSummary": summary_src[:60] if summary_src else None,
                "categoryLv1": a.category_lv1,
                "categoryLv2": a.category_lv2,
                "rootCauseDeep": a.root_cause_deep,
                "department": a.responsible_dept,
                "riskLevel": a.risk_level,
                "status": a.status,
            }
        )
    return records, total


def drilldown_workorders(
    db: Session,
    *,
    filters: DashboardFilters,
    actor: CurrentUser,
    page: int,
    size: int,
) -> tuple[list[dict], int]:
    dept_name = _dept_name_by_id(db, filters.dept_id) if filters.dept_id else None
    stmt = (
        select(WorkOrder, ComplaintAnalysis)
        .select_from(WorkOrder)
        .join(ComplaintAnalysis, WorkOrder.analysis_id == ComplaintAnalysis.id, isouter=True)
    )
    if filters.start_time:
        stmt = stmt.where(WorkOrder.created_at >= filters.start_time)
    if filters.end_time:
        stmt = stmt.where(WorkOrder.created_at <= filters.end_time)
    if filters.category:
        stmt = stmt.where(ComplaintAnalysis.category_lv1 == filters.category)
    stmt = _apply_dept_filter(stmt, dept_id=filters.dept_id, dept_name=dept_name, workorder_dept_id_col=WorkOrder.department_id, analysis_dept_name_col=ComplaintAnalysis.responsible_dept)
    stmt = _apply_scope(db, stmt, actor, user_id_col=WorkOrder.created_by, workorder_dept_id_col=WorkOrder.department_id, analysis_dept_name_col=ComplaintAnalysis.responsible_dept)

    total = int(db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one() or 0)
    rows = db.execute(
        stmt.order_by(WorkOrder.created_at.desc())
        .offset((max(1, page) - 1) * max(1, min(200, size)))
        .limit(max(1, min(200, size)))
    ).all()

    records = []
    for w, a in rows:
        records.append(
            {
                "id": w.id,
                "workOrderNo": w.work_order_no,
                "department": w.department_name or (getattr(a, "responsible_dept", None) if a else None),
                "rectificationStatus": w.rectification_status,
                "verifyStatus": w.verify_status,
                "closeStatus": w.close_status,
                "warningStatus": w.warning_status,
                "satisfactionCheckStatus": w.satisfaction_check_status,
                "deadline": w.deadline.isoformat() if isinstance(w.deadline, datetime) else None,
                "createdAt": w.created_at.isoformat() if isinstance(w.created_at, datetime) else None,
                "categoryLv1": getattr(a, "category_lv1", None) if a else None,
                "analysisId": getattr(a, "id", None) if a else None,
            }
        )
    return records, total

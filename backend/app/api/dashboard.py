from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permissions
from app.core.response import ApiResponse
from app.db.session import get_db
from app.services.metrics_dashboard import (
    drilldown_analyses,
    drilldown_data_records,
    drilldown_workorders,
    get_category_distribution,
    get_overview,
    get_root_cause_top,
    get_trend,
    get_workorder_closure,
    normalize_filters,
)


router = APIRouter()


def _dashboard_user(
    current_user: CurrentUser = Depends(require_permissions("dashboard:read", "analysis:read", "workorder:read", "data:read", mode="any")),
) -> CurrentUser:
    return current_user


@router.get("/dashboard/overview", response_model=ApiResponse)
def dashboard_overview(
    startTime: str | None = None,
    endTime: str | None = None,
    deptId: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_dashboard_user),
) -> ApiResponse:
    filters = normalize_filters(start_time=startTime, end_time=endTime, dept_id=deptId, category=category)
    data = get_overview(db, filters=filters, actor=current_user)
    return ApiResponse(data=data)


@router.get("/dashboard/category-distribution", response_model=ApiResponse)
def dashboard_category_distribution(
    startTime: str | None = None,
    endTime: str | None = None,
    deptId: int | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_dashboard_user),
) -> ApiResponse:
    filters = normalize_filters(start_time=startTime, end_time=endTime, dept_id=deptId)
    data = get_category_distribution(db, filters=filters, actor=current_user, limit=limit)
    return ApiResponse(data=data)


@router.get("/dashboard/trend", response_model=ApiResponse)
def dashboard_trend(
    startTime: str | None = None,
    endTime: str | None = None,
    deptId: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_dashboard_user),
) -> ApiResponse:
    filters = normalize_filters(start_time=startTime, end_time=endTime, dept_id=deptId, category=category)
    data = get_trend(db, filters=filters, actor=current_user)
    return ApiResponse(data=data)


@router.get("/dashboard/root-cause-top", response_model=ApiResponse)
def dashboard_root_cause_top(
    startTime: str | None = None,
    endTime: str | None = None,
    deptId: int | None = None,
    category: str | None = None,
    level: str = "deep",
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_dashboard_user),
) -> ApiResponse:
    filters = normalize_filters(start_time=startTime, end_time=endTime, dept_id=deptId, category=category)
    data = get_root_cause_top(db, filters=filters, actor=current_user, level=level, limit=limit)
    return ApiResponse(data=data)


@router.get("/dashboard/workorder-closure", response_model=ApiResponse)
def dashboard_workorder_closure(
    startTime: str | None = None,
    endTime: str | None = None,
    deptId: int | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_dashboard_user),
) -> ApiResponse:
    filters = normalize_filters(start_time=startTime, end_time=endTime, dept_id=deptId)
    data = get_workorder_closure(db, filters=filters, actor=current_user)
    return ApiResponse(data=data)


@router.get("/dashboard/drilldown/data-record", response_model=ApiResponse)
def dashboard_drilldown_data_record(
    page: int = 1,
    size: int = 20,
    startTime: str | None = None,
    endTime: str | None = None,
    deptId: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_dashboard_user),
) -> ApiResponse:
    filters = normalize_filters(start_time=startTime, end_time=endTime, dept_id=deptId, category=category)
    records, total = drilldown_data_records(db, filters=filters, actor=current_user, page=page, size=size)
    return ApiResponse(data={"total": total, "records": records})


@router.get("/dashboard/drilldown/analysis", response_model=ApiResponse)
def dashboard_drilldown_analysis(
    page: int = 1,
    size: int = 20,
    startTime: str | None = None,
    endTime: str | None = None,
    deptId: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_dashboard_user),
) -> ApiResponse:
    filters = normalize_filters(start_time=startTime, end_time=endTime, dept_id=deptId, category=category)
    records, total = drilldown_analyses(db, filters=filters, actor=current_user, page=page, size=size)
    return ApiResponse(data={"total": total, "records": records})


@router.get("/dashboard/drilldown/workorder", response_model=ApiResponse)
def dashboard_drilldown_workorder(
    page: int = 1,
    size: int = 20,
    startTime: str | None = None,
    endTime: str | None = None,
    deptId: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_dashboard_user),
) -> ApiResponse:
    filters = normalize_filters(start_time=startTime, end_time=endTime, dept_id=deptId, category=category)
    records, total = drilldown_workorders(db, filters=filters, actor=current_user, page=page, size=size)
    return ApiResponse(data={"total": total, "records": records})

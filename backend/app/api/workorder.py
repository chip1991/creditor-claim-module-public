from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permissions
from app.core.response import ApiResponse
from app.db.session import get_db
from app.schemas.workorder import (
    WorkOrderCreateRequest,
    WorkOrderForceCloseRequest,
    WorkOrderSubmitRequest,
    WorkOrderUrgeRequest,
    WorkOrderVerifyRequest,
)
from app.services.data_center import to_datetime
from app.services.audit import create_audit_log
from app.services.workorder_warning import scan_workorder_warning
from app.services.workorder import (
    WorkOrderCloseStatus,
    WorkOrderRectificationStatus,
    SatisfactionCheckStatus,
    create_work_order,
    get_work_order,
    list_action_logs,
    list_satisfaction_records,
    query_work_order_page,
    submit_work_order,
    urge_work_order,
    verify_work_order,
    force_close_work_order,
)


router = APIRouter()


def _format_time(v: object | None) -> str | None:
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d %H:%M:%S")
    return None


def _owner_info(row) -> str | None:
    record = None
    if getattr(row, "analysis", None) is not None:
        record = getattr(row.analysis, "complaint_record", None)
    if record is None:
        return None
    parts = [x for x in [getattr(record, "owner_name", None), getattr(record, "building_room", None), getattr(record, "phone", None)] if x]
    return " / ".join(parts) if parts else None


def _display_status(row) -> str:
    if row.close_status == WorkOrderCloseStatus.CLOSED or row.rectification_status == WorkOrderRectificationStatus.CLOSED:
        return "已完成"
    if row.satisfaction_check_status == SatisfactionCheckStatus.FAILED and row.rectification_status == WorkOrderRectificationStatus.IN_PROGRESS:
        return "已退回"
    if getattr(row, "verify_status", None) == "核验不通过":
        return "已退回"
    return row.rectification_status


@router.post("/workorder/create", response_model=ApiResponse)
def workorder_create(
    payload: WorkOrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("workorder:create")),
) -> ApiResponse:
    row = create_work_order(db, analysis_id=payload.analysisId, work_order_no=payload.workOrderNo, actor=current_user)
    db.commit()
    return ApiResponse(data={"id": row.id})


@router.get("/workorder/page", response_model=ApiResponse)
def workorder_page(
    page: int = 1,
    size: int = 20,
    workOrderNo: str | None = None,
    status: str | None = None,
    department: str | None = None,
    assignee: str | None = None,
    startTime: str | None = None,
    endTime: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("workorder:read")),
) -> ApiResponse:
    start_dt = to_datetime(startTime) if startTime else None
    end_dt = to_datetime(endTime) if endTime else None
    rows, total = query_work_order_page(
        db,
        page=max(1, page),
        size=max(1, min(200, size)),
        work_order_no=workOrderNo,
        status=status,
        department=department,
        assignee=assignee,
        start_time=start_dt,
        end_time=end_dt,
        actor=current_user,
    )

    records = []
    for r in rows:
        records.append(
            {
                "id": r.id,
                "workOrderNo": r.work_order_no,
                "ownerInfo": _owner_info(r),
                "department": r.department_name,
                "assignee": r.assignee.username if getattr(r, "assignee", None) else None,
                "status": _display_status(r),
                "deadline": _format_time(r.deadline),
                "createTime": _format_time(r.created_at),
            }
        )
    return ApiResponse(data={"total": total, "records": records})


@router.get("/workorder/detail", response_model=ApiResponse)
def workorder_detail(
    id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("workorder:read")),
) -> ApiResponse:
    row = get_work_order(db, work_order_id=id, actor=current_user)
    action_logs = list_action_logs(db, work_order_id=id)
    satisfaction_records = list_satisfaction_records(db, work_order_id=id)
    data = {
        "id": row.id,
        "workOrderNo": row.work_order_no,
        "ownerInfo": _owner_info(row),
        "department": row.department_name,
        "assignee": row.assignee.username if getattr(row, "assignee", None) else None,
        "status": _display_status(row),
        "rectificationStatus": row.rectification_status,
        "verifyStatus": row.verify_status,
        "closeStatus": row.close_status,
        "warningStatus": row.warning_status,
        "satisfactionCheckStatus": row.satisfaction_check_status,
        "deadline": row.deadline,
        "requirement": row.requirement,
        "result": row.result,
        "forcedClose": bool(row.forced_close),
        "forcedReason": row.forced_reason,
        "urgeCount": int(row.urge_count or 0),
        "lastUrgedAt": row.last_urged_at,
        "createdAt": row.created_at,
        "updatedAt": row.updated_at,
        "actionLogs": [
            {
                "id": l.id,
                "action": l.action,
                "operator": l.operator.username if getattr(l, "operator", None) else None,
                "reason": l.reason,
                "message": l.message,
                "before": l.before,
                "after": l.after,
                "payload": l.payload,
                "createdAt": l.created_at,
            }
            for l in action_logs
        ],
        "satisfactionRecords": [
            {
                "id": sr.id,
                "sourceDataRecordId": sr.source_data_record_id,
                "score": sr.score,
                "result": sr.result,
                "checkStatus": sr.check_status,
                "thresholdMapping": sr.threshold_mapping,
                "ruleHits": sr.rule_hits,
                "checkedAt": sr.checked_at,
                "createdAt": sr.created_at,
            }
            for sr in satisfaction_records
        ],
    }
    return ApiResponse(data=data)


@router.post("/workorder/submit", response_model=ApiResponse)
def workorder_submit(
    payload: WorkOrderSubmitRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("workorder:submit")),
) -> ApiResponse:
    row = submit_work_order(db, work_order_id=payload.id, result=payload.result, actor=current_user)
    db.commit()
    return ApiResponse(data={"id": row.id})


@router.post("/workorder/verify", response_model=ApiResponse)
def workorder_verify(
    payload: WorkOrderVerifyRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("workorder:verify")),
) -> ApiResponse:
    row = verify_work_order(db, work_order_id=payload.id, passed=payload.passed, reason=payload.reason, actor=current_user)
    db.commit()
    return ApiResponse(data={"id": row.id})


@router.post("/workorder/urge", response_model=ApiResponse)
def workorder_urge(
    payload: WorkOrderUrgeRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("workorder:urge")),
) -> ApiResponse:
    row = urge_work_order(db, work_order_id=payload.id, message=payload.message, actor=current_user)
    db.commit()
    return ApiResponse(data={"id": row.id})


@router.post("/workorder/force-close", response_model=ApiResponse)
def workorder_force_close(
    payload: WorkOrderForceCloseRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("workorder:force_close")),
) -> ApiResponse:
    row = force_close_work_order(db, work_order_id=payload.id, reason=payload.reason, actor=current_user)
    db.commit()
    return ApiResponse(data={"id": row.id})


@router.post("/workorder/warning/scan", response_model=ApiResponse)
def workorder_warning_scan(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("system:scheduler")),
) -> ApiResponse:
    result = scan_workorder_warning(db, actor=current_user, source="api")
    create_audit_log(
        db,
        entity_type="system_scheduler",
        entity_id="workorder_warning_scan",
        action="SYSTEM_SCHEDULER_TRIGGER",
        actor=current_user,
        after=result,
        reason="手动触发工单预警扫描",
        source="api",
    )
    db.commit()
    return ApiResponse(data=result)

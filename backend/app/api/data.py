from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_admin_or_permissions, require_permissions
from app.core.errors import AppError
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.data_center import DataCleanLog, DataLinkLog, DataRecord
from app.models.task import TaskStatus
from app.schemas.data_center import DataCleanRequest, DataLinkRequest, DataTaskResponse
from app.services.audit import create_audit_log
from app.services.data_center import (
    ImportConflictStrategy,
    create_import_task_row,
    manual_fix_and_retry_link,
    new_id,
    query_data_page,
    rebuild_call_audit_raw_text_from_general_problem,
    run_clean_task,
    run_import_task,
    run_link_task,
    save_upload_bytes,
    to_datetime,
)
from app.tasks.progress import update_task_progress


router = APIRouter()


@router.post("/data/import", response_model=ApiResponse)
async def data_import(
    background: BackgroundTasks,
    file: UploadFile | None = File(default=None),
    conflictStrategy: str = Form(default=ImportConflictStrategy.REJECT),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("data:import")),
) -> ApiResponse:
    if file is None:
        raise AppError(code="FILE_REQUIRED", msg="请上传Excel文件", status_code=400)
    content = await file.read()
    if not content:
        raise AppError(code="FILE_EMPTY", msg="上传文件为空", status_code=400)

    task_id = new_id()
    path = save_upload_bytes(file.filename or "upload.xlsx", content)
    create_import_task_row(
        db,
        task_id=task_id,
        filename=file.filename or "upload.xlsx",
        file_path=path,
        conflict_strategy=conflictStrategy if conflictStrategy in {ImportConflictStrategy.REJECT, ImportConflictStrategy.OVERWRITE} else ImportConflictStrategy.REJECT,
        actor=current_user,
    )
    create_audit_log(
        db,
        entity_type="data_import_task",
        entity_id=task_id,
        action="DATA_IMPORT_START",
        actor=current_user,
        after={"filename": file.filename, "conflictStrategy": conflictStrategy},
    )
    db.commit()

    update_task_progress(None, task_id=task_id, status=TaskStatus.PENDING, progress=0, message="任务已创建，等待执行")
    background.add_task(run_import_task, task_id=task_id, actor_id=current_user.id)
    return ApiResponse(data=DataTaskResponse(taskId=task_id).model_dump())


@router.get("/data/page", response_model=ApiResponse)
def data_page(
    page: int = 1,
    size: int = 20,
    dataType: str | None = None,
    status: str | None = None,
    workOrderNo: str | None = None,
    buildingRoom: str | None = None,
    ownerKeyword: str | None = None,
    startTime: str | None = None,
    endTime: str | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_permissions("data:read")),
) -> ApiResponse:
    start_dt = to_datetime(startTime) if startTime else None
    end_dt = to_datetime(endTime) if endTime else None
    rows, total = query_data_page(
        db,
        page=max(1, page),
        size=max(1, min(200, size)),
        data_type=dataType,
        status=status,
        work_order_no=workOrderNo,
        building_room=buildingRoom,
        owner_keyword=ownerKeyword,
        start_time=start_dt,
        end_time=end_dt,
    )

    def to_item(r: DataRecord) -> dict:
        owner_info = " / ".join([x for x in [r.owner_name, r.building_room, r.phone] if x])
        call_info_parts = []
        if r.event_time:
            call_info_parts.append(r.event_time.strftime("%Y-%m-%d %H:%M:%S"))
        if r.agent_name:
            call_info_parts.append(r.agent_name)
        call_info = " / ".join(call_info_parts) if call_info_parts else None
        return {
            "id": r.id,
            "dataType": r.data_type,
            "status": r.status,
            "workOrderNo": r.work_order_no,
            "ownerInfo": owner_info or None,
            "callInfo": call_info,
            "rawContent": r.raw_text,
            "uploadTime": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if isinstance(r.created_at, datetime) else None,
            "operator": r.creator.username if getattr(r, "creator", None) else None,
        }

    return ApiResponse(data={"total": total, "records": [to_item(r) for r in rows]})


@router.get("/data/detail", response_model=ApiResponse)
def data_detail(
    id: str,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_permissions("data:read")),
) -> ApiResponse:
    row = db.get(DataRecord, id)
    if row is None:
        raise AppError(code="NOT_FOUND", msg="数据不存在", status_code=404)

    clean_logs = (
        db.execute(select(DataCleanLog).where(DataCleanLog.record_id == id).order_by(DataCleanLog.created_at.desc()))
        .scalars()
        .all()
    )
    link_logs = (
        db.execute(
            select(DataLinkLog)
            .where(or_(DataLinkLog.complaint_record_id == id, DataLinkLog.satisfaction_record_id == id))
            .order_by(DataLinkLog.created_at.desc())
        )
        .scalars()
        .all()
    )

    def to_log_dict(l) -> dict:
        return {
            "id": l.id,
            "taskId": getattr(l, "task_id", None),
            "message": getattr(l, "message", None),
            "status": getattr(l, "status", None),
            "strategy": getattr(l, "strategy", None),
            "createdAt": getattr(l, "created_at", None),
        }

    data = {
        "id": row.id,
        "dataType": row.data_type,
        "status": row.status,
        "workOrderNo": row.work_order_no,
        "eventTime": row.event_time,
        "durationSec": row.duration_sec,
        "agentName": row.agent_name,
        "ownerName": row.owner_name,
        "buildingRoom": row.building_room,
        "phone": row.phone,
        "satisfactionScore": row.satisfaction_score,
        "rawText": row.raw_text,
        "cleanedText": row.cleaned_text,
        "rawPayload": row.raw_payload,
        "cleanedPayload": row.cleaned_payload,
        "linkedRecordId": row.linked_record_id,
        "createdAt": row.created_at,
        "updatedAt": row.updated_at,
        "cleanLogs": [to_log_dict(l) for l in clean_logs],
        "linkLogs": [to_log_dict(l) for l in link_logs],
    }
    return ApiResponse(data=data)


@router.post("/data/call-audit/rebuild-raw-text", response_model=ApiResponse)
def rebuild_call_audit_raw_text(
    onlyEmpty: bool = False,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("system:rules")),
) -> ApiResponse:
    result = rebuild_call_audit_raw_text_from_general_problem(db, only_empty=bool(onlyEmpty))
    create_audit_log(
        db,
        entity_type="data_record",
        entity_id="CALL_AUDIT",
        action="DATA_CALL_AUDIT_RAW_TEXT_REBUILD",
        actor=current_user,
        after={"onlyEmpty": bool(onlyEmpty), **result},
        source="api:/data/call-audit/rebuild-raw-text",
    )
    db.commit()
    return ApiResponse(data=result)


@router.post("/data/clean", response_model=ApiResponse)
def data_clean(
    background_tasks: BackgroundTasks,
    payload: DataCleanRequest | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("data:clean")),
) -> ApiResponse:
    task_id = new_id()
    create_audit_log(
        db,
        entity_type="task",
        entity_id=task_id,
        action="DATA_CLEAN_START",
        actor=current_user,
        after={"ids": payload.ids if payload else None},
    )
    db.commit()
    update_task_progress(None, task_id=task_id, status=TaskStatus.PENDING, progress=0, message="任务已创建，等待执行")
    if background_tasks is None:
        raise AppError(code="INTERNAL_ERROR", msg="任务调度失败", status_code=500)
    background_tasks.add_task(run_clean_task, task_id=task_id, record_ids=payload.ids if payload else None, actor_id=current_user.id)
    return ApiResponse(data=DataTaskResponse(taskId=task_id).model_dump())


@router.post("/data/link", response_model=ApiResponse)
def data_link(
    background_tasks: BackgroundTasks,
    payload: DataLinkRequest | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("data:link")),
) -> ApiResponse:
    task_id = new_id()
    create_audit_log(
        db,
        entity_type="task",
        entity_id=task_id,
        action="DATA_LINK_START",
        actor=current_user,
        after={"ids": payload.ids if payload else None, "manualFix": payload.manualFix.model_dump() if payload and payload.manualFix else None},
    )
    if payload and payload.manualFix:
        manual_fix_and_retry_link(db, record_id=payload.manualFix.recordId, work_order_no=payload.manualFix.workOrderNo, task_id=task_id, actor=current_user)
    db.commit()

    update_task_progress(None, task_id=task_id, status=TaskStatus.PENDING, progress=0, message="任务已创建，等待执行")
    if background_tasks is None:
        raise AppError(code="INTERNAL_ERROR", msg="任务调度失败", status_code=500)
    background_tasks.add_task(run_link_task, task_id=task_id, record_ids=payload.ids if payload else None, actor_id=current_user.id)
    return ApiResponse(data=DataTaskResponse(taskId=task_id).model_dump())


@router.get("/data/export")
def data_export(
    dataType: str | None = None,
    status: str | None = None,
    workOrderNo: str | None = None,
    buildingRoom: str | None = None,
    ownerKeyword: str | None = None,
    startTime: str | None = None,
    endTime: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("data:export")),
) -> FileResponse:
    start_dt = to_datetime(startTime) if startTime else None
    end_dt = to_datetime(endTime) if endTime else None
    rows, _ = query_data_page(
        db,
        page=1,
        size=1000000,
        data_type=dataType,
        status=status,
        work_order_no=workOrderNo,
        building_room=buildingRoom,
        owner_keyword=ownerKeyword,
        start_time=start_dt,
        end_time=end_dt,
    )
    file_path = export_to_excel(db, rows=rows)
    create_audit_log(
        db,
        entity_type="file",
        entity_id=file_path,
        action="DATA_EXPORT",
        actor=current_user,
        after={"count": len(rows), "filters": {"dataType": dataType, "status": status, "workOrderNo": workOrderNo}},
    )
    db.commit()
    return FileResponse(path=file_path, filename="数据导出.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

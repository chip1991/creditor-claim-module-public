from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permissions
from app.core.errors import AppError
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.raw_data import RawDataBatch, RawDataRow, RawIssue
from app.models.task import TaskStatus
from app.schemas.raw_data import (
    RawBatchDetailResponse,
    RawBatchItem,
    RawBatchPageResponse,
    RawImportResponse,
    RawIssueItem,
    RawIssuePageResponse,
    RawRowDetailResponse,
    RawRowItem,
    RawRowPageResponse,
    RawScoreSummaryResponse,
)
from app.services.audit import create_audit_log
from app.services.data_center import to_datetime
from app.services.raw_data import (
    create_raw_batch_row,
    get_score_mapping,
    new_id,
    query_raw_batch_page,
    query_raw_issue_page,
    query_raw_row_page,
    query_raw_score_summary,
    run_raw_import_task,
    safe_delete_upload_file,
    save_upload_bytes,
    set_score_mapping,
)


router = APIRouter()


@router.post("/raw/batches/import", response_model=ApiResponse)
async def raw_import(
    background: BackgroundTasks,
    file: UploadFile | None = File(default=None),
    sheetName: str = Form(default="考核项目"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("data:import")),
) -> ApiResponse:
    if file is None:
        raise AppError(code="FILE_REQUIRED", msg="请上传Excel文件", status_code=400)
    content = await file.read()
    if not content:
        raise AppError(code="FILE_EMPTY", msg="上传文件为空", status_code=400)

    task_id = new_id()
    batch_id = new_id()
    path, file_hash = save_upload_bytes(file.filename or "upload.xlsx", content)
    create_raw_batch_row(
        db,
        batch_id=batch_id,
        filename=file.filename or "upload.xlsx",
        file_path=path,
        file_hash=file_hash,
        sheet_name=sheetName or "考核项目",
        actor=current_user,
    )
    create_audit_log(
        db,
        entity_type="raw_data_batch",
        entity_id=batch_id,
        action="RAW_IMPORT_START",
        actor=current_user,
        after={"filename": file.filename, "sheetName": sheetName},
    )
    db.commit()

    background.add_task(run_raw_import_task, task_id=task_id, batch_id=batch_id, actor_id=current_user.id)
    return ApiResponse(data=RawImportResponse(taskId=task_id, batchId=batch_id).model_dump())


@router.get("/raw/batches/page", response_model=ApiResponse)
def raw_batch_page(
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    status: str | None = None,
    startTime: str | None = None,
    endTime: str | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_permissions("data:read")),
) -> ApiResponse:
    start_dt = to_datetime(startTime) if startTime else None
    end_dt = to_datetime(endTime) if endTime else None
    rows, total = query_raw_batch_page(
        db,
        page=max(1, page),
        size=max(1, min(200, size)),
        keyword=keyword,
        status=status,
        start_time=start_dt,
        end_time=end_dt,
    )
    records = [
        RawBatchItem(
            id=r.id,
            filename=r.filename,
            sheetName=r.sheet_name,
            status=r.status,
            totalRows=int(r.total_rows or 0),
            successRows=int(r.success_rows or 0),
            failedRows=int(r.failed_rows or 0),
            createdAt=r.created_at,
            updatedAt=r.updated_at,
            operator=r.creator.username if getattr(r, "creator", None) else None,
        )
        for r in rows
    ]
    return ApiResponse(data=RawBatchPageResponse(total=total, records=records).model_dump())


@router.get("/raw/batches/{batch_id}", response_model=ApiResponse)
def raw_batch_detail(
    batch_id: str,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_permissions("data:read")),
) -> ApiResponse:
    row = db.get(RawDataBatch, batch_id)
    if row is None:
        raise AppError(code="NOT_FOUND", msg="批次不存在", status_code=404)
    payload = RawBatchDetailResponse(
        id=row.id,
        filename=row.filename,
        sheetName=row.sheet_name,
        status=row.status,
        totalRows=int(row.total_rows or 0),
        successRows=int(row.success_rows or 0),
        failedRows=int(row.failed_rows or 0),
        createdAt=row.created_at,
        updatedAt=row.updated_at,
        operator=row.creator.username if getattr(row, "creator", None) else None,
    )
    return ApiResponse(data=payload.model_dump())


@router.delete("/raw/batches/{batch_id}", response_model=ApiResponse)
def raw_batch_delete(
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("data:delete")),
) -> ApiResponse:
    row = db.get(RawDataBatch, batch_id)
    if row is None:
        raise AppError(code="NOT_FOUND", msg="批次不存在", status_code=404)
    if row.status == TaskStatus.RUNNING.value:
        create_audit_log(
            db,
            entity_type="raw_data_batch",
            entity_id=batch_id,
            action="RAW_BATCH_DELETE_DENY",
            actor=current_user,
            after={"filename": row.filename, "status": row.status},
            reason="RUNNING",
            source="api:/raw/batches/{batch_id}",
        )
        db.commit()
        raise AppError(code="RAW_BATCH_RUNNING", msg="导入中不可删除", status_code=409)

    before = {"filename": row.filename, "status": row.status, "totalRows": int(row.total_rows or 0)}
    file_path = row.file_path
    try:
        issue_deleted = int(db.execute(delete(RawIssue).where(RawIssue.batch_id == batch_id)).rowcount or 0)
        row_deleted = int(db.execute(delete(RawDataRow).where(RawDataRow.batch_id == batch_id)).rowcount or 0)
        db.delete(row)
        db.commit()
        deleted_file = safe_delete_upload_file(file_path)
        create_audit_log(
            db,
            entity_type="raw_data_batch",
            entity_id=batch_id,
            action="RAW_BATCH_DELETE",
            actor=current_user,
            before=before,
            after={"deletedFile": bool(deleted_file), "deletedRows": row_deleted, "deletedIssues": issue_deleted},
            source="api:/raw/batches/{batch_id}",
        )
        db.commit()
        return ApiResponse(data={"deleted": True, "deletedFile": bool(deleted_file)})
    except Exception as e:
        try:
            create_audit_log(
                db,
                entity_type="raw_data_batch",
                entity_id=batch_id,
                action="RAW_BATCH_DELETE_FAIL",
                actor=current_user,
                before=before,
                after={"error": str(e)},
                source="api:/raw/batches/{batch_id}",
            )
            db.commit()
        except Exception:
            pass
        raise AppError(code="RAW_BATCH_DELETE_FAIL", msg="删除失败", status_code=500)


@router.get("/raw/batches/{batch_id}/rows/page", response_model=ApiResponse)
def raw_row_page(
    batch_id: str,
    page: int = 1,
    size: int = 20,
    regionCompany: str | None = None,
    projectName: str | None = None,
    taskBatch: str | None = None,
    status: str | None = None,
    bizResult: str | None = None,
    isConnected: str | None = None,
    isValid: str | None = None,
    firstRating: str | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_permissions("data:read")),
) -> ApiResponse:
    rows, total = query_raw_row_page(
        db,
        batch_id=batch_id,
        page=max(1, page),
        size=max(1, min(200, size)),
        region_company=regionCompany,
        project_name=projectName,
        task_batch=taskBatch,
        status=status,
        biz_result=bizResult,
        is_connected=isConnected,
        is_valid=isValid,
        first_rating=firstRating,
        keyword=keyword,
    )
    records = [
        RawRowItem(
            id=r.id,
            rowNo=r.row_no,
            regionCompany=r.region_company,
            projectName=r.project_name,
            buildingNo=r.building_no,
            taskBatch=r.task_batch,
            status=r.status,
            bizResult=r.biz_result,
            isConnected=r.is_connected,
            isValid=r.is_valid,
            firstRating=r.first_rating,
            dialedAt=r.dialed_at,
            generalIssue=r.general_issue,
            remarkIssue=r.remark_issue,
        )
        for r in rows
    ]
    return ApiResponse(data=RawRowPageResponse(total=total, records=records).model_dump())


@router.get("/raw/rows/{row_id}", response_model=ApiResponse)
def raw_row_detail(
    row_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_permissions("data:read")),
) -> ApiResponse:
    row = db.get(RawDataRow, row_id)
    if row is None:
        raise AppError(code="NOT_FOUND", msg="原始行不存在", status_code=404)
    payload = RawRowDetailResponse(id=row.id, batchId=row.batch_id, rowNo=row.row_no, payload=row.raw_payload or {})
    return ApiResponse(data=payload.model_dump())


@router.get("/raw/issues/page", response_model=ApiResponse)
def raw_issue_page(
    page: int = 1,
    size: int = 20,
    batchId: str | None = None,
    keyword: str | None = None,
    regionCompany: str | None = None,
    projectName: str | None = None,
    taskBatch: str | None = None,
    sourceField: str | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_permissions("data:read")),
) -> ApiResponse:
    rows, total = query_raw_issue_page(
        db,
        page=max(1, page),
        size=max(1, min(200, size)),
        batch_id=batchId,
        keyword=keyword,
        region_company=regionCompany,
        project_name=projectName,
        task_batch=taskBatch,
        source_field=sourceField,
    )
    records = [
        RawIssueItem(
            id=r.id,
            batchId=r.batch_id,
            rowId=r.row_id,
            sourceField=r.source_field,
            issueText=r.issue_text,
            regionCompany=r.region_company,
            projectName=r.project_name,
            buildingNo=r.building_no,
            taskBatch=r.task_batch,
            dialedAt=r.dialed_at,
            createdAt=r.created_at,
        )
        for r in rows
    ]
    return ApiResponse(data=RawIssuePageResponse(total=total, records=records).model_dump())


@router.get("/raw/score/summary", response_model=ApiResponse)
def raw_score_summary(
    batchId: str | None = None,
    groupBy: str = "regionCompany",
    onlyValidConnected: bool = True,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_permissions("data:read")),
) -> ApiResponse:
    records = query_raw_score_summary(db, batch_id=batchId, group_by=groupBy, only_valid_connected=bool(onlyValidConnected))
    return ApiResponse(data=RawScoreSummaryResponse(records=records).model_dump())


@router.get("/raw/score/mapping", response_model=ApiResponse)
def raw_score_mapping_get(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_permissions("system:rules")),
) -> ApiResponse:
    return ApiResponse(data=get_score_mapping(db))


@router.post("/raw/score/mapping", response_model=ApiResponse)
def raw_score_mapping_set(
    mapping: dict,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("system:rules")),
) -> ApiResponse:
    normalized = set_score_mapping(db, mapping)
    create_audit_log(
        db,
        entity_type="system_rule",
        entity_id="raw_score_mapping_v1",
        action="RAW_SCORE_MAPPING_SET",
        actor=current_user,
        after=normalized,
    )
    db.commit()
    return ApiResponse(data=normalized)


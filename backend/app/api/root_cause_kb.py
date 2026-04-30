from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_admin_or_permissions
from app.core.errors import AppError
from app.core.response import ApiResponse
from app.db.session import get_db
from app.schemas.root_cause_kb import (
    RootCauseKbCreateRequest,
    RootCauseKbIdResponse,
    RootCauseKbImportResponse,
    RootCauseKbPageResponse,
    RootCauseKbToggleRequest,
    RootCauseKbUpdateRequest,
)
from app.services.root_cause_kb import (
    kb_categories,
    kb_create,
    kb_delete,
    kb_export_xlsx,
    kb_import_xlsx_or_csv,
    kb_page,
    kb_toggle,
    kb_update,
)


router = APIRouter()


def _kb_user(current_user: CurrentUser = Depends(require_admin_or_permissions("system:config"))) -> CurrentUser:
    return current_user


@router.get("/kb/root-causes/categories", response_model=ApiResponse)
def root_cause_kb_categories(current_user: CurrentUser = Depends(_kb_user)) -> ApiResponse:
    return ApiResponse(data={"records": kb_categories()})


@router.get("/kb/root-causes/page", response_model=ApiResponse)
def root_cause_kb_page(
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    categoryLv1: str | None = None,
    categoryLv2: str | None = None,
    level: str | None = None,
    enabled: bool | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_kb_user),
) -> ApiResponse:
    data = kb_page(
        db=db,
        page=page,
        size=size,
        keyword=keyword,
        category_lv1=categoryLv1,
        category_lv2=categoryLv2,
        level=level,
        is_enabled=enabled,
    )
    return ApiResponse(data=RootCauseKbPageResponse(**data).model_dump())


@router.post("/kb/root-causes", response_model=ApiResponse)
def root_cause_kb_create(
    payload: RootCauseKbCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_kb_user),
) -> ApiResponse:
    row = kb_create(db=db, payload=payload.model_dump(), actor=current_user)
    db.commit()
    return ApiResponse(data=RootCauseKbIdResponse(id=row.id).model_dump())


@router.put("/kb/root-causes/{kb_id}", response_model=ApiResponse)
def root_cause_kb_update(
    kb_id: str,
    payload: RootCauseKbUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_kb_user),
) -> ApiResponse:
    row = kb_update(db=db, kb_id=kb_id, payload=payload.model_dump(exclude_unset=True), actor=current_user)
    db.commit()
    return ApiResponse(data=RootCauseKbIdResponse(id=row.id).model_dump())


@router.post("/kb/root-causes/{kb_id}/toggle", response_model=ApiResponse)
def root_cause_kb_toggle(
    kb_id: str,
    payload: RootCauseKbToggleRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_kb_user),
) -> ApiResponse:
    row = kb_toggle(db=db, kb_id=kb_id, is_enabled=payload.isEnabled, actor=current_user)
    db.commit()
    return ApiResponse(data=RootCauseKbIdResponse(id=row.id).model_dump())


@router.delete("/kb/root-causes/{kb_id}", response_model=ApiResponse)
def root_cause_kb_delete(
    kb_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_kb_user),
) -> ApiResponse:
    kb_delete(db=db, kb_id=kb_id, actor=current_user)
    db.commit()
    return ApiResponse(data=RootCauseKbIdResponse(id=kb_id).model_dump())


@router.post("/kb/root-causes/import", response_model=ApiResponse)
async def root_cause_kb_import(
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_kb_user),
) -> ApiResponse:
    if file is None:
        raise AppError(code="FILE_REQUIRED", msg="请上传文件", status_code=400)
    content = await file.read()
    if not content:
        raise AppError(code="FILE_EMPTY", msg="上传文件为空", status_code=400)
    result = kb_import_xlsx_or_csv(db=db, filename=file.filename or "import.xlsx", content=content, actor=current_user)
    db.commit()
    return ApiResponse(data=RootCauseKbImportResponse(**result).model_dump())


@router.get("/kb/root-causes/export")
def root_cause_kb_export(
    keyword: str | None = None,
    categoryLv1: str | None = None,
    categoryLv2: str | None = None,
    level: str | None = None,
    enabled: bool | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_kb_user),
) -> FileResponse:
    path = kb_export_xlsx(
        db=db,
        keyword=keyword,
        category_lv1=categoryLv1,
        category_lv2=categoryLv2,
        level=level,
        is_enabled=enabled,
    )
    db.commit()
    return FileResponse(path=path, filename="root_cause_kb.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


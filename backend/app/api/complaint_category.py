from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_admin_or_permissions
from app.core.errors import AppError
from app.core.response import ApiResponse
from app.db.session import get_db
from app.schemas.complaint_category import (
    CategoryIdResponse,
    CategoryImportResponse,
    CategoryLv1CreateRequest,
    CategoryLv1ListResponse,
    CategoryLv1UpdateRequest,
    CategoryLv2CreateRequest,
    CategoryLv2PageResponse,
    CategoryLv2UpdateRequest,
    CategoryToggleRequest,
)
from app.services.complaint_category import (
    export_xlsx,
    import_xlsx_or_csv,
    lv1_create,
    lv1_delete,
    lv1_list,
    lv1_toggle,
    lv1_update,
    lv2_create,
    lv2_delete,
    lv2_page,
    lv2_toggle,
    lv2_update,
)


router = APIRouter()


def _cat_user(current_user: CurrentUser = Depends(require_admin_or_permissions("system:config"))) -> CurrentUser:
    return current_user


@router.get("/kb/categories/lv1/list", response_model=ApiResponse)
def category_lv1_list(
    enabled: bool | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_cat_user),
) -> ApiResponse:
    return ApiResponse(data=CategoryLv1ListResponse(records=lv1_list(db=db, enabled=enabled)).model_dump())


@router.get("/kb/categories/lv2/page", response_model=ApiResponse)
def category_lv2_page(
    page: int = 1,
    size: int = 20,
    lv1Id: str | None = None,
    keyword: str | None = None,
    enabled: bool | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_cat_user),
) -> ApiResponse:
    data = lv2_page(db=db, page=page, size=size, lv1_id=lv1Id, keyword=keyword, enabled=enabled)
    return ApiResponse(data=CategoryLv2PageResponse(**data).model_dump())


@router.post("/kb/categories/lv1", response_model=ApiResponse)
def category_lv1_create(
    payload: CategoryLv1CreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_cat_user),
) -> ApiResponse:
    row = lv1_create(db=db, payload=payload.model_dump(), actor=current_user)
    db.commit()
    return ApiResponse(data=CategoryIdResponse(id=row.id).model_dump())


@router.put("/kb/categories/lv1/{lv1_id}", response_model=ApiResponse)
def category_lv1_update(
    lv1_id: str,
    payload: CategoryLv1UpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_cat_user),
) -> ApiResponse:
    row = lv1_update(db=db, lv1_id=lv1_id, payload=payload.model_dump(exclude_unset=True), actor=current_user)
    db.commit()
    return ApiResponse(data=CategoryIdResponse(id=row.id).model_dump())


@router.post("/kb/categories/lv1/{lv1_id}/toggle", response_model=ApiResponse)
def category_lv1_toggle(
    lv1_id: str,
    payload: CategoryToggleRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_cat_user),
) -> ApiResponse:
    row = lv1_toggle(db=db, lv1_id=lv1_id, is_enabled=payload.isEnabled, actor=current_user)
    db.commit()
    return ApiResponse(data=CategoryIdResponse(id=row.id).model_dump())


@router.delete("/kb/categories/lv1/{lv1_id}", response_model=ApiResponse)
def category_lv1_delete(
    lv1_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_cat_user),
) -> ApiResponse:
    lv1_delete(db=db, lv1_id=lv1_id, actor=current_user)
    db.commit()
    return ApiResponse(data=CategoryIdResponse(id=lv1_id).model_dump())


@router.post("/kb/categories/lv2", response_model=ApiResponse)
def category_lv2_create(
    payload: CategoryLv2CreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_cat_user),
) -> ApiResponse:
    row = lv2_create(db=db, payload=payload.model_dump(), actor=current_user)
    db.commit()
    return ApiResponse(data=CategoryIdResponse(id=row.id).model_dump())


@router.put("/kb/categories/lv2/{lv2_id}", response_model=ApiResponse)
def category_lv2_update(
    lv2_id: str,
    payload: CategoryLv2UpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_cat_user),
) -> ApiResponse:
    row = lv2_update(db=db, lv2_id=lv2_id, payload=payload.model_dump(exclude_unset=True), actor=current_user)
    db.commit()
    return ApiResponse(data=CategoryIdResponse(id=row.id).model_dump())


@router.post("/kb/categories/lv2/{lv2_id}/toggle", response_model=ApiResponse)
def category_lv2_toggle(
    lv2_id: str,
    payload: CategoryToggleRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_cat_user),
) -> ApiResponse:
    row = lv2_toggle(db=db, lv2_id=lv2_id, is_enabled=payload.isEnabled, actor=current_user)
    db.commit()
    return ApiResponse(data=CategoryIdResponse(id=row.id).model_dump())


@router.delete("/kb/categories/lv2/{lv2_id}", response_model=ApiResponse)
def category_lv2_delete(
    lv2_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_cat_user),
) -> ApiResponse:
    lv2_delete(db=db, lv2_id=lv2_id, actor=current_user)
    db.commit()
    return ApiResponse(data=CategoryIdResponse(id=lv2_id).model_dump())


@router.post("/kb/categories/import", response_model=ApiResponse)
async def category_import(
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_cat_user),
) -> ApiResponse:
    if file is None:
        raise AppError(code="FILE_REQUIRED", msg="请上传文件", status_code=400)
    content = await file.read()
    if not content:
        raise AppError(code="FILE_EMPTY", msg="上传文件为空", status_code=400)
    result = import_xlsx_or_csv(db=db, filename=file.filename or "import.xlsx", content=content, actor=current_user)
    db.commit()
    return ApiResponse(data=CategoryImportResponse(**result).model_dump())


@router.get("/kb/categories/export")
def category_export(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_cat_user),
) -> FileResponse:
    path = export_xlsx(db=db)
    db.commit()
    return FileResponse(path=path, filename="complaint_category.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


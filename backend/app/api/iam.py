from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import CurrentUser, require_admin_or_permissions
from app.core.errors import AppError
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.rbac import Department, Role, User
from app.schemas.iam import UserStatusUpdateRequest
from app.services.audit import create_audit_log
from app.services.task import get_task, upsert_task


router = APIRouter()


@router.get("/iam/org/tree", response_model=ApiResponse)
def iam_org_tree(
    includeInactive: bool = False,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("iam:org:read")),
) -> ApiResponse:
    stmt = select(Department).order_by(Department.id.asc())
    if not includeInactive:
        stmt = stmt.where(Department.is_active.is_(True))
    rows = db.execute(stmt).scalars().all()

    nodes: dict[int, dict] = {}
    for d in rows:
        nodes[d.id] = {
            "id": d.id,
            "name": d.name,
            "parentId": d.parent_id,
            "isActive": bool(d.is_active),
            "children": [],
        }

    roots: list[dict] = []
    for node in nodes.values():
        parent_id = node.get("parentId")
        if parent_id and parent_id in nodes:
            nodes[parent_id]["children"].append(node)
        else:
            roots.append(node)

    return ApiResponse(data={"tree": roots})


@router.get("/iam/org/page", response_model=ApiResponse)
def iam_org_page(
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    parentId: int | None = None,
    isActive: bool | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("iam:org:read")),
) -> ApiResponse:
    page = max(1, page)
    size = max(1, min(200, size))

    base = select(Department)
    if parentId is not None:
        base = base.where(Department.parent_id == parentId)
    if isActive is not None:
        base = base.where(Department.is_active.is_(bool(isActive)))
    if keyword:
        kw = f"%{keyword.strip()}%"
        base = base.where(Department.name.ilike(kw))

    count_stmt = select(func.count()).select_from(base.subquery())
    total = int(db.execute(count_stmt).scalar() or 0)

    stmt = base.order_by(Department.id.asc()).offset((page - 1) * size).limit(size)
    rows = db.execute(stmt).scalars().all()
    records = [
        {
            "id": d.id,
            "name": d.name,
            "parentId": d.parent_id,
            "isActive": bool(d.is_active),
            "createdAt": getattr(d, "created_at", None),
            "updatedAt": getattr(d, "updated_at", None),
        }
        for d in rows
    ]
    return ApiResponse(data={"total": total, "records": records})


@router.get("/iam/roles/page", response_model=ApiResponse)
def iam_role_page(
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    isActive: bool | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("iam:role:read")),
) -> ApiResponse:
    page = max(1, page)
    size = max(1, min(200, size))

    base = select(Role)
    if isActive is not None:
        base = base.where(Role.is_active.is_(bool(isActive)))
    if keyword:
        kw = f"%{keyword.strip()}%"
        base = base.where(or_(Role.name.ilike(kw), Role.key.ilike(kw)))

    count_stmt = select(func.count()).select_from(base.subquery())
    total = int(db.execute(count_stmt).scalar() or 0)

    stmt = base.order_by(Role.id.asc()).offset((page - 1) * size).limit(size)
    rows = db.execute(stmt).scalars().all()
    records = [
        {
            "id": r.id,
            "name": r.name,
            "key": r.key,
            "isActive": bool(r.is_active),
            "dataScope": r.data_scope.value if hasattr(r.data_scope, "value") else str(r.data_scope),
            "createdAt": getattr(r, "created_at", None),
            "updatedAt": getattr(r, "updated_at", None),
        }
        for r in rows
    ]
    return ApiResponse(data={"total": total, "records": records})


@router.get("/iam/users/page", response_model=ApiResponse)
def iam_user_page(
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    deptId: int | None = None,
    isActive: bool | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("iam:user:read")),
) -> ApiResponse:
    page = max(1, page)
    size = max(1, min(200, size))

    base = select(User).join(Department, Department.id == User.department_id, isouter=True).options(selectinload(User.department))
    if deptId is not None:
        base = base.where(User.department_id == deptId)
    if isActive is not None:
        base = base.where(User.is_active.is_(bool(isActive)))
    if keyword:
        kw = f"%{keyword.strip()}%"
        base = base.where(or_(User.username.ilike(kw), Department.name.ilike(kw)))

    count_stmt = select(func.count()).select_from(base.subquery())
    total = int(db.execute(count_stmt).scalar() or 0)

    stmt = base.order_by(User.id.asc()).offset((page - 1) * size).limit(size)
    rows = db.execute(stmt).scalars().all()
    records = [
        {
            "id": u.id,
            "username": u.username,
            "isActive": bool(u.is_active),
            "deptId": u.department_id,
            "deptName": u.department.name if u.department else None,
            "createdAt": getattr(u, "created_at", None),
            "updatedAt": getattr(u, "updated_at", None),
        }
        for u in rows
    ]
    return ApiResponse(data={"total": total, "records": records})


@router.put("/iam/users/{user_id}/status", response_model=ApiResponse)
def iam_user_status_update(
    user_id: int,
    payload: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:user:status")),
) -> ApiResponse:
    row = db.get(User, user_id)
    if row is None:
        raise AppError(code="NOT_FOUND", msg="用户不存在", status_code=404)
    before = {"id": row.id, "username": row.username, "isActive": bool(row.is_active)}
    row.is_active = bool(payload.isActive)
    db.add(row)
    after = {"id": row.id, "username": row.username, "isActive": bool(row.is_active)}
    create_audit_log(
        db,
        entity_type="iam_user",
        entity_id=str(row.id),
        action="IAM_USER_STATUS_CHANGE",
        actor=current_user,
        before=before,
        after=after,
        reason="用户启停",
        source="api",
    )
    db.commit()
    return ApiResponse(data={"id": row.id, "isActive": bool(row.is_active)})


def _sync_placeholder(db: Session, *, task_id: str, entity_type: str, action: str, actor: CurrentUser) -> dict:
    before_task = get_task(db, task_id=task_id)
    before = {
        "taskId": task_id,
        "status": before_task.status if before_task else None,
        "updatedAt": before_task.updated_at if before_task else None,
    }
    now = datetime.now().astimezone()
    row = upsert_task(db, task_id=task_id, status="SUCCESS", progress=100, message=f"无外部IAM，占位同步完成：{now.isoformat()}")
    db.flush()
    db.refresh(row)
    after = {"taskId": row.id, "status": row.status, "updatedAt": row.updated_at}
    create_audit_log(
        db,
        entity_type=entity_type,
        entity_id="all",
        action=action,
        actor=actor,
        before=before,
        after=after,
        reason="主数据同步",
        source="api",
    )
    db.commit()
    return {"taskId": row.id, "status": row.status, "progress": row.progress, "message": row.message, "syncedAt": row.updated_at}


@router.post("/iam/org/sync", response_model=ApiResponse)
def iam_org_sync(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:org:sync")),
) -> ApiResponse:
    payload = _sync_placeholder(db, task_id="iam_org_sync", entity_type="iam_org", action="IAM_ORG_SYNC", actor=current_user)
    return ApiResponse(data=payload)


@router.post("/iam/roles/sync", response_model=ApiResponse)
def iam_role_sync(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:role:sync")),
) -> ApiResponse:
    payload = _sync_placeholder(db, task_id="iam_role_sync", entity_type="iam_role", action="IAM_ROLE_SYNC", actor=current_user)
    return ApiResponse(data=payload)


@router.post("/iam/users/sync", response_model=ApiResponse)
def iam_user_sync(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:user:sync")),
) -> ApiResponse:
    payload = _sync_placeholder(db, task_id="iam_user_sync", entity_type="iam_user", action="IAM_USER_SYNC", actor=current_user)
    return ApiResponse(data=payload)

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import CurrentUser, require_admin_or_permissions
from app.core.errors import AppError
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.rbac import Department, Role, User, user_role
from app.schemas.iam import (
    OrgMutationRequest,
    OrgUpdateRequest,
    RoleMutationRequest,
    RoleUpdateRequest,
    UserMutationRequest,
    UserStatusUpdateRequest,
    UserUpdateRequest,
)
from app.services.audit import create_audit_log
from app.services.task import get_task, upsert_task


router = APIRouter()


def _norm_text(value: str | None) -> str:
    return (value or "").strip()


def _serialize_department(row: Department) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "parentId": row.parent_id,
        "parentName": row.parent.name if getattr(row, "parent", None) else None,
        "isActive": bool(row.is_active),
        "createdAt": getattr(row, "created_at", None),
        "updatedAt": getattr(row, "updated_at", None),
    }


def _role_user_count(db: Session, *, role_id: int) -> int:
    return int(
        db.execute(select(func.count(user_role.c.user_id)).where(user_role.c.role_id == role_id)).scalar()
        or 0
    )


def _serialize_role(row: Role, *, db: Session, user_count: int | None = None) -> dict:
    users = _role_user_count(db, role_id=row.id) if user_count is None else int(user_count)
    data_scope = row.data_scope.value if hasattr(row.data_scope, "value") else str(row.data_scope)
    return {
        "id": row.id,
        "name": row.name,
        "key": row.key,
        "code": row.key,
        "desc": row.description,
        "isActive": bool(row.is_active),
        "dataScope": data_scope,
        "users": users,
        "createdAt": getattr(row, "created_at", None),
        "updatedAt": getattr(row, "updated_at", None),
    }


def _serialize_user(row: User) -> dict:
    dept_name = row.department.name if getattr(row, "department", None) else None
    return {
        "id": row.id,
        "name": row.username,
        "username": row.username,
        "empId": row.emp_id,
        "phone": row.phone,
        "isActive": bool(row.is_active),
        "deptId": row.department_id,
        "deptName": dept_name,
        "orgId": row.department_id,
        "org": dept_name,
        "status": "启用" if row.is_active else "禁用",
        "roleIds": [role.id for role in getattr(row, "roles", [])],
        "createdAt": getattr(row, "created_at", None),
        "updatedAt": getattr(row, "updated_at", None),
    }


def _get_department_or_404(db: Session, dept_id: int) -> Department:
    row = db.execute(
        select(Department).where(Department.id == dept_id).options(selectinload(Department.parent)).limit(1)
    ).scalars().first()
    if row is None:
        raise AppError(code="NOT_FOUND", msg="组织不存在", status_code=404)
    return row


def _get_role_or_404(db: Session, role_id: int) -> Role:
    row = db.execute(select(Role).where(Role.id == role_id).options(selectinload(Role.users)).limit(1)).scalars().first()
    if row is None:
        raise AppError(code="NOT_FOUND", msg="角色不存在", status_code=404)
    return row


def _get_user_or_404(db: Session, user_id: int) -> User:
    row = db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.department), selectinload(User.roles))
        .limit(1)
    ).scalars().first()
    if row is None:
        raise AppError(code="NOT_FOUND", msg="用户不存在", status_code=404)
    return row


def _ensure_department_name_unique(db: Session, *, name: str, exclude_id: int | None = None) -> None:
    stmt = select(Department.id).where(Department.name == name)
    if exclude_id is not None:
        stmt = stmt.where(Department.id != exclude_id)
    existed = db.execute(stmt.limit(1)).scalar_one_or_none()
    if existed is not None:
        raise AppError(code="DUPLICATE", msg="组织名称已存在", status_code=400)


def _ensure_role_key_unique(db: Session, *, key: str, exclude_id: int | None = None) -> None:
    stmt = select(Role.id).where(Role.key == key)
    if exclude_id is not None:
        stmt = stmt.where(Role.id != exclude_id)
    existed = db.execute(stmt.limit(1)).scalar_one_or_none()
    if existed is not None:
        raise AppError(code="DUPLICATE", msg="角色编码已存在", status_code=400)


def _ensure_user_username_unique(db: Session, *, username: str, exclude_id: int | None = None) -> None:
    stmt = select(User.id).where(User.username == username)
    if exclude_id is not None:
        stmt = stmt.where(User.id != exclude_id)
    existed = db.execute(stmt.limit(1)).scalar_one_or_none()
    if existed is not None:
        raise AppError(code="DUPLICATE", msg="用户名已存在", status_code=400)


def _ensure_user_emp_id_unique(db: Session, *, emp_id: str | None, exclude_id: int | None = None) -> None:
    if not emp_id:
        return
    stmt = select(User.id).where(User.emp_id == emp_id)
    if exclude_id is not None:
        stmt = stmt.where(User.id != exclude_id)
    existed = db.execute(stmt.limit(1)).scalar_one_or_none()
    if existed is not None:
        raise AppError(code="DUPLICATE", msg="工号已存在", status_code=400)


def _validate_department_parent(db: Session, *, dept_id: int | None, parent_id: int | None) -> None:
    if parent_id is None:
        return
    if dept_id is not None and parent_id == dept_id:
        raise AppError(code="VALIDATION_ERROR", msg="上级组织不能选择自身", status_code=400)
    parent = db.get(Department, parent_id)
    if parent is None:
        raise AppError(code="NOT_FOUND", msg="上级组织不存在", status_code=404)
    if dept_id is None:
        return
    current_parent_id = parent.parent_id
    visited: set[int] = {dept_id}
    while current_parent_id is not None:
        if current_parent_id in visited:
            raise AppError(code="VALIDATION_ERROR", msg="上级组织不能选择当前组织或其下级组织", status_code=400)
        visited.add(current_parent_id)
        current_parent = db.get(Department, current_parent_id)
        if current_parent is None:
            break
        current_parent_id = current_parent.parent_id


def _validate_department_reference(db: Session, *, org_id: int | None) -> int | None:
    if org_id is None:
        return None
    if db.get(Department, org_id) is None:
        raise AppError(code="NOT_FOUND", msg="所属组织不存在", status_code=404)
    return org_id


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

    base = select(Department).options(selectinload(Department.parent))
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
        _serialize_department(d)
        for d in rows
    ]
    return ApiResponse(data={"total": total, "records": records})


@router.post("/iam/org", response_model=ApiResponse)
def iam_org_create(
    payload: OrgMutationRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:org:write")),
) -> ApiResponse:
    name = _norm_text(payload.name)
    if not name:
        raise AppError(code="VALIDATION_ERROR", msg="组织名称不能为空", status_code=422)
    _ensure_department_name_unique(db, name=name)
    _validate_department_parent(db, dept_id=None, parent_id=payload.parentId)
    row = Department(name=name, parent_id=payload.parentId, is_active=bool(payload.isActive))
    db.add(row)
    db.flush()
    row = _get_department_or_404(db, row.id)
    after = _serialize_department(row)
    create_audit_log(
        db,
        entity_type="iam_org",
        entity_id=str(row.id),
        action="IAM_ORG_CREATE",
        actor=current_user,
        after=after,
        reason="创建组织",
        source="api",
    )
    db.commit()
    return ApiResponse(data=after)


@router.get("/iam/org/{org_id}", response_model=ApiResponse)
def iam_org_detail(
    org_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("iam:org:read")),
) -> ApiResponse:
    return ApiResponse(data=_serialize_department(_get_department_or_404(db, org_id)))


@router.put("/iam/org/{org_id}", response_model=ApiResponse)
def iam_org_update(
    org_id: int,
    payload: OrgUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:org:write")),
) -> ApiResponse:
    row = _get_department_or_404(db, org_id)
    before = _serialize_department(row)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        name = _norm_text(payload.name)
        if not name:
            raise AppError(code="VALIDATION_ERROR", msg="组织名称不能为空", status_code=422)
        _ensure_department_name_unique(db, name=name, exclude_id=org_id)
        row.name = name
    if "parentId" in data:
        _validate_department_parent(db, dept_id=org_id, parent_id=payload.parentId)
        row.parent_id = payload.parentId
    if "isActive" in data:
        row.is_active = bool(payload.isActive)
    db.add(row)
    db.flush()
    row = _get_department_or_404(db, org_id)
    after = _serialize_department(row)
    create_audit_log(
        db,
        entity_type="iam_org",
        entity_id=str(row.id),
        action="IAM_ORG_UPDATE",
        actor=current_user,
        before=before,
        after=after,
        reason="更新组织",
        source="api",
    )
    db.commit()
    return ApiResponse(data=after)


@router.delete("/iam/org/{org_id}", response_model=ApiResponse)
def iam_org_delete(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:org:write")),
) -> ApiResponse:
    row = _get_department_or_404(db, org_id)
    child_exists = db.execute(select(Department.id).where(Department.parent_id == org_id).limit(1)).scalar_one_or_none()
    if child_exists is not None:
        raise AppError(code="ORG_DELETE_BLOCKED", msg="当前组织下仍有下级组织，删除前请先清理", status_code=400)
    user_exists = db.execute(select(User.id).where(User.department_id == org_id).limit(1)).scalar_one_or_none()
    if user_exists is not None:
        raise AppError(code="ORG_DELETE_BLOCKED", msg="当前组织下仍有关联用户，删除前请先清理", status_code=400)
    before = _serialize_department(row)
    db.delete(row)
    create_audit_log(
        db,
        entity_type="iam_org",
        entity_id=str(org_id),
        action="IAM_ORG_DELETE",
        actor=current_user,
        before=before,
        after={"id": org_id, "deleted": True},
        reason="删除组织",
        source="api",
    )
    db.commit()
    return ApiResponse(data={"id": org_id, "deleted": True})


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
    role_ids = [r.id for r in rows]
    role_user_counts: dict[int, int] = {}
    if role_ids:
        count_rows = db.execute(
            select(user_role.c.role_id, func.count(user_role.c.user_id))
            .where(user_role.c.role_id.in_(role_ids))
            .group_by(user_role.c.role_id)
        ).all()
        role_user_counts = {int(role_id): int(total) for role_id, total in count_rows}
    records = [
        _serialize_role(r, db=db, user_count=role_user_counts.get(r.id, 0))
        for r in rows
    ]
    return ApiResponse(data={"total": total, "records": records})


@router.post("/iam/roles", response_model=ApiResponse)
def iam_role_create(
    payload: RoleMutationRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:role:write")),
) -> ApiResponse:
    name = _norm_text(payload.name)
    key = _norm_text(payload.code)
    if not name:
        raise AppError(code="VALIDATION_ERROR", msg="角色名称不能为空", status_code=422)
    if not key:
        raise AppError(code="VALIDATION_ERROR", msg="角色编码不能为空", status_code=422)
    _ensure_role_key_unique(db, key=key)
    row = Role(
        name=name,
        key=key,
        description=_norm_text(payload.desc) or None,
        is_active=bool(payload.isActive),
    )
    db.add(row)
    db.flush()
    row = _get_role_or_404(db, row.id)
    after = _serialize_role(row, db=db, user_count=0)
    create_audit_log(
        db,
        entity_type="iam_role",
        entity_id=str(row.id),
        action="IAM_ROLE_CREATE",
        actor=current_user,
        after=after,
        reason="创建角色",
        source="api",
    )
    db.commit()
    return ApiResponse(data=after)


@router.get("/iam/roles/{role_id}", response_model=ApiResponse)
def iam_role_detail(
    role_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("iam:role:read")),
) -> ApiResponse:
    return ApiResponse(data=_serialize_role(_get_role_or_404(db, role_id), db=db))


@router.put("/iam/roles/{role_id}", response_model=ApiResponse)
def iam_role_update(
    role_id: int,
    payload: RoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:role:write")),
) -> ApiResponse:
    row = _get_role_or_404(db, role_id)
    before = _serialize_role(row, db=db)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        name = _norm_text(payload.name)
        if not name:
            raise AppError(code="VALIDATION_ERROR", msg="角色名称不能为空", status_code=422)
        row.name = name
    if "code" in data:
        key = _norm_text(payload.code)
        if not key:
            raise AppError(code="VALIDATION_ERROR", msg="角色编码不能为空", status_code=422)
        _ensure_role_key_unique(db, key=key, exclude_id=role_id)
        row.key = key
    if "desc" in data:
        row.description = _norm_text(payload.desc) or None
    if "isActive" in data:
        row.is_active = bool(payload.isActive)
    db.add(row)
    db.flush()
    row = _get_role_or_404(db, role_id)
    after = _serialize_role(row, db=db)
    create_audit_log(
        db,
        entity_type="iam_role",
        entity_id=str(row.id),
        action="IAM_ROLE_UPDATE",
        actor=current_user,
        before=before,
        after=after,
        reason="更新角色",
        source="api",
    )
    db.commit()
    return ApiResponse(data=after)


@router.delete("/iam/roles/{role_id}", response_model=ApiResponse)
def iam_role_delete(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:role:write")),
) -> ApiResponse:
    row = _get_role_or_404(db, role_id)
    assigned_user_id = db.execute(select(user_role.c.user_id).where(user_role.c.role_id == role_id).limit(1)).scalar_one_or_none()
    if assigned_user_id is not None:
        raise AppError(code="ROLE_DELETE_BLOCKED", msg="当前角色已分配给用户，删除前请先解除关联", status_code=400)
    before = _serialize_role(row, db=db, user_count=0)
    db.delete(row)
    create_audit_log(
        db,
        entity_type="iam_role",
        entity_id=str(role_id),
        action="IAM_ROLE_DELETE",
        actor=current_user,
        before=before,
        after={"id": role_id, "deleted": True},
        reason="删除角色",
        source="api",
    )
    db.commit()
    return ApiResponse(data={"id": role_id, "deleted": True})


@router.get("/iam/users/page", response_model=ApiResponse)
def iam_user_page(
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    deptId: int | None = None,
    orgId: int | None = None,
    isActive: bool | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("iam:user:read")),
) -> ApiResponse:
    page = max(1, page)
    size = max(1, min(200, size))

    target_dept_id = deptId if deptId is not None else orgId
    base = select(User).join(Department, Department.id == User.department_id, isouter=True).options(selectinload(User.department))
    if target_dept_id is not None:
        base = base.where(User.department_id == target_dept_id)
    if isActive is not None:
        base = base.where(User.is_active.is_(bool(isActive)))
    if keyword:
        kw = f"%{keyword.strip()}%"
        base = base.where(
            or_(
                User.username.ilike(kw),
                User.emp_id.ilike(kw),
                User.phone.ilike(kw),
                Department.name.ilike(kw),
            )
        )

    count_stmt = select(func.count()).select_from(base.subquery())
    total = int(db.execute(count_stmt).scalar() or 0)

    stmt = base.order_by(User.id.asc()).offset((page - 1) * size).limit(size)
    rows = db.execute(stmt).scalars().all()
    records = [
        _serialize_user(u)
        for u in rows
    ]
    return ApiResponse(data={"total": total, "records": records})


@router.post("/iam/users", response_model=ApiResponse)
def iam_user_create(
    payload: UserMutationRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:user:write")),
) -> ApiResponse:
    name = _norm_text(payload.name)
    if not name:
        raise AppError(code="VALIDATION_ERROR", msg="用户姓名不能为空", status_code=422)
    emp_id = _norm_text(payload.empId) or None
    phone = _norm_text(payload.phone) or None
    _ensure_user_username_unique(db, username=name)
    _ensure_user_emp_id_unique(db, emp_id=emp_id)
    dept_id = _validate_department_reference(db, org_id=payload.orgId)
    row = User(
        username=name,
        emp_id=emp_id,
        phone=phone,
        department_id=dept_id,
        is_active=bool(payload.isActive),
        password_hash="",
    )
    db.add(row)
    db.flush()
    row = _get_user_or_404(db, row.id)
    after = _serialize_user(row)
    create_audit_log(
        db,
        entity_type="iam_user",
        entity_id=str(row.id),
        action="IAM_USER_CREATE",
        actor=current_user,
        after=after,
        reason="创建用户",
        source="api",
    )
    db.commit()
    return ApiResponse(data=after)


@router.get("/iam/users/{user_id}", response_model=ApiResponse)
def iam_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("iam:user:read")),
) -> ApiResponse:
    return ApiResponse(data=_serialize_user(_get_user_or_404(db, user_id)))


@router.put("/iam/users/{user_id}", response_model=ApiResponse)
def iam_user_update(
    user_id: int,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:user:write")),
) -> ApiResponse:
    row = _get_user_or_404(db, user_id)
    before = _serialize_user(row)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        name = _norm_text(payload.name)
        if not name:
            raise AppError(code="VALIDATION_ERROR", msg="用户姓名不能为空", status_code=422)
        _ensure_user_username_unique(db, username=name, exclude_id=user_id)
        row.username = name
    if "empId" in data:
        emp_id = _norm_text(payload.empId) or None
        _ensure_user_emp_id_unique(db, emp_id=emp_id, exclude_id=user_id)
        row.emp_id = emp_id
    if "phone" in data:
        row.phone = _norm_text(payload.phone) or None
    if "orgId" in data:
        row.department_id = _validate_department_reference(db, org_id=payload.orgId)
    if "isActive" in data:
        row.is_active = bool(payload.isActive)
    db.add(row)
    db.flush()
    row = _get_user_or_404(db, user_id)
    after = _serialize_user(row)
    create_audit_log(
        db,
        entity_type="iam_user",
        entity_id=str(row.id),
        action="IAM_USER_UPDATE",
        actor=current_user,
        before=before,
        after=after,
        reason="更新用户",
        source="api",
    )
    db.commit()
    return ApiResponse(data=after)


@router.delete("/iam/users/{user_id}", response_model=ApiResponse)
def iam_user_delete(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("iam:user:write")),
) -> ApiResponse:
    row = _get_user_or_404(db, user_id)
    before = _serialize_user(row)
    db.delete(row)
    create_audit_log(
        db,
        entity_type="iam_user",
        entity_id=str(user_id),
        action="IAM_USER_DELETE",
        actor=current_user,
        before=before,
        after={"id": user_id, "deleted": True},
        reason="删除用户",
        source="api",
    )
    db.commit()
    return ApiResponse(data={"id": user_id, "deleted": True})


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

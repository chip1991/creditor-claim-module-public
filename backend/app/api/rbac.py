from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import CurrentUser, require_admin_or_permissions
from app.core.errors import AppError
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.rbac import Department, Menu, Permission, Role, RoleDataScope, User
from app.schemas.rbac import RoleDataScopeSaveRequest, RoleMenusSaveRequest, RolePermissionsSaveRequest, UserRoleAssignRequest
from app.services.audit import create_audit_log


router = APIRouter()

@router.get("/rbac/roles/page", response_model=ApiResponse)
def rbac_role_page(
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    isActive: bool | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("rbac:role:read")),
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


@router.get("/rbac/roles/{role_id}", response_model=ApiResponse)
def rbac_role_detail(
    role_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("rbac:role:read")),
) -> ApiResponse:
    stmt = (
        select(Role)
        .where(Role.id == role_id)
        .options(selectinload(Role.permissions), selectinload(Role.departments), selectinload(Role.menus))
        .limit(1)
    )
    role = db.execute(stmt).scalars().first()
    if role is None:
        raise AppError(code="NOT_FOUND", msg="角色不存在", status_code=404)

    permission_codes = [p.code for p in role.permissions if p.is_active]
    dept_ids = [d.id for d in role.departments if d.is_active]
    menu_ids = [m.id for m in sorted(role.menus, key=lambda x: (x.order_no, x.id)) if m.is_active]

    data_scope_value = role.data_scope.value if hasattr(role.data_scope, "value") else str(role.data_scope)
    data_scope = {"scope": data_scope_value, "deptIds": dept_ids if data_scope_value == RoleDataScope.CUSTOM.value else []}

    payload = {
        "role": {
            "id": role.id,
            "name": role.name,
            "key": role.key,
            "isActive": bool(role.is_active),
            "dataScope": data_scope_value,
            "createdAt": getattr(role, "created_at", None),
            "updatedAt": getattr(role, "updated_at", None),
        },
        "menuIds": menu_ids,
        "permissionCodes": permission_codes,
        "dataScope": data_scope,
    }
    return ApiResponse(data=payload)


@router.post("/rbac/roles/{role_id}/menus", response_model=ApiResponse)
def rbac_role_menus_save(
    role_id: int,
    payload: RoleMenusSaveRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("rbac:role:write")),
) -> ApiResponse:
    stmt = select(Role).where(Role.id == role_id).options(selectinload(Role.menus)).limit(1)
    role = db.execute(stmt).scalars().first()
    if role is None:
        raise AppError(code="NOT_FOUND", msg="角色不存在", status_code=404)

    before = {"menuIds": [m.id for m in sorted(role.menus, key=lambda x: (x.order_no, x.id))]}
    menu_ids = [str(x) for x in payload.menuIds if x]
    if menu_ids:
        menus = db.execute(select(Menu).where(Menu.id.in_(list(dict.fromkeys(menu_ids))))).scalars().all()
        by_id = {m.id: m for m in menus}
        found = set(by_id.keys())
        missing = [mid for mid in menu_ids if mid not in found]
        if missing:
            raise AppError(code="MENU_NOT_FOUND", msg=f"菜单不存在：{','.join(missing)}", status_code=400)
        role.menus = [by_id[mid] for mid in dict.fromkeys(menu_ids)]
    else:
        role.menus = []

    after = {"menuIds": [m.id for m in role.menus]}
    create_audit_log(
        db,
        entity_type="rbac_role",
        entity_id=str(role_id),
        action="RBAC_ROLE_MENUS_SAVE",
        actor=current_user,
        before=before,
        after=after,
        reason="保存角色菜单权限",
        source="api",
    )
    db.add(role)
    db.commit()
    return ApiResponse(data={"roleId": role_id, "menuIds": after["menuIds"]})


@router.post("/rbac/roles/{role_id}/permissions", response_model=ApiResponse)
def rbac_role_permissions_save(
    role_id: int,
    payload: RolePermissionsSaveRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("rbac:role:write")),
) -> ApiResponse:
    stmt = select(Role).where(Role.id == role_id).options(selectinload(Role.permissions)).limit(1)
    role = db.execute(stmt).scalars().first()
    if role is None:
        raise AppError(code="NOT_FOUND", msg="角色不存在", status_code=404)

    before = {"permissionCodes": [p.code for p in role.permissions if p.is_active]}
    target_codes = [c for c in payload.permissionCodes if c]
    if target_codes:
        perms = db.execute(select(Permission).where(Permission.code.in_(list(dict.fromkeys(target_codes))))).scalars().all()
        found = {p.code for p in perms}
        missing = [c for c in target_codes if c not in found]
        if missing:
            raise AppError(code="PERMISSION_NOT_FOUND", msg=f"权限码不存在：{','.join(missing)}", status_code=400)
        role.permissions = perms
    else:
        role.permissions = []

    after = {"permissionCodes": [p.code for p in role.permissions if p.is_active]}
    create_audit_log(
        db,
        entity_type="rbac_role",
        entity_id=str(role_id),
        action="RBAC_ROLE_PERMISSIONS_SAVE",
        actor=current_user,
        before=before,
        after=after,
        reason="保存角色接口权限",
        source="api",
    )
    db.add(role)
    db.commit()
    return ApiResponse(data={"roleId": role_id, "permissionCodes": after["permissionCodes"]})


@router.post("/rbac/roles/{role_id}/data-scope", response_model=ApiResponse)
def rbac_role_data_scope_save(
    role_id: int,
    payload: RoleDataScopeSaveRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("rbac:role:write")),
) -> ApiResponse:
    stmt = select(Role).where(Role.id == role_id).options(selectinload(Role.departments)).limit(1)
    role = db.execute(stmt).scalars().first()
    if role is None:
        raise AppError(code="NOT_FOUND", msg="角色不存在", status_code=404)

    try:
        scope_enum = RoleDataScope(payload.scope)
    except Exception as e:
        raise AppError(code="DATA_SCOPE_INVALID", msg="数据范围不合法", status_code=400) from e

    before = {"scope": role.data_scope.value if hasattr(role.data_scope, "value") else str(role.data_scope), "deptIds": [d.id for d in role.departments]}

    role.data_scope = scope_enum
    dept_ids: list[int] = []
    if scope_enum == RoleDataScope.CUSTOM:
        dept_ids = [int(x) for x in payload.deptIds if isinstance(x, int) or (isinstance(x, str) and x.isdigit())]
        if dept_ids:
            depts = db.execute(select(Department).where(Department.id.in_(dept_ids))).scalars().all()
            found = {d.id for d in depts}
            missing = [str(i) for i in dept_ids if i not in found]
            if missing:
                raise AppError(code="DEPARTMENT_NOT_FOUND", msg=f"部门不存在：{','.join(missing)}", status_code=400)
            role.departments = depts
        else:
            role.departments = []
    else:
        role.departments = []

    after = {"scope": scope_enum.value, "deptIds": [d.id for d in role.departments]}
    create_audit_log(
        db,
        entity_type="rbac_role",
        entity_id=str(role_id),
        action="RBAC_ROLE_DATA_SCOPE_SAVE",
        actor=current_user,
        before=before,
        after=after,
        reason="保存角色数据范围",
        source="api",
    )
    db.add(role)
    db.commit()
    return ApiResponse(data={"roleId": role_id, "dataScope": after})


@router.get("/rbac/permissions/dict", response_model=ApiResponse)
def rbac_permission_dict(
    includeInactive: bool = False,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("rbac:permission:read")),
) -> ApiResponse:
    stmt = select(Permission).order_by(Permission.code.asc())
    if not includeInactive:
        stmt = stmt.where(Permission.is_active.is_(True))
    rows = db.execute(stmt).scalars().all()
    permissions = [{"code": p.code, "name": p.name, "isActive": bool(p.is_active)} for p in rows]
    return ApiResponse(data={"permissions": permissions})


@router.get("/rbac/menus/tree", response_model=ApiResponse)
def rbac_menu_tree(
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("rbac:menu:read")),
) -> ApiResponse:
    rows = db.execute(select(Menu).where(Menu.is_active.is_(True)).order_by(Menu.order_no.asc(), Menu.id.asc())).scalars().all()
    nodes: dict[str, dict] = {}
    for m in rows:
        nodes[m.id] = {
            "id": m.id,
            "name": m.name,
            "path": m.path,
            "permissionCode": m.permission_code,
            "parentId": m.parent_id,
            "orderNo": m.order_no,
            "children": [],
        }
    roots: list[dict] = []
    for node in nodes.values():
        pid = node.get("parentId")
        if pid and pid in nodes:
            nodes[pid]["children"].append(node)
        else:
            roots.append(node)
    def _sort_and_cleanup(items: list[dict]) -> list[dict]:
        items.sort(key=lambda x: (int(x.get("orderNo") or 0), str(x.get("id") or "")))
        for it in items:
            it["children"] = _sort_and_cleanup(it.get("children") or [])
            it.pop("parentId", None)
            it.pop("orderNo", None)
        return items

    tree = _sort_and_cleanup(roots)
    return ApiResponse(data={"tree": tree})


@router.get("/rbac/users/{user_id}/roles", response_model=ApiResponse)
def rbac_user_roles_get(
    user_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("rbac:user:read")),
) -> ApiResponse:
    stmt = select(User).where(User.id == user_id).options(selectinload(User.roles)).limit(1)
    user = db.execute(stmt).scalars().first()
    if user is None:
        raise AppError(code="NOT_FOUND", msg="用户不存在", status_code=404)
    return ApiResponse(data={"userId": user.id, "roleIds": [r.id for r in user.roles if r.is_active]})


@router.post("/rbac/users/{user_id}/roles", response_model=ApiResponse)
def rbac_user_roles_save(
    user_id: int,
    payload: UserRoleAssignRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("rbac:user:write")),
) -> ApiResponse:
    stmt = select(User).where(User.id == user_id).options(selectinload(User.roles)).limit(1)
    user = db.execute(stmt).scalars().first()
    if user is None:
        raise AppError(code="NOT_FOUND", msg="用户不存在", status_code=404)

    before = {"roleIds": [r.id for r in user.roles]}
    role_ids = [int(x) for x in payload.roleIds if isinstance(x, int) or (isinstance(x, str) and x.isdigit())]
    if role_ids:
        roles = db.execute(select(Role).where(Role.id.in_(role_ids))).scalars().all()
        found = {r.id for r in roles}
        missing = [str(i) for i in role_ids if i not in found]
        if missing:
            raise AppError(code="ROLE_NOT_FOUND", msg=f"角色不存在：{','.join(missing)}", status_code=400)
        user.roles = roles
    else:
        user.roles = []

    after = {"roleIds": [r.id for r in user.roles]}
    create_audit_log(
        db,
        entity_type="rbac_user",
        entity_id=str(user_id),
        action="RBAC_USER_ROLES_SAVE",
        actor=current_user,
        before=before,
        after=after,
        reason="保存用户角色分配",
        source="api",
    )
    db.add(user)
    db.commit()
    return ApiResponse(data={"userId": user.id, "roleIds": after["roleIds"]})

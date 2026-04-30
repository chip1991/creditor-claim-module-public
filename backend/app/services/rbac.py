from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy import Select, distinct, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.rbac import Menu, Permission, Role, RoleDataScope, role_department, role_menu, role_permission, user_role


def get_user_permission_codes(db: Session, user_id: int) -> set[str]:
    stmt = (
        select(distinct(Permission.code))
        .select_from(Permission)
        .join(role_permission, role_permission.c.permission_id == Permission.id)
        .join(Role, Role.id == role_permission.c.role_id)
        .join(user_role, user_role.c.role_id == Role.id)
        .where(user_role.c.user_id == user_id, Permission.is_active.is_(True), Role.is_active.is_(True))
    )
    rows = db.execute(stmt).scalars().all()
    return set(rows)


def get_user_menu_ids(db: Session, user_id: int) -> set[str]:
    stmt = (
        select(distinct(Menu.id))
        .select_from(Menu)
        .join(role_menu, role_menu.c.menu_id == Menu.id)
        .join(Role, Role.id == role_menu.c.role_id)
        .join(user_role, user_role.c.role_id == Role.id)
        .where(user_role.c.user_id == user_id, Menu.is_active.is_(True), Role.is_active.is_(True))
    )
    rows = db.execute(stmt).scalars().all()
    return {str(x) for x in rows if x is not None}


def get_role_permission_matrix(db: Session) -> dict[str, set[str]]:
    stmt = (
        select(Role.key, Permission.code)
        .select_from(Role)
        .join(role_permission, role_permission.c.role_id == Role.id)
        .join(Permission, Permission.id == role_permission.c.permission_id)
        .where(Role.is_active.is_(True), Permission.is_active.is_(True))
    )
    matrix: dict[str, set[str]] = {}
    for role_key, permission_code in db.execute(stmt).all():
        matrix.setdefault(role_key, set()).add(permission_code)
    return matrix


def get_user_role_scopes(db: Session, user_id: int) -> list[tuple[int, RoleDataScope]]:
    stmt = (
        select(Role.id, Role.data_scope)
        .select_from(Role)
        .join(user_role, user_role.c.role_id == Role.id)
        .where(user_role.c.user_id == user_id, Role.is_active.is_(True))
    )
    return list(db.execute(stmt).all())


def get_custom_dept_ids_for_roles(db: Session, role_ids: Iterable[int]) -> set[int]:
    role_ids_list = list(role_ids)
    if not role_ids_list:
        return set()
    stmt = select(distinct(role_department.c.department_id)).where(role_department.c.role_id.in_(role_ids_list))
    return set(db.execute(stmt).scalars().all())


def resolve_effective_scope(role_scopes: Iterable[RoleDataScope]) -> RoleDataScope:
    scopes = set(role_scopes)
    if RoleDataScope.ALL in scopes:
        return RoleDataScope.ALL
    if RoleDataScope.CUSTOM in scopes:
        return RoleDataScope.CUSTOM
    if RoleDataScope.DEPT_AND_CHILD in scopes:
        return RoleDataScope.DEPT_AND_CHILD
    if RoleDataScope.DEPT in scopes:
        return RoleDataScope.DEPT
    return RoleDataScope.SELF


def ensure_permissions(user_permission_codes: set[str], required: Iterable[str], *, mode: str = "all") -> None:
    required_set = {c for c in required if c}
    if not required_set:
        return
    if mode == "any":
        ok = any(code in user_permission_codes for code in required_set)
    elif mode == "all":
        ok = all(code in user_permission_codes for code in required_set)
    else:
        raise AppError(code="PERMISSION_MODE_INVALID", msg="权限校验模式不合法", status_code=500)
    if not ok:
        raise AppError(code="FORBIDDEN", msg="无权限访问", status_code=403)


def apply_permission_filter(stmt: Select, required_permissions: Iterable[str], *, column) -> Select:
    required_set = {c for c in required_permissions if c}
    if not required_set:
        return stmt
    return stmt.where(column.in_(list(required_set)))

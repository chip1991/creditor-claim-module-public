from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import ColumnElement, Select, literal, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.rbac import Department, RoleDataScope


@dataclass(frozen=True)
class DataScopeProfile:
    scope: RoleDataScope
    user_id: int
    dept_id: int | None
    custom_dept_ids: frozenset[int]


def get_descendant_dept_ids(db: Session, root_dept_id: int) -> set[int]:
    base = select(Department.id).where(Department.id == root_dept_id).cte(name="dept_tree", recursive=True)
    recursive = select(Department.id).where(Department.parent_id == base.c.id)
    dept_tree = base.union_all(recursive)
    stmt = select(dept_tree.c.id)
    return set(db.execute(stmt).scalars().all())


def resolve_allowed_dept_ids(db: Session, profile: DataScopeProfile) -> set[int] | None:
    if profile.scope == RoleDataScope.ALL:
        return None
    if profile.scope == RoleDataScope.DEPT:
        return {profile.dept_id} if profile.dept_id is not None else set()
    if profile.scope == RoleDataScope.DEPT_AND_CHILD:
        return get_descendant_dept_ids(db, profile.dept_id) if profile.dept_id is not None else set()
    if profile.scope == RoleDataScope.CUSTOM:
        return set(profile.custom_dept_ids)
    return set()


def apply_data_scope(
    db: Session,
    stmt: Select,
    profile: DataScopeProfile,
    *,
    dept_column: ColumnElement[int] | None = None,
    user_column: ColumnElement[int] | None = None,
) -> Select:
    if profile.scope == RoleDataScope.ALL:
        return stmt

    if profile.scope == RoleDataScope.SELF:
        if user_column is None:
            raise AppError(code="DATA_SCOPE_ERROR", msg="数据范围过滤缺少 user_column", status_code=500)
        return stmt.where(user_column == profile.user_id)

    if dept_column is None:
        raise AppError(code="DATA_SCOPE_ERROR", msg="数据范围过滤缺少 dept_column", status_code=500)

    if profile.scope == RoleDataScope.DEPT:
        if profile.dept_id is None:
            return stmt.where(literal(False))
        return stmt.where(dept_column == profile.dept_id)

    if profile.scope == RoleDataScope.DEPT_AND_CHILD:
        if profile.dept_id is None:
            return stmt.where(literal(False))
        dept_ids = get_descendant_dept_ids(db, profile.dept_id)
        return stmt.where(dept_column.in_(list(dept_ids)))

    if profile.scope == RoleDataScope.CUSTOM:
        if not profile.custom_dept_ids:
            return stmt.where(literal(False))
        return stmt.where(dept_column.in_(list(profile.custom_dept_ids)))

    raise AppError(code="DATA_SCOPE_ERROR", msg="数据范围类型不支持", status_code=500)

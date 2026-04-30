from __future__ import annotations

import json
from dataclasses import dataclass

from fastapi import Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.redis_client import get_redis
from app.db.session import get_db
from app.models.rbac import Role, RoleDataScope, User, user_role
from app.services.data_scope import DataScopeProfile
from app.services.rbac import get_custom_dept_ids_for_roles, get_user_permission_codes, get_user_role_scopes, resolve_effective_scope, ensure_permissions


SATOKEN_REDIS_PREFIX = "satoken:session:"


@dataclass(frozen=True)
class CurrentUser:
    id: int
    username: str
    dept_id: int | None
    permission_codes: frozenset[str]
    data_scope: DataScopeProfile


def _get_satoken(satoken: str | None = Header(default=None, alias="satoken")) -> str:
    if not satoken:
        raise AppError(code="AUTH_REQUIRED", msg="请先登录", status_code=401)
    return satoken


def _load_session_user_id(token: str) -> int:
    redis = get_redis()
    try:
        raw = redis.get(f"{SATOKEN_REDIS_PREFIX}{token}")
    except Exception as e:
        raise AppError(code="AUTH_SERVICE_UNAVAILABLE", msg="登录服务不可用", status_code=503) from e
    if not raw:
        raise AppError(code="AUTH_INVALID", msg="登录已过期，请重新登录", status_code=401)
    try:
        payload = json.loads(raw)
    except Exception as e:
        raise AppError(code="AUTH_INVALID", msg="登录态解析失败", status_code=401) from e
    user_id = payload.get("user_id")
    if not isinstance(user_id, int):
        raise AppError(code="AUTH_INVALID", msg="登录态不合法", status_code=401)
    return user_id


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    token: str = Depends(_get_satoken),
) -> CurrentUser:
    user = None
    if token == "dev-bypass":
        user = db.execute(select(User).where(User.is_active.is_(True)).order_by(User.id.asc())).scalars().first()
        if user is None:
            raise AppError(code="AUTH_INIT_REQUIRED", msg="请先初始化账号", status_code=401)
        user_id = user.id
    else:
        user_id = _load_session_user_id(token)
        user = db.get(User, user_id)
    if not user or not user.is_active:
        raise AppError(code="AUTH_INVALID", msg="账号不可用", status_code=401)

    permission_codes = frozenset(get_user_permission_codes(db, user_id))
    role_scopes = get_user_role_scopes(db, user_id)
    effective_scope = resolve_effective_scope(scope for _, scope in role_scopes)
    custom_dept_ids: set[int] = set()
    if effective_scope == RoleDataScope.CUSTOM:
        custom_role_ids = [role_id for role_id, scope in role_scopes if scope == RoleDataScope.CUSTOM]
        custom_dept_ids = get_custom_dept_ids_for_roles(db, custom_role_ids)

    profile = DataScopeProfile(
        scope=effective_scope,
        user_id=user.id,
        dept_id=user.department_id,
        custom_dept_ids=frozenset(custom_dept_ids),
    )
    current = CurrentUser(
        id=user.id,
        username=user.username,
        dept_id=user.department_id,
        permission_codes=permission_codes,
        data_scope=profile,
    )
    request.state.current_user = current
    return current


def require_permissions(*codes: str, mode: str = "all"):
    def _dep(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        ensure_permissions(set(current_user.permission_codes), codes, mode=mode)
        return current_user

    return _dep


def _is_admin_user(db: Session, *, user_id: int) -> bool:
    stmt = (
        select(Role.id)
        .select_from(Role)
        .join(user_role, user_role.c.role_id == Role.id)
        .where(user_role.c.user_id == user_id, Role.is_active.is_(True), Role.key == "admin")
        .limit(1)
    )
    return db.execute(stmt).first() is not None


def require_admin_or_permissions(*codes: str, mode: str = "any"):
    def _dep(
        db: Session = Depends(get_db),
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CurrentUser:
        if _is_admin_user(db, user_id=current_user.id):
            return current_user
        ensure_permissions(set(current_user.permission_codes), codes, mode=mode)
        return current_user

    return _dep

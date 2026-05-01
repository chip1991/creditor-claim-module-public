from __future__ import annotations

import pytest
from sqlalchemy import select
from starlette.requests import Request

from app.core.auth import get_current_user
from app.core.errors import AppError
from app.models.rbac import Role, User


def _request() -> Request:
    return Request({"type": "http", "method": "GET", "path": "/", "headers": []})


def test_dev_bypass_prioritizes_active_admin_user(db):
    admin_role = db.execute(select(Role).where(Role.key == "admin")).scalars().one()
    seeded_user = db.execute(select(User).where(User.username == "admin")).scalars().one()
    seeded_user.roles = []
    db.add(seeded_user)

    normal_user = User(
        username="normal_user",
        password_hash="",
        is_active=True,
        department_id=seeded_user.department_id,
    )
    preferred_admin = User(
        username="preferred_admin",
        password_hash="",
        is_active=True,
        department_id=seeded_user.department_id,
    )
    db.add_all([normal_user, preferred_admin])
    db.flush()
    preferred_admin.roles.append(admin_role)
    db.commit()

    current = get_current_user(_request(), db=db, token="dev-bypass")
    assert current.id == preferred_admin.id
    assert current.username == "preferred_admin"


def test_dev_bypass_returns_chinese_error_when_no_active_admin(db):
    admin_role = db.execute(select(Role).where(Role.key == "admin")).scalars().one()
    all_users = db.execute(select(User)).scalars().all()
    for user in all_users:
        user.roles = [role for role in user.roles if role.id != admin_role.id]
        db.add(user)
    db.commit()

    with pytest.raises(AppError) as exc:
        get_current_user(_request(), db=db, token="dev-bypass")

    assert exc.value.code == "AUTH_INIT_REQUIRED"
    assert "未找到可用的管理员账号" in exc.value.msg

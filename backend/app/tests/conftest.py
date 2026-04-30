import os
import tempfile
from pathlib import Path

import pytest

_db_path = Path(tempfile.gettempdir()) / f"backend_test_{os.getpid()}.db"
os.environ.setdefault("DATABASE_URL", f"sqlite:////{str(_db_path).lstrip('/')}")

from sqlalchemy import select

from app.core.auth import CurrentUser
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import Department, Permission, Role, RoleDataScope, User
from app.services.data_scope import DataScopeProfile


@pytest.fixture(autouse=True)
def _disable_task_progress(monkeypatch):
    def _noop(*_args, **_kwargs):
        return None

    import app.services.analysis as analysis_service
    import app.services.data_center as data_center_service
    import app.tasks.progress as progress

    monkeypatch.setattr(progress, "update_task_progress", _noop)
    monkeypatch.setattr(data_center_service, "update_task_progress", _noop)
    monkeypatch.setattr(analysis_service, "update_task_progress", _noop)
    yield


@pytest.fixture()
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        depts = [
            "默认部门",
            "工程部",
            "保洁部",
            "客服部",
            "秩序部",
            "财务部",
            "项目管理部",
            "地产维保部",
        ]
        for name in depts:
            session.add(Department(name=name, parent_id=None, is_active=True))

        role = Role(name="系统管理员", key="admin", is_active=True, data_scope=RoleDataScope.ALL)
        session.add(role)
        user = User(username="admin", password_hash="", is_active=True)
        session.add(user)
        session.flush()
        user.department_id = session.execute(select(Department.id).where(Department.name == "默认部门")).scalar_one()
        user.roles.append(role)

        permission_codes = [
            "data:import",
            "data:read",
            "data:clean",
            "data:link",
            "data:export",
            "analysis:run",
            "analysis:read",
            "analysis:override",
            "analysis:rerun",
            "workorder:create",
            "workorder:read",
            "workorder:submit",
            "workorder:verify",
            "workorder:urge",
            "workorder:force_close",
            "dashboard:read",
            "report:read",
            "report:generate",
            "report:export",
            "report:delete",
            "report:config",
            "system:rules",
            "system:scheduler",
            "system:config",
        ]
        for code in permission_codes:
            session.add(Permission(code=code, name=code, is_active=True))
        session.flush()
        perms = session.execute(select(Permission)).scalars().all()
        role.permissions.extend(perms)
        session.commit()
        yield session


@pytest.fixture()
def actor(db):
    user = db.execute(select(User).where(User.username == "admin")).scalars().one()
    profile = DataScopeProfile(scope=RoleDataScope.ALL, user_id=user.id, dept_id=user.department_id, custom_dept_ids=frozenset())
    return CurrentUser(id=user.id, username=user.username, dept_id=user.department_id, permission_codes=frozenset(), data_scope=profile)

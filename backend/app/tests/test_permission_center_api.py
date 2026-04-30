from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.auth import CurrentUser, get_current_user
from app.db.session import get_db
from app.main import create_app
from app.models.rbac import Department, Menu, Role, RoleDataScope, User
from app.services.data_scope import DataScopeProfile


def _current_user(user: User, *, permission_codes: set[str]) -> CurrentUser:
    profile = DataScopeProfile(
        scope=RoleDataScope.ALL,
        user_id=user.id,
        dept_id=user.department_id,
        custom_dept_ids=frozenset(),
    )
    return CurrentUser(
        id=user.id,
        username=user.username,
        dept_id=user.department_id,
        permission_codes=frozenset(permission_codes),
        menu_ids=frozenset(),
        data_scope=profile,
    )


def _client(db, current: CurrentUser) -> TestClient:
    app = create_app()

    def _get_db():
        yield db

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_current_user] = lambda: current
    return TestClient(app)


def test_iam_org_page_pagination_and_permission(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    viewer = User(username="viewer", password_hash="", is_active=True, department_id=dept_id)
    db.add(viewer)
    db.commit()
    db.refresh(viewer)

    resp = _client(db, _current_user(viewer, permission_codes=set())).get("/api/iam/org/page?page=1&size=2")
    assert resp.status_code == 403
    assert resp.json()["code"] == "FORBIDDEN"

    resp = _client(db, _current_user(viewer, permission_codes={"iam:org:read"})).get("/api/iam/org/page?page=2&size=3")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["code"] == "OK"
    assert payload["data"]["total"] >= 1
    assert len(payload["data"]["records"]) == 3


def test_rbac_role_three_piece_save_and_read(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    operator = User(username="operator", password_hash="", is_active=True, department_id=dept_id)
    db.add(operator)

    role = Role(name="测试角色", key="test_role", is_active=True, data_scope=RoleDataScope.SELF)
    db.add(role)

    m1 = Menu(id="m1", name="系统管理", path="/system", permission_code=None, parent_id=None, order_no=1, is_active=True)
    m2 = Menu(id="m2", name="权限中心", path="/system/permission-center", permission_code=None, parent_id="m1", order_no=2, is_active=True)
    db.add_all([m1, m2])
    db.commit()
    db.refresh(operator)
    db.refresh(role)

    resp = _client(db, _current_user(operator, permission_codes=set())).get(f"/api/rbac/roles/{role.id}")
    assert resp.status_code == 403
    assert resp.json()["code"] == "FORBIDDEN"

    client = _client(db, _current_user(operator, permission_codes={"rbac:role:read", "rbac:role:write"}))
    resp = client.post(f"/api/rbac/roles/{role.id}/menus", json={"menuIds": ["m1", "m2"]})
    assert resp.status_code == 200
    assert resp.json()["data"]["menuIds"] == ["m1", "m2"]

    resp = client.post(f"/api/rbac/roles/{role.id}/permissions", json={"permissionCodes": ["iam:org:read", "iam:user:read"]})
    assert resp.status_code == 200
    assert set(resp.json()["data"]["permissionCodes"]) == {"iam:org:read", "iam:user:read"}

    resp = client.post(f"/api/rbac/roles/{role.id}/data-scope", json={"scope": "CUSTOM", "deptIds": [1, 2]})
    assert resp.status_code == 200
    assert resp.json()["data"]["dataScope"]["scope"] == "CUSTOM"

    resp = client.get(f"/api/rbac/roles/{role.id}")
    assert resp.status_code == 200
    detail = resp.json()["data"]
    assert detail["menuIds"] == ["m1", "m2"]
    assert set(detail["permissionCodes"]) == {"iam:org:read", "iam:user:read"}
    assert detail["dataScope"]["scope"] == "CUSTOM"
    assert set(detail["dataScope"]["deptIds"]) == {1, 2}


def test_rbac_user_assign_roles(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    operator = User(username="operator2", password_hash="", is_active=True, department_id=dept_id)
    target = User(username="target", password_hash="", is_active=True, department_id=dept_id)
    db.add_all([operator, target])

    r1 = Role(name="角色A", key="role_a", is_active=True, data_scope=RoleDataScope.SELF)
    r2 = Role(name="角色B", key="role_b", is_active=True, data_scope=RoleDataScope.SELF)
    db.add_all([r1, r2])
    db.commit()
    db.refresh(operator)
    db.refresh(target)
    db.refresh(r1)
    db.refresh(r2)

    no_write = _client(db, _current_user(operator, permission_codes={"rbac:user:read"}))
    resp = no_write.post(f"/api/rbac/users/{target.id}/roles", json={"roleIds": [r1.id]})
    assert resp.status_code == 403
    assert resp.json()["code"] == "FORBIDDEN"

    client = _client(db, _current_user(operator, permission_codes={"rbac:user:read", "rbac:user:write"}))
    resp = client.post(f"/api/rbac/users/{target.id}/roles", json={"roleIds": [r1.id, r2.id]})
    assert resp.status_code == 200
    assert set(resp.json()["data"]["roleIds"]) == {r1.id, r2.id}

    resp = client.get(f"/api/rbac/users/{target.id}/roles")
    assert resp.status_code == 200
    assert set(resp.json()["data"]["roleIds"]) == {r1.id, r2.id}


def test_v1_compat_get_and_410(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    operator = User(username="operator3", password_hash="", is_active=True, department_id=dept_id)
    db.add(operator)
    db.commit()
    db.refresh(operator)

    client = _client(db, _current_user(operator, permission_codes={"iam:org:read", "iam:role:read", "iam:user:read"}))

    resp = client.get("/api/v1/orgs?page=1&size=2")
    assert resp.status_code == 200
    assert resp.json()["code"] == "OK"

    resp = client.post("/api/v1/orgs")
    assert resp.status_code == 410
    assert resp.json()["code"] == "MIGRATED"

    resp = client.get("/api/v1/roles?page=1&size=2")
    assert resp.status_code == 200
    assert resp.json()["code"] == "OK"

    resp = client.post("/api/v1/roles")
    assert resp.status_code == 410
    assert resp.json()["code"] == "MIGRATED"

    resp = client.get("/api/v1/users?page=1&size=2")
    assert resp.status_code == 200
    assert resp.json()["code"] == "OK"

    resp = client.post("/api/v1/users")
    assert resp.status_code == 410
    assert resp.json()["code"] == "MIGRATED"

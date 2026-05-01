from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.auth import CurrentUser, get_current_user
from app.db.session import get_db
from app.main import create_app
from app.models.audit import AuditLog
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


def _audit_actions(db, *, entity_type: str, entity_id: str) -> list[str]:
    stmt = (
        select(AuditLog.action)
        .where(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.id.asc())
    )
    return list(db.execute(stmt).scalars().all())


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


def test_iam_org_crud_delete_block_and_audit(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    operator = User(username="org_admin", password_hash="", is_active=True, department_id=dept_id)
    db.add(operator)
    db.commit()
    db.refresh(operator)

    client = _client(db, _current_user(operator, permission_codes={"iam:org:read", "iam:org:write"}))

    resp = client.post("/api/iam/org", json={"name": "总部", "isActive": True})
    assert resp.status_code == 200
    root_org_id = resp.json()["data"]["id"]

    resp = client.post("/api/iam/org", json={"name": "总部-客服", "parentId": root_org_id, "isActive": True})
    assert resp.status_code == 200
    child_org_id = resp.json()["data"]["id"]

    resp = client.delete(f"/api/iam/org/{root_org_id}")
    assert resp.status_code == 400
    assert resp.json()["msg"] == "当前组织下仍有下级组织，删除前请先清理"

    child_user = User(username="org_user", password_hash="", is_active=True, department_id=child_org_id)
    db.add(child_user)
    db.commit()

    resp = client.delete(f"/api/iam/org/{child_org_id}")
    assert resp.status_code == 400
    assert resp.json()["msg"] == "当前组织下仍有关联用户，删除前请先清理"

    child_user.department_id = None
    db.add(child_user)
    db.commit()

    resp = client.put(f"/api/iam/org/{child_org_id}", json={"name": "总部-客服一部", "isActive": False})
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "总部-客服一部"
    assert resp.json()["data"]["isActive"] is False

    resp = client.get(f"/api/iam/org/{child_org_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["parentId"] == root_org_id

    resp = client.delete(f"/api/iam/org/{child_org_id}")
    assert resp.status_code == 200
    assert resp.json()["data"] == {"id": child_org_id, "deleted": True}

    resp = client.delete(f"/api/iam/org/{root_org_id}")
    assert resp.status_code == 200
    assert resp.json()["data"] == {"id": root_org_id, "deleted": True}

    assert _audit_actions(db, entity_type="iam_org", entity_id=str(child_org_id)) == [
        "IAM_ORG_CREATE",
        "IAM_ORG_UPDATE",
        "IAM_ORG_DELETE",
    ]
    assert _audit_actions(db, entity_type="iam_org", entity_id=str(root_org_id)) == [
        "IAM_ORG_CREATE",
        "IAM_ORG_DELETE",
    ]


def test_iam_role_crud_delete_block_and_audit(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    operator = User(username="role_admin", password_hash="", is_active=True, department_id=dept_id)
    assignee = User(username="role_user", password_hash="", is_active=True, department_id=dept_id)
    db.add_all([operator, assignee])
    db.commit()
    db.refresh(operator)
    db.refresh(assignee)

    client = _client(db, _current_user(operator, permission_codes={"iam:role:read", "iam:role:write"}))

    resp = client.post("/api/iam/roles", json={"name": "值班主管", "code": "duty_manager", "desc": "值班角色", "isActive": True})
    assert resp.status_code == 200
    role_id = resp.json()["data"]["id"]
    assert resp.json()["data"]["desc"] == "值班角色"
    assert resp.json()["data"]["code"] == "duty_manager"

    role = db.get(Role, role_id)
    assignee.roles.append(role)
    db.add(assignee)
    db.commit()

    resp = client.delete(f"/api/iam/roles/{role_id}")
    assert resp.status_code == 400
    assert resp.json()["msg"] == "当前角色已分配给用户，删除前请先解除关联"

    assignee.roles = []
    db.add(assignee)
    db.commit()

    resp = client.put(f"/api/iam/roles/{role_id}", json={"name": "值班经理", "code": "duty_lead", "desc": "更新后描述", "isActive": False})
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "值班经理"
    assert resp.json()["data"]["key"] == "duty_lead"
    assert resp.json()["data"]["desc"] == "更新后描述"
    assert resp.json()["data"]["isActive"] is False

    resp = client.get(f"/api/iam/roles/{role_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["users"] == 0

    resp = client.delete(f"/api/iam/roles/{role_id}")
    assert resp.status_code == 200
    assert resp.json()["data"] == {"id": role_id, "deleted": True}

    assert _audit_actions(db, entity_type="iam_role", entity_id=str(role_id)) == [
        "IAM_ROLE_CREATE",
        "IAM_ROLE_UPDATE",
        "IAM_ROLE_DELETE",
    ]


def test_iam_user_crud_and_audit(db):
    dept_ids = list(db.execute(select(Department.id).order_by(Department.id.asc()).limit(2)).scalars().all())
    operator = User(username="user_admin", password_hash="", is_active=True, department_id=dept_ids[0])
    role = Role(name="巡检员", key="inspector", is_active=True, data_scope=RoleDataScope.SELF)
    db.add_all([operator, role])
    db.commit()
    db.refresh(operator)
    db.refresh(role)

    client = _client(db, _current_user(operator, permission_codes={"iam:user:read", "iam:user:write", "rbac:user:read"}))

    resp = client.post(
        "/api/iam/users",
        json={"name": "张三", "empId": "EMP001", "phone": "13800000001", "orgId": dept_ids[0], "isActive": True},
    )
    assert resp.status_code == 200
    user_id = resp.json()["data"]["id"]
    assert resp.json()["data"]["name"] == "张三"
    assert resp.json()["data"]["empId"] == "EMP001"
    assert resp.json()["data"]["orgId"] == dept_ids[0]
    assert resp.json()["data"]["status"] == "启用"

    created_user = db.get(User, user_id)
    created_user.roles.append(role)
    db.add(created_user)
    db.commit()

    resp = client.get(f"/api/iam/users/{user_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["roleIds"] == [role.id]

    resp = client.put(
        f"/api/iam/users/{user_id}",
        json={"name": "李四", "empId": "EMP002", "phone": "13800000002", "orgId": dept_ids[1], "isActive": False},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "李四"
    assert resp.json()["data"]["empId"] == "EMP002"
    assert resp.json()["data"]["phone"] == "13800000002"
    assert resp.json()["data"]["orgId"] == dept_ids[1]
    assert resp.json()["data"]["status"] == "禁用"

    resp = client.get("/api/iam/users/page?page=1&size=20&keyword=EMP002")
    assert resp.status_code == 200
    assert any(item["id"] == user_id for item in resp.json()["data"]["records"])

    resp = client.delete(f"/api/iam/users/{user_id}")
    assert resp.status_code == 200
    assert resp.json()["data"] == {"id": user_id, "deleted": True}

    assert _audit_actions(db, entity_type="iam_user", entity_id=str(user_id)) == [
        "IAM_USER_CREATE",
        "IAM_USER_UPDATE",
        "IAM_USER_DELETE",
    ]

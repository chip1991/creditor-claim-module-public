from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.auth import CurrentUser, get_current_user
from app.db.session import get_db
from app.main import create_app
from app.models.rbac import Department, RoleDataScope, User
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


def test_root_cause_kb_crud_and_page(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    operator = User(username="kb_operator", password_hash="", is_active=True, department_id=dept_id)
    db.add(operator)
    db.commit()
    db.refresh(operator)

    client = _client(db, _current_user(operator, permission_codes={"system:config"}))

    created = client.post(
        "/api/kb/root-causes",
        json={
            "categoryLv1": "设施设备类",
            "categoryLv2": "电梯故障",
            "level": "surface",
            "content": "电梯故障",
            "keywords": "电梯,停梯",
            "isEnabled": True,
        },
    )
    assert created.status_code == 200
    kb_id = created.json()["data"]["id"]

    page = client.get("/api/kb/root-causes/page?page=1&size=20").json()["data"]
    assert page["total"] >= 1
    assert any(x["id"] == kb_id for x in page["records"])

    updated = client.put(f"/api/kb/root-causes/{kb_id}", json={"keywords": "电梯,困人"})
    assert updated.status_code == 200

    toggled = client.post(f"/api/kb/root-causes/{kb_id}/toggle", json={"isEnabled": False})
    assert toggled.status_code == 200

    resp = client.get("/api/kb/root-causes/page?page=1&size=20&enabled=true").json()["data"]
    assert all(x["isEnabled"] for x in resp["records"])

    deleted = client.delete(f"/api/kb/root-causes/{kb_id}")
    assert deleted.status_code == 200


def test_root_cause_kb_import_and_export(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    operator = User(username="kb_operator2", password_hash="", is_active=True, department_id=dept_id)
    db.add(operator)
    db.commit()
    db.refresh(operator)

    client = _client(db, _current_user(operator, permission_codes={"system:config"}))

    csv_content = "一级分类,二级分类,根因层级,根因内容,关键词,启用\n设施设备类,电梯故障,表层问题,电梯故障,电梯,启用\n"
    resp = client.post(
        "/api/kb/root-causes/import",
        files={"file": ("import.csv", csv_content.encode("utf-8-sig"), "text/csv")},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["success"] >= 1

    exported = client.get("/api/kb/root-causes/export")
    assert exported.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in exported.headers.get("content-type", "")


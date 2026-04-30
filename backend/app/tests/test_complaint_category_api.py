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


def test_complaint_category_crud_and_page(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    operator = User(username="cat_operator", password_hash="", is_active=True, department_id=dept_id)
    db.add(operator)
    db.commit()
    db.refresh(operator)

    client = _client(db, _current_user(operator, permission_codes={"system:config"}))

    lv1 = client.post("/api/kb/categories/lv1", json={"name": "设施设备类", "orderNo": 1, "isEnabled": True}).json()["data"]["id"]
    lv2 = client.post(
        "/api/kb/categories/lv2",
        json={"lv1Id": lv1, "name": "电梯故障", "orderNo": 1, "isEnabled": True, "keywords": "电梯,停梯"},
    ).json()["data"]["id"]

    lv1_list = client.get("/api/kb/categories/lv1/list").json()["data"]["records"]
    assert any(x["id"] == lv1 for x in lv1_list)

    page = client.get(f"/api/kb/categories/lv2/page?page=1&size=20&lv1Id={lv1}").json()["data"]
    assert page["total"] >= 1
    assert any(x["id"] == lv2 for x in page["records"])

    upd = client.put(f"/api/kb/categories/lv2/{lv2}", json={"keywords": "电梯,困人"})
    assert upd.status_code == 200

    tog = client.post(f"/api/kb/categories/lv2/{lv2}/toggle", json={"isEnabled": False})
    assert tog.status_code == 200

    enabled_page = client.get(f"/api/kb/categories/lv2/page?page=1&size=20&lv1Id={lv1}&enabled=true").json()["data"]
    assert all(x["isEnabled"] for x in enabled_page["records"])

    delete = client.delete(f"/api/kb/categories/lv2/{lv2}")
    assert delete.status_code == 200


def test_complaint_category_import_and_export(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    operator = User(username="cat_operator2", password_hash="", is_active=True, department_id=dept_id)
    db.add(operator)
    db.commit()
    db.refresh(operator)

    client = _client(db, _current_user(operator, permission_codes={"system:config"}))

    csv_content = "一级分类,二级分类,关键词,启用,排序\n设施设备类,电梯故障,电梯,启用,1\n"
    resp = client.post(
        "/api/kb/categories/import",
        files={"file": ("import.csv", csv_content.encode("utf-8-sig"), "text/csv")},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["success"] >= 1

    exported = client.get("/api/kb/categories/export")
    assert exported.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in exported.headers.get("content-type", "")


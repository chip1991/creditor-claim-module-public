from __future__ import annotations

import os
from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy import select

from app.core.auth import CurrentUser
from app.db.session import get_db
from app.main import create_app
from app.models.raw_data import RawDataBatch, RawDataRow, RawIssue
from app.models.rbac import Department, RoleDataScope, User
from app.services.data_scope import DataScopeProfile


def _current_user(user: User, *, permission_codes: set[str]) -> CurrentUser:
    profile = DataScopeProfile(scope=RoleDataScope.ALL, user_id=user.id, dept_id=user.department_id, custom_dept_ids=frozenset())
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

    from app.core.auth import get_current_user

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_current_user] = lambda: current
    return TestClient(app)


def _make_excel_bytes() -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "考核项目"
    ws.append(
        [
            "地区公司",
            "项目名称",
            "楼栋号码",
            "是否过保",
            "姓名",
            "电话号码",
            "性别",
            "任务批次",
            "分配人",
            "分配时间",
            "拨打时间",
            "状态",
            "业务结果",
            "是否接通",
            "是否有效",
            "非常住可用",
            "首轮评价",
            "居住情况",
            "400类",
            "一般问题",
            "管家服务",
            "安保服务",
            "环境卫生",
            "公区维修",
            "调查备注问题",
        ]
    )
    ws.append(
        [
            "四川公司",
            "自贡恒大未来城",
            "10栋-2单元-101",
            "2022.2.26",
            "钟某",
            "13900000000",
            "女",
            "25第三季度（个）1",
            "梁嘉文",
            "2025-07-03 16:40:58",
            "2025-07-03 16:41:03",
            "已完成",
            "已配合调查",
            "是",
            "有",
            "不可",
            "一般",
            "常住",
            "400类A",
            "地库卫生很差\n配套不完善",
            "一般",
            "不满意",
            "满意",
            "未评价",
            "备注1\n备注2",
        ]
    )
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_raw_import_and_query(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    user = User(username="raw_admin", password_hash="", is_active=True, department_id=dept_id)
    db.add(user)
    db.commit()
    db.refresh(user)

    cli = _client(db, _current_user(user, permission_codes={"data:import", "data:read"}))
    content = _make_excel_bytes()
    resp = cli.post(
        "/api/raw/batches/import",
        files={
            "file": (
                "raw.xlsx",
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
        data={"sheetName": "考核项目"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["code"] == "OK"
    assert payload["data"]["batchId"]

    batch_id = payload["data"]["batchId"]
    page = cli.get("/api/raw/batches/page?page=1&size=10").json()
    assert page["code"] == "OK"
    assert page["data"]["total"] >= 1
    batch_records = page["data"]["records"]
    assert any(r["id"] == batch_id for r in batch_records)
    current_batch = next(r for r in batch_records if r["id"] == batch_id)
    assert current_batch["status"] in {"RUNNING", "SUCCESS", "FAILURE"}

    rows = cli.get(f"/api/raw/batches/{batch_id}/rows/page?page=1&size=10").json()
    assert rows["code"] == "OK"
    assert rows["data"]["total"] >= 1
    first_row_id = rows["data"]["records"][0]["id"]

    detail = cli.get(f"/api/raw/rows/{first_row_id}").json()
    assert detail["code"] == "OK"
    assert detail["data"]["batchId"] == batch_id

    issues = cli.get("/api/raw/issues/page?page=1&size=20").json()
    assert issues["code"] == "OK"
    assert issues["data"]["total"] >= 1
    assert all(r.get("sourceField") == "一般问题" for r in issues["data"]["records"])

    score = cli.get(f"/api/raw/score/summary?batchId={batch_id}&groupBy=regionCompany").json()
    assert score["code"] == "OK"
    assert len(score["data"]["records"]) >= 1


def test_raw_import_no_permission_returns_403(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    user = User(username="raw_import_no_perm", password_hash="", is_active=True, department_id=dept_id)
    db.add(user)
    db.commit()
    db.refresh(user)

    cli = _client(db, _current_user(user, permission_codes={"data:read"}))
    content = _make_excel_bytes()
    resp = cli.post(
        "/api/raw/batches/import",
        files={
            "file": (
                "raw.xlsx",
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
        data={"sheetName": "考核项目"},
    )
    assert resp.status_code == 403
    payload = resp.json()
    assert payload["code"] == "FORBIDDEN"
    assert payload["msg"] == "无权限访问"


def test_raw_batch_delete_no_permission(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    user = User(username="raw_no_perm", password_hash="", is_active=True, department_id=dept_id)
    db.add(user)
    db.commit()
    db.refresh(user)

    cli = _client(db, _current_user(user, permission_codes={"data:read"}))
    resp = cli.delete("/api/raw/batches/not_exist")
    assert resp.status_code == 403


def test_raw_batch_delete_cascade(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    user = User(username="raw_del", password_hash="", is_active=True, department_id=dept_id)
    db.add(user)
    db.commit()
    db.refresh(user)

    cli = _client(db, _current_user(user, permission_codes={"data:import", "data:read", "data:delete"}))
    content = _make_excel_bytes()
    resp = cli.post(
        "/api/raw/batches/import",
        files={
            "file": (
                "raw.xlsx",
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
        data={"sheetName": "考核项目"},
    )
    assert resp.status_code == 200
    batch_id = resp.json()["data"]["batchId"]

    batch = db.get(RawDataBatch, batch_id)
    assert batch is not None
    file_path = batch.file_path
    assert os.path.isfile(file_path)

    assert db.execute(select(RawDataRow.id).where(RawDataRow.batch_id == batch_id).limit(1)).first() is not None
    assert db.execute(select(RawIssue.id).where(RawIssue.batch_id == batch_id).limit(1)).first() is not None

    del_resp = cli.delete(f"/api/raw/batches/{batch_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["code"] == "OK"

    assert db.get(RawDataBatch, batch_id) is None
    assert db.execute(select(RawDataRow.id).where(RawDataRow.batch_id == batch_id).limit(1)).first() is None
    assert db.execute(select(RawIssue.id).where(RawIssue.batch_id == batch_id).limit(1)).first() is None
    assert not os.path.exists(file_path)

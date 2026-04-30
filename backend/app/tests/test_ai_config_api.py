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


def test_ai_llm_default_and_set_default(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    operator = User(username="ai_operator", password_hash="", is_active=True, department_id=dept_id)
    db.add(operator)
    db.commit()
    db.refresh(operator)

    client = _client(db, _current_user(operator, permission_codes={"ai:llm:read", "ai:llm:write"}))

    r1 = client.post(
        "/api/ai/llms",
        json={"provider": "openai", "model": "gpt-4o-mini", "baseUrl": "https://example.com/v1", "apiKey": "sk-test"},
    )
    assert r1.status_code == 200
    llm1 = r1.json()["data"]["id"]

    r2 = client.post(
        "/api/ai/llms",
        json={"provider": "openai", "model": "gpt-4o", "baseUrl": "https://example.com/v1", "apiKey": "sk-test2"},
    )
    assert r2.status_code == 200
    llm2 = r2.json()["data"]["id"]

    page = client.get("/api/ai/llms/page?page=1&size=20").json()["data"]["records"]
    defaults = [x["id"] for x in page if x.get("isDefault")]
    assert defaults == [llm1]

    resp = client.post(f"/api/ai/llms/{llm2}/set-default")
    assert resp.status_code == 200

    page = client.get("/api/ai/llms/page?page=1&size=20").json()["data"]["records"]
    defaults = [x["id"] for x in page if x.get("isDefault")]
    assert defaults == [llm2]


def test_ai_llm_delete_guarded_by_agent_binding(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    operator = User(username="ai_operator2", password_hash="", is_active=True, department_id=dept_id)
    db.add(operator)
    db.commit()
    db.refresh(operator)

    client = _client(
        db,
        _current_user(
            operator,
            permission_codes={"ai:llm:read", "ai:llm:write", "ai:agent:read", "ai:agent:write"},
        ),
    )

    llm = client.post(
        "/api/ai/llms",
        json={"provider": "openai", "model": "gpt-4o-mini", "baseUrl": "https://example.com/v1", "apiKey": "sk-test"},
    ).json()["data"]["id"]

    agent = client.post("/api/ai/agents", json={"name": "测试智能体", "code": "test_agent", "llmId": llm, "isEnabled": True}).json()[
        "data"
    ]["id"]

    resp = client.delete(f"/api/ai/llms/{llm}")
    assert resp.status_code == 400
    assert resp.json()["code"] == "LLM_IN_USE"

    resp = client.delete(f"/api/ai/agents/{agent}")
    assert resp.status_code == 200

    resp = client.delete(f"/api/ai/llms/{llm}")
    assert resp.status_code == 200


def test_ai_agent_versions_publish_and_rollback(db):
    dept_id = db.execute(select(Department.id).order_by(Department.id.asc()).limit(1)).scalar_one()
    operator = User(username="ai_operator3", password_hash="", is_active=True, department_id=dept_id)
    db.add(operator)
    db.commit()
    db.refresh(operator)

    client = _client(
        db,
        _current_user(
            operator,
            permission_codes={"ai:agent:read", "ai:agent:write", "ai:agent:publish"},
        ),
    )

    agent = client.post("/api/ai/agents", json={"name": "版本智能体", "code": "ver_agent", "isEnabled": True}).json()["data"]["id"]

    v1 = client.post(
        f"/api/ai/agents/{agent}/versions/draft/save",
        json={"config": {"systemPrompt": "你是一个测试智能体", "params": {"temperature": 0.1}}},
    ).json()["data"]["versionId"]

    resp = client.post(f"/api/ai/agents/{agent}/versions/publish", json={"versionId": v1})
    assert resp.status_code == 200

    current = client.get(f"/api/ai/agents/{agent}/versions/current").json()["data"]["version"]
    assert current["id"] == v1

    v2 = client.post(
        f"/api/ai/agents/{agent}/versions/draft/save",
        json={"config": {"systemPrompt": "第二版", "params": {"temperature": 0.2}}},
    ).json()["data"]["versionId"]

    resp = client.post(f"/api/ai/agents/{agent}/versions/publish", json={"versionId": v2})
    assert resp.status_code == 200

    current = client.get(f"/api/ai/agents/{agent}/versions/current").json()["data"]["version"]
    assert current["id"] == v2

    resp = client.post(f"/api/ai/agents/{agent}/versions/{v1}/rollback")
    assert resp.status_code == 200

    current = client.get(f"/api/ai/agents/{agent}/versions/current").json()["data"]["version"]
    assert current["id"] == v1


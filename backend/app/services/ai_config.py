from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import httpx
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.core.errors import AppError
from app.models.ai_config import AiAgent, AiAgentVersion, AiLlm
from app.services.audit import create_audit_log


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _mask_api_key(v: str | None) -> str | None:
    if not v:
        return None
    if len(v) <= 8:
        return "*" * len(v)
    return f"{v[:4]}****{v[-4:]}"


def llm_page(*, db: Session, page: int, size: int, keyword: str | None) -> dict:
    page = max(1, int(page or 1))
    size = max(1, min(200, int(size or 20)))

    stmt = select(AiLlm)
    if keyword:
        kw = f"%{keyword.strip()}%"
        stmt = stmt.where(or_(AiLlm.provider.ilike(kw), AiLlm.model.ilike(kw), AiLlm.base_url.ilike(kw)))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int(db.execute(count_stmt).scalar() or 0)
    rows = (
        db.execute(
            stmt.order_by(AiLlm.is_default.desc(), AiLlm.updated_at.desc()).offset((page - 1) * size).limit(size)
        )
        .scalars()
        .all()
    )

    records = [
        {
            "id": r.id,
            "provider": r.provider,
            "model": r.model,
            "baseUrl": r.base_url,
            "isDefault": bool(r.is_default),
            "isEnabled": bool(r.is_enabled),
            "lastTestAt": r.last_test_at,
            "lastTestStatus": r.last_test_status,
            "lastError": r.last_error,
            "createdAt": r.created_at,
            "updatedAt": r.updated_at,
            "apiKeyMasked": _mask_api_key(r.api_key),
        }
        for r in rows
    ]
    return {"total": total, "records": records, "items": records}


def llm_create(*, db: Session, payload: dict, actor: CurrentUser) -> AiLlm:
    row = AiLlm(
        id=uuid4().hex,
        provider=str(payload.get("provider") or "").strip(),
        model=str(payload.get("model") or "").strip(),
        base_url=(str(payload.get("baseUrl")).strip() if payload.get("baseUrl") else None),
        api_key=(str(payload.get("apiKey")).strip() if payload.get("apiKey") else None),
        is_enabled=bool(payload.get("isEnabled", True)),
        is_default=False,
    )
    if not row.provider or not row.model:
        raise AppError(code="VALIDATION_ERROR", msg="provider 与 model 为必填", status_code=422)

    existed_default = db.execute(select(func.count()).select_from(AiLlm).where(AiLlm.is_default.is_(True))).scalar()
    if int(existed_default or 0) <= 0:
        row.is_default = True

    db.add(row)
    create_audit_log(
        db,
        entity_type="ai_llm",
        entity_id=row.id,
        action="AI_LLM_CREATE",
        actor=actor,
        after={"provider": row.provider, "model": row.model, "baseUrl": row.base_url, "isEnabled": row.is_enabled, "isDefault": row.is_default},
        reason="创建大模型配置",
    )
    return row


def llm_update(*, db: Session, llm_id: str, payload: dict, actor: CurrentUser) -> AiLlm:
    row = db.get(AiLlm, llm_id)
    if not row:
        raise AppError(code="NOT_FOUND", msg="大模型配置不存在", status_code=404)

    before = {"provider": row.provider, "model": row.model, "baseUrl": row.base_url, "isEnabled": row.is_enabled, "isDefault": row.is_default}

    if payload.get("provider") is not None:
        row.provider = str(payload.get("provider") or "").strip()
    if payload.get("model") is not None:
        row.model = str(payload.get("model") or "").strip()
    if payload.get("baseUrl") is not None:
        row.base_url = str(payload.get("baseUrl") or "").strip() or None
    if payload.get("isEnabled") is not None:
        row.is_enabled = bool(payload.get("isEnabled"))

    api_key = payload.get("apiKey")
    if isinstance(api_key, str) and api_key.strip():
        row.api_key = api_key.strip()

    if not row.provider or not row.model:
        raise AppError(code="VALIDATION_ERROR", msg="provider 与 model 为必填", status_code=422)

    create_audit_log(
        db,
        entity_type="ai_llm",
        entity_id=row.id,
        action="AI_LLM_UPDATE",
        actor=actor,
        before=before,
        after={"provider": row.provider, "model": row.model, "baseUrl": row.base_url, "isEnabled": row.is_enabled, "isDefault": row.is_default},
        reason="更新大模型配置",
    )
    return row


def llm_toggle(*, db: Session, llm_id: str, is_enabled: bool, actor: CurrentUser) -> AiLlm:
    row = db.get(AiLlm, llm_id)
    if not row:
        raise AppError(code="NOT_FOUND", msg="大模型配置不存在", status_code=404)
    before = {"isEnabled": bool(row.is_enabled)}
    row.is_enabled = bool(is_enabled)
    create_audit_log(
        db,
        entity_type="ai_llm",
        entity_id=row.id,
        action="AI_LLM_TOGGLE",
        actor=actor,
        before=before,
        after={"isEnabled": row.is_enabled},
        reason="启停大模型配置",
    )
    return row


def llm_set_default(*, db: Session, llm_id: str, actor: CurrentUser) -> AiLlm:
    row = db.get(AiLlm, llm_id)
    if not row:
        raise AppError(code="NOT_FOUND", msg="大模型配置不存在", status_code=404)

    db.execute(update(AiLlm).values(is_default=False))
    row.is_default = True

    create_audit_log(
        db,
        entity_type="ai_llm",
        entity_id=row.id,
        action="AI_LLM_SET_DEFAULT",
        actor=actor,
        after={"isDefault": True},
        reason="设为默认大模型",
    )
    return row


async def llm_test(*, db: Session, llm_id: str, actor: CurrentUser) -> dict:
    row = db.get(AiLlm, llm_id)
    if not row:
        raise AppError(code="NOT_FOUND", msg="大模型配置不存在", status_code=404)
    if not row.base_url:
        raise AppError(code="INVALID_CONFIG", msg="Base URL 为空，无法测试", status_code=400)
    if not row.api_key:
        raise AppError(code="INVALID_CONFIG", msg="API Key 为空，无法测试", status_code=400)

    base = row.base_url.rstrip("/")
    url = f"{base}/models"
    tested_at = _now()

    success = False
    error: str | None = None
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {row.api_key}"})
            if resp.status_code >= 200 and resp.status_code < 300:
                success = True
            else:
                error = f"HTTP {resp.status_code}: {resp.text[:500]}"
    except Exception as e:
        error = str(e)

    row.last_test_at = tested_at
    row.last_test_status = "success" if success else "failed"
    row.last_error = None if success else (error or "unknown error")

    create_audit_log(
        db,
        entity_type="ai_llm",
        entity_id=row.id,
        action="AI_LLM_TEST",
        actor=actor,
        after={"success": success, "error": row.last_error, "testedAt": tested_at.isoformat()},
        reason="测试大模型连通性",
    )

    return {"llmId": row.id, "success": success, "error": row.last_error, "testedAt": tested_at}


def llm_delete(*, db: Session, llm_id: str, actor: CurrentUser) -> None:
    row = db.get(AiLlm, llm_id)
    if not row:
        return

    used = db.execute(select(func.count()).select_from(AiAgent).where(AiAgent.llm_id == llm_id)).scalar()
    if int(used or 0) > 0:
        raise AppError(code="LLM_IN_USE", msg="该大模型已被智能体绑定，无法删除", status_code=400)

    before = {"provider": row.provider, "model": row.model, "baseUrl": row.base_url, "isDefault": row.is_default, "isEnabled": row.is_enabled}
    db.delete(row)
    create_audit_log(
        db,
        entity_type="ai_llm",
        entity_id=llm_id,
        action="AI_LLM_DELETE",
        actor=actor,
        before=before,
        reason="删除大模型配置",
    )


def agent_page(*, db: Session, page: int, size: int, keyword: str | None) -> dict:
    page = max(1, int(page or 1))
    size = max(1, min(200, int(size or 20)))

    stmt = select(AiAgent)
    if keyword:
        kw = f"%{keyword.strip()}%"
        stmt = stmt.where(or_(AiAgent.name.ilike(kw), AiAgent.code.ilike(kw)))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int(db.execute(count_stmt).scalar() or 0)
    rows = (
        db.execute(stmt.order_by(AiAgent.updated_at.desc()).offset((page - 1) * size).limit(size)).scalars().all()
    )

    records = [
        {
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "llmId": r.llm_id,
            "isEnabled": bool(r.is_enabled),
            "currentVersionId": r.current_version_id,
            "createdAt": r.created_at,
            "updatedAt": r.updated_at,
        }
        for r in rows
    ]
    return {"total": total, "records": records, "items": records}


def agent_create(*, db: Session, payload: dict, actor: CurrentUser) -> AiAgent:
    name = str(payload.get("name") or "").strip()
    code = str(payload.get("code") or "").strip()
    llm_id = payload.get("llmId")
    is_enabled = bool(payload.get("isEnabled", True))

    if not name or not code:
        raise AppError(code="VALIDATION_ERROR", msg="name 与 code 为必填", status_code=422)

    existed = db.execute(select(func.count()).select_from(AiAgent).where(AiAgent.code == code)).scalar()
    if int(existed or 0) > 0:
        raise AppError(code="DUPLICATE_CODE", msg="智能体标识已存在", status_code=400)

    row = AiAgent(id=uuid4().hex, name=name, code=code, llm_id=str(llm_id) if llm_id else None, is_enabled=is_enabled)
    db.add(row)
    create_audit_log(
        db,
        entity_type="ai_agent",
        entity_id=row.id,
        action="AI_AGENT_CREATE",
        actor=actor,
        after={"name": row.name, "code": row.code, "llmId": row.llm_id, "isEnabled": row.is_enabled},
        reason="创建智能体",
    )
    return row


def agent_update(*, db: Session, agent_id: str, payload: dict, actor: CurrentUser) -> AiAgent:
    row = db.get(AiAgent, agent_id)
    if not row:
        raise AppError(code="NOT_FOUND", msg="智能体不存在", status_code=404)

    before = {"name": row.name, "code": row.code, "llmId": row.llm_id, "isEnabled": row.is_enabled}

    if payload.get("name") is not None:
        row.name = str(payload.get("name") or "").strip()
    if payload.get("code") is not None:
        new_code = str(payload.get("code") or "").strip()
        if new_code and new_code != row.code:
            existed = db.execute(select(func.count()).select_from(AiAgent).where(AiAgent.code == new_code)).scalar()
            if int(existed or 0) > 0:
                raise AppError(code="DUPLICATE_CODE", msg="智能体标识已存在", status_code=400)
            row.code = new_code
    if payload.get("llmId") is not None:
        row.llm_id = str(payload.get("llmId") or "").strip() or None
    if payload.get("isEnabled") is not None:
        row.is_enabled = bool(payload.get("isEnabled"))

    if not row.name or not row.code:
        raise AppError(code="VALIDATION_ERROR", msg="name 与 code 为必填", status_code=422)

    create_audit_log(
        db,
        entity_type="ai_agent",
        entity_id=row.id,
        action="AI_AGENT_UPDATE",
        actor=actor,
        before=before,
        after={"name": row.name, "code": row.code, "llmId": row.llm_id, "isEnabled": row.is_enabled},
        reason="更新智能体",
    )
    return row


def agent_toggle(*, db: Session, agent_id: str, is_enabled: bool, actor: CurrentUser) -> AiAgent:
    row = db.get(AiAgent, agent_id)
    if not row:
        raise AppError(code="NOT_FOUND", msg="智能体不存在", status_code=404)
    before = {"isEnabled": bool(row.is_enabled)}
    row.is_enabled = bool(is_enabled)
    create_audit_log(
        db,
        entity_type="ai_agent",
        entity_id=row.id,
        action="AI_AGENT_TOGGLE",
        actor=actor,
        before=before,
        after={"isEnabled": row.is_enabled},
        reason="启停智能体",
    )
    return row


def agent_delete(*, db: Session, agent_id: str, actor: CurrentUser) -> None:
    row = db.get(AiAgent, agent_id)
    if not row:
        return
    before = {"name": row.name, "code": row.code, "llmId": row.llm_id}
    db.delete(row)
    create_audit_log(
        db,
        entity_type="ai_agent",
        entity_id=agent_id,
        action="AI_AGENT_DELETE",
        actor=actor,
        before=before,
        reason="删除智能体",
    )


def agent_versions_list(*, db: Session, agent_id: str) -> dict:
    rows = (
        db.execute(
            select(AiAgentVersion)
            .where(AiAgentVersion.agent_id == agent_id)
            .order_by(AiAgentVersion.created_at.desc())
        )
        .scalars()
        .all()
    )
    items = [
        {"id": r.id, "status": r.status, "createdAt": r.created_at, "publishedAt": r.published_at}
        for r in rows
    ]
    return {"agentId": agent_id, "total": len(items), "records": items, "items": items}


def agent_current_version(*, db: Session, agent_id: str) -> dict:
    agent = db.get(AiAgent, agent_id)
    if not agent:
        raise AppError(code="NOT_FOUND", msg="智能体不存在", status_code=404)
    if not agent.current_version_id:
        return {"agentId": agent_id, "version": None}
    ver = db.get(AiAgentVersion, agent.current_version_id)
    if not ver:
        return {"agentId": agent_id, "version": None}
    return {
        "agentId": agent_id,
        "version": {"id": ver.id, "status": ver.status, "config": ver.config, "createdAt": ver.created_at, "publishedAt": ver.published_at},
    }


def agent_draft_save(*, db: Session, agent_id: str, config: dict, actor: CurrentUser) -> AiAgentVersion:
    agent = db.get(AiAgent, agent_id)
    if not agent:
        raise AppError(code="NOT_FOUND", msg="智能体不存在", status_code=404)

    ver = AiAgentVersion(id=uuid4().hex, agent_id=agent_id, status="draft", config=config)
    db.add(ver)
    create_audit_log(
        db,
        entity_type="ai_agent_version",
        entity_id=ver.id,
        action="AI_AGENT_DRAFT_SAVE",
        actor=actor,
        after={"agentId": agent_id, "versionId": ver.id},
        reason="保存智能体草稿版本",
    )
    return ver


def agent_publish(*, db: Session, agent_id: str, version_id: str, actor: CurrentUser) -> AiAgentVersion:
    agent = db.get(AiAgent, agent_id)
    if not agent:
        raise AppError(code="NOT_FOUND", msg="智能体不存在", status_code=404)
    ver = db.get(AiAgentVersion, version_id)
    if not ver or ver.agent_id != agent_id:
        raise AppError(code="NOT_FOUND", msg="版本不存在", status_code=404)

    before = {"currentVersionId": agent.current_version_id}
    ver.status = "published"
    ver.published_at = _now()
    agent.current_version_id = ver.id

    create_audit_log(
        db,
        entity_type="ai_agent",
        entity_id=agent_id,
        action="AI_AGENT_PUBLISH",
        actor=actor,
        before=before,
        after={"currentVersionId": agent.current_version_id, "versionId": ver.id},
        reason="发布智能体版本",
    )
    return ver


def agent_rollback(*, db: Session, agent_id: str, version_id: str, actor: CurrentUser) -> AiAgentVersion:
    agent = db.get(AiAgent, agent_id)
    if not agent:
        raise AppError(code="NOT_FOUND", msg="智能体不存在", status_code=404)
    ver = db.get(AiAgentVersion, version_id)
    if not ver or ver.agent_id != agent_id:
        raise AppError(code="NOT_FOUND", msg="版本不存在", status_code=404)

    before = {"currentVersionId": agent.current_version_id}
    agent.current_version_id = ver.id
    create_audit_log(
        db,
        entity_type="ai_agent",
        entity_id=agent_id,
        action="AI_AGENT_ROLLBACK",
        actor=actor,
        before=before,
        after={"currentVersionId": agent.current_version_id, "versionId": ver.id},
        reason="回滚智能体版本",
    )
    return ver

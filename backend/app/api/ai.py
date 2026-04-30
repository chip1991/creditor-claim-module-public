from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_admin_or_permissions
from app.core.errors import AppError
from app.db.session import get_db
from app.schemas.ai import AgentPublishRequest
from app.schemas.ai import (
    AgentCreateRequest,
    AgentDraftSaveRequest,
    AgentIdResponse,
    AgentPageResponse,
    AgentTestRunRequest,
    AgentToggleRequest,
    AgentUpdateRequest,
    LlmCreateRequest,
    LlmIdResponse,
    LlmPageResponse,
    LlmToggleRequest,
    LlmUpdateRequest,
    AgentCurrentVersionApiResponse,
    AgentDraftSaveApiResponse,
    AgentIdApiResponse,
    AgentPageApiResponse,
    AgentPublishApiResponse,
    AgentRollbackApiResponse,
    AgentTestRunApiResponse,
    AgentVersionListApiResponse,
    LlmIdApiResponse,
    LlmPageApiResponse,
    LlmTestApiResponse,
)
from app.services.ai_config import (
    agent_create,
    agent_current_version,
    agent_delete,
    agent_draft_save,
    agent_page,
    agent_publish,
    agent_rollback,
    agent_toggle,
    agent_update,
    agent_versions_list,
    llm_create,
    llm_delete,
    llm_page,
    llm_set_default,
    llm_test,
    llm_toggle,
    llm_update,
)


router = APIRouter()


@router.get("/ai/llms/page", response_model=LlmPageApiResponse)
def ai_llm_page(
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:llm:read")),
) -> LlmPageApiResponse:
    data = llm_page(db=db, page=page, size=size, keyword=keyword)
    return LlmPageApiResponse(data=LlmPageResponse(**data))


@router.post("/ai/llms", response_model=LlmIdApiResponse)
def ai_llm_create(
    payload: LlmCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:llm:write")),
) -> LlmIdApiResponse:
    row = llm_create(db=db, payload=payload.model_dump(), actor=current_user)
    db.commit()
    return LlmIdApiResponse(data=LlmIdResponse(id=row.id))


@router.put("/ai/llms/{llm_id}", response_model=LlmIdApiResponse)
def ai_llm_update(
    llm_id: str,
    payload: LlmUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:llm:write")),
) -> LlmIdApiResponse:
    row = llm_update(db=db, llm_id=llm_id, payload=payload.model_dump(exclude_unset=True), actor=current_user)
    db.commit()
    return LlmIdApiResponse(data=LlmIdResponse(id=row.id))


@router.post("/ai/llms/{llm_id}/set-default", response_model=LlmIdApiResponse)
def ai_llm_set_default(
    llm_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:llm:write")),
) -> LlmIdApiResponse:
    row = llm_set_default(db=db, llm_id=llm_id, actor=current_user)
    db.commit()
    return LlmIdApiResponse(data=LlmIdResponse(id=row.id))


@router.post("/ai/llms/{llm_id}/toggle", response_model=LlmIdApiResponse)
def ai_llm_toggle(
    llm_id: str,
    payload: LlmToggleRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:llm:write")),
) -> LlmIdApiResponse:
    row = llm_toggle(db=db, llm_id=llm_id, is_enabled=payload.isEnabled, actor=current_user)
    db.commit()
    return LlmIdApiResponse(data=LlmIdResponse(id=row.id))


@router.delete("/ai/llms/{llm_id}", response_model=LlmIdApiResponse)
def ai_llm_delete(
    llm_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:llm:write")),
) -> LlmIdApiResponse:
    llm_delete(db=db, llm_id=llm_id, actor=current_user)
    db.commit()
    return LlmIdApiResponse(data=LlmIdResponse(id=llm_id))


@router.post("/ai/llms/{llm_id}/test", response_model=LlmTestApiResponse)
async def ai_llm_test(
    llm_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:llm:write")),
) -> LlmTestApiResponse:
    data = await llm_test(db=db, llm_id=llm_id, actor=current_user)
    db.commit()
    return LlmTestApiResponse(data=data)


@router.get("/ai/agents/page", response_model=AgentPageApiResponse)
def ai_agent_page(
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:agent:read")),
) -> AgentPageApiResponse:
    data = agent_page(db=db, page=page, size=size, keyword=keyword)
    return AgentPageApiResponse(data=AgentPageResponse(**data))


@router.post("/ai/agents", response_model=AgentIdApiResponse)
def ai_agent_create(
    payload: AgentCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:agent:write")),
) -> AgentIdApiResponse:
    row = agent_create(db=db, payload=payload.model_dump(), actor=current_user)
    db.commit()
    return AgentIdApiResponse(data=AgentIdResponse(id=row.id))


@router.put("/ai/agents/{agent_id}", response_model=AgentIdApiResponse)
def ai_agent_update(
    agent_id: str,
    payload: AgentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:agent:write")),
) -> AgentIdApiResponse:
    row = agent_update(db=db, agent_id=agent_id, payload=payload.model_dump(exclude_unset=True), actor=current_user)
    db.commit()
    return AgentIdApiResponse(data=AgentIdResponse(id=row.id))


@router.post("/ai/agents/{agent_id}/toggle", response_model=AgentIdApiResponse)
def ai_agent_toggle(
    agent_id: str,
    payload: AgentToggleRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:agent:write")),
) -> AgentIdApiResponse:
    row = agent_toggle(db=db, agent_id=agent_id, is_enabled=payload.isEnabled, actor=current_user)
    db.commit()
    return AgentIdApiResponse(data=AgentIdResponse(id=row.id))


@router.delete("/ai/agents/{agent_id}", response_model=AgentIdApiResponse)
def ai_agent_delete(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:agent:write")),
) -> AgentIdApiResponse:
    agent_delete(db=db, agent_id=agent_id, actor=current_user)
    db.commit()
    return AgentIdApiResponse(data=AgentIdResponse(id=agent_id))


@router.post("/ai/agents/{agent_id}/test-run", response_model=AgentTestRunApiResponse)
def ai_agent_test_run(
    agent_id: str,
    _: AgentTestRunRequest,
    __: CurrentUser = Depends(require_admin_or_permissions("ai:agent:write")),
) -> AgentTestRunApiResponse:
    raise AppError(code="NOT_IMPLEMENTED", msg="暂未接入推理执行器，无法测试运行", status_code=501)


@router.post("/ai/agents/{agent_id}/versions/draft/save", response_model=AgentDraftSaveApiResponse)
def ai_agent_version_draft_save(
    agent_id: str,
    payload: AgentDraftSaveRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:agent:write")),
) -> AgentDraftSaveApiResponse:
    ver = agent_draft_save(db=db, agent_id=agent_id, config=payload.config, actor=current_user)
    db.commit()
    return AgentDraftSaveApiResponse(data={"agentId": agent_id, "versionId": ver.id})


@router.post("/ai/agents/{agent_id}/versions/publish", response_model=AgentPublishApiResponse)
def ai_agent_version_publish(
    agent_id: str,
    payload: AgentPublishRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:agent:publish")),
) -> AgentPublishApiResponse:
    ver = agent_publish(db=db, agent_id=agent_id, version_id=payload.versionId, actor=current_user)
    db.commit()
    return AgentPublishApiResponse(data={"agentId": agent_id, "versionId": ver.id})


@router.get("/ai/agents/{agent_id}/versions", response_model=AgentVersionListApiResponse)
def ai_agent_version_list(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:agent:read")),
) -> AgentVersionListApiResponse:
    data = agent_versions_list(db=db, agent_id=agent_id)
    return AgentVersionListApiResponse(data=data)


@router.post("/ai/agents/{agent_id}/versions/{version_id}/rollback", response_model=AgentRollbackApiResponse)
def ai_agent_version_rollback(
    agent_id: str,
    version_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:agent:publish")),
) -> AgentRollbackApiResponse:
    ver = agent_rollback(db=db, agent_id=agent_id, version_id=version_id, actor=current_user)
    db.commit()
    return AgentRollbackApiResponse(data={"agentId": agent_id, "versionId": ver.id})


@router.get("/ai/agents/{agent_id}/versions/current", response_model=AgentCurrentVersionApiResponse)
def ai_agent_version_current(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_permissions("ai:agent:read")),
) -> AgentCurrentVersionApiResponse:
    data = agent_current_version(db=db, agent_id=agent_id)
    return AgentCurrentVersionApiResponse(data=data)

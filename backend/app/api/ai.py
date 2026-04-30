from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, require_admin_or_permissions
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


router = APIRouter()


@router.get("/ai/llms/page", response_model=LlmPageApiResponse)
def ai_llm_page(
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    _: CurrentUser = Depends(require_admin_or_permissions("ai:llm:read")),
) -> LlmPageApiResponse:
    data = LlmPageResponse(total=0, records=[], items=[]).model_dump()
    return LlmPageApiResponse(data=data)


@router.post("/ai/llms", response_model=LlmIdApiResponse)
def ai_llm_create(
    _: LlmCreateRequest,
    __: CurrentUser = Depends(require_admin_or_permissions("ai:llm:write")),
) -> LlmIdApiResponse:
    data = LlmIdResponse(id=None).model_dump()
    return LlmIdApiResponse(data=data)


@router.put("/ai/llms/{llm_id}", response_model=LlmIdApiResponse)
def ai_llm_update(
    llm_id: str,
    _: LlmUpdateRequest,
    __: CurrentUser = Depends(require_admin_or_permissions("ai:llm:write")),
) -> LlmIdApiResponse:
    data = LlmIdResponse(id=llm_id).model_dump()
    return LlmIdApiResponse(data=data)


@router.post("/ai/llms/{llm_id}/set-default", response_model=LlmIdApiResponse)
def ai_llm_set_default(
    llm_id: str,
    _: CurrentUser = Depends(require_admin_or_permissions("ai:llm:write")),
) -> LlmIdApiResponse:
    data = LlmIdResponse(id=llm_id).model_dump()
    return LlmIdApiResponse(data=data)


@router.post("/ai/llms/{llm_id}/toggle", response_model=LlmIdApiResponse)
def ai_llm_toggle(
    llm_id: str,
    _: LlmToggleRequest,
    __: CurrentUser = Depends(require_admin_or_permissions("ai:llm:write")),
) -> LlmIdApiResponse:
    data = LlmIdResponse(id=llm_id).model_dump()
    return LlmIdApiResponse(data=data)


@router.delete("/ai/llms/{llm_id}", response_model=LlmIdApiResponse)
def ai_llm_delete(
    llm_id: str,
    _: CurrentUser = Depends(require_admin_or_permissions("ai:llm:write")),
) -> LlmIdApiResponse:
    data = LlmIdResponse(id=llm_id).model_dump()
    return LlmIdApiResponse(data=data)


@router.post("/ai/llms/{llm_id}/test", response_model=LlmTestApiResponse)
def ai_llm_test(
    llm_id: str,
    _: CurrentUser = Depends(require_admin_or_permissions("ai:llm:write")),
) -> LlmTestApiResponse:
    data = {"llmId": llm_id, "success": None, "error": None, "testedAt": None}
    return LlmTestApiResponse(data=data)


@router.get("/ai/agents/page", response_model=AgentPageApiResponse)
def ai_agent_page(
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    _: CurrentUser = Depends(require_admin_or_permissions("ai:agent:read")),
) -> AgentPageApiResponse:
    data = AgentPageResponse(total=0, records=[], items=[]).model_dump()
    return AgentPageApiResponse(data=data)


@router.post("/ai/agents", response_model=AgentIdApiResponse)
def ai_agent_create(
    _: AgentCreateRequest,
    __: CurrentUser = Depends(require_admin_or_permissions("ai:agent:write")),
) -> AgentIdApiResponse:
    data = AgentIdResponse(id=None).model_dump()
    return AgentIdApiResponse(data=data)


@router.put("/ai/agents/{agent_id}", response_model=AgentIdApiResponse)
def ai_agent_update(
    agent_id: str,
    _: AgentUpdateRequest,
    __: CurrentUser = Depends(require_admin_or_permissions("ai:agent:write")),
) -> AgentIdApiResponse:
    data = AgentIdResponse(id=agent_id).model_dump()
    return AgentIdApiResponse(data=data)


@router.post("/ai/agents/{agent_id}/toggle", response_model=AgentIdApiResponse)
def ai_agent_toggle(
    agent_id: str,
    _: AgentToggleRequest,
    __: CurrentUser = Depends(require_admin_or_permissions("ai:agent:write")),
) -> AgentIdApiResponse:
    data = AgentIdResponse(id=agent_id).model_dump()
    return AgentIdApiResponse(data=data)


@router.post("/ai/agents/{agent_id}/test-run", response_model=AgentTestRunApiResponse)
def ai_agent_test_run(
    agent_id: str,
    _: AgentTestRunRequest,
    __: CurrentUser = Depends(require_admin_or_permissions("ai:agent:write")),
) -> AgentTestRunApiResponse:
    data = {
        "agentId": agent_id,
        "output": None,
        "provider": None,
        "model": None,
        "versionId": None,
        "costMs": None,
    }
    return AgentTestRunApiResponse(data=data)


@router.post("/ai/agents/{agent_id}/versions/draft/save", response_model=AgentDraftSaveApiResponse)
def ai_agent_version_draft_save(
    agent_id: str,
    _: AgentDraftSaveRequest,
    __: CurrentUser = Depends(require_admin_or_permissions("ai:agent:write")),
) -> AgentDraftSaveApiResponse:
    data = {"agentId": agent_id, "versionId": None}
    return AgentDraftSaveApiResponse(data=data)


@router.post("/ai/agents/{agent_id}/versions/publish", response_model=AgentPublishApiResponse)
def ai_agent_version_publish(
    agent_id: str,
    _: CurrentUser = Depends(require_admin_or_permissions("ai:agent:publish")),
) -> AgentPublishApiResponse:
    data = {"agentId": agent_id, "versionId": None}
    return AgentPublishApiResponse(data=data)


@router.get("/ai/agents/{agent_id}/versions", response_model=AgentVersionListApiResponse)
def ai_agent_version_list(
    agent_id: str,
    _: CurrentUser = Depends(require_admin_or_permissions("ai:agent:read")),
) -> AgentVersionListApiResponse:
    data = {"agentId": agent_id, "total": 0, "records": [], "items": []}
    return AgentVersionListApiResponse(data=data)


@router.post("/ai/agents/{agent_id}/versions/{version_id}/rollback", response_model=AgentRollbackApiResponse)
def ai_agent_version_rollback(
    agent_id: str,
    version_id: str,
    _: CurrentUser = Depends(require_admin_or_permissions("ai:agent:publish")),
) -> AgentRollbackApiResponse:
    data = {"agentId": agent_id, "versionId": version_id}
    return AgentRollbackApiResponse(data=data)


@router.get("/ai/agents/{agent_id}/versions/current", response_model=AgentCurrentVersionApiResponse)
def ai_agent_version_current(
    agent_id: str,
    _: CurrentUser = Depends(require_admin_or_permissions("ai:agent:read")),
) -> AgentCurrentVersionApiResponse:
    data = {"agentId": agent_id, "version": None}
    return AgentCurrentVersionApiResponse(data=data)

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.core.response import ApiResponse


class AiPageQuery(BaseModel):
    page: int = 1
    size: int = 20
    keyword: str | None = None


class LlmListItem(BaseModel):
    id: str
    provider: str | None = None
    model: str | None = None
    baseUrl: str | None = None
    apiKeyMasked: str | None = None
    isDefault: bool | None = None
    isEnabled: bool | None = None
    lastTestAt: datetime | None = None
    lastTestStatus: str | None = None
    lastError: str | None = None
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class LlmPageResponse(BaseModel):
    total: int
    records: list[LlmListItem] = Field(default_factory=list)
    items: list[LlmListItem] = Field(default_factory=list)


class LlmCreateRequest(BaseModel):
    provider: str
    model: str
    baseUrl: str | None = None
    apiKey: str | None = None
    isEnabled: bool = True


class LlmUpdateRequest(BaseModel):
    provider: str | None = None
    model: str | None = None
    baseUrl: str | None = None
    apiKey: str | None = None
    isEnabled: bool | None = None


class LlmIdResponse(BaseModel):
    id: str | None = None


class LlmToggleRequest(BaseModel):
    isEnabled: bool


class LlmTestResponse(BaseModel):
    llmId: str | None = None
    success: bool | None = None
    error: str | None = None
    testedAt: datetime | None = None


class AgentListItem(BaseModel):
    id: str
    name: str | None = None
    code: str | None = None
    llmId: str | None = None
    isEnabled: bool | None = None
    currentVersionId: str | None = None
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class AgentPageResponse(BaseModel):
    total: int
    records: list[AgentListItem] = Field(default_factory=list)
    items: list[AgentListItem] = Field(default_factory=list)


class AgentCreateRequest(BaseModel):
    name: str
    code: str
    llmId: str | None = None
    isEnabled: bool = True


class AgentUpdateRequest(BaseModel):
    name: str | None = None
    code: str | None = None
    llmId: str | None = None
    isEnabled: bool | None = None


class AgentIdResponse(BaseModel):
    id: str | None = None


class AgentToggleRequest(BaseModel):
    isEnabled: bool


class AgentTestRunRequest(BaseModel):
    input: str


class AgentTestRunResponse(BaseModel):
    agentId: str | None = None
    output: str | None = None
    provider: str | None = None
    model: str | None = None
    versionId: str | None = None
    costMs: int | None = None


class AgentVersionListItem(BaseModel):
    id: str
    status: str | None = None
    createdAt: datetime | None = None
    publishedAt: datetime | None = None


class AgentVersionListResponse(BaseModel):
    agentId: str | None = None
    total: int
    records: list[AgentVersionListItem] = Field(default_factory=list)
    items: list[AgentVersionListItem] = Field(default_factory=list)


class AgentDraftSaveRequest(BaseModel):
    config: dict = Field(default_factory=dict)


class AgentPublishRequest(BaseModel):
    versionId: str


class AgentDraftSaveResponse(BaseModel):
    agentId: str | None = None
    versionId: str | None = None


class AgentPublishResponse(BaseModel):
    agentId: str | None = None
    versionId: str | None = None


class AgentRollbackResponse(BaseModel):
    agentId: str | None = None
    versionId: str | None = None


class AgentCurrentVersionResponse(BaseModel):
    agentId: str | None = None
    version: dict | None = None


class LlmPageApiResponse(ApiResponse):
    data: LlmPageResponse


class LlmIdApiResponse(ApiResponse):
    data: LlmIdResponse


class LlmTestApiResponse(ApiResponse):
    data: LlmTestResponse


class AgentPageApiResponse(ApiResponse):
    data: AgentPageResponse


class AgentIdApiResponse(ApiResponse):
    data: AgentIdResponse


class AgentTestRunApiResponse(ApiResponse):
    data: AgentTestRunResponse


class AgentDraftSaveApiResponse(ApiResponse):
    data: AgentDraftSaveResponse


class AgentPublishApiResponse(ApiResponse):
    data: AgentPublishResponse


class AgentVersionListApiResponse(ApiResponse):
    data: AgentVersionListResponse


class AgentRollbackApiResponse(ApiResponse):
    data: AgentRollbackResponse


class AgentCurrentVersionApiResponse(ApiResponse):
    data: AgentCurrentVersionResponse

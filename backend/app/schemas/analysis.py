from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AnalysisRunRequest(BaseModel):
    recordIds: list[str] | None = None
    workOrderNos: list[str] | None = None
    forceOverride: bool = False


class AnalysisRerunRequest(BaseModel):
    id: str
    forceOverride: bool = False


class AnalysisOverridePatch(BaseModel):
    categoryLv1: str | None = None
    categoryLv2: str | None = None
    rootCauseSurface: str | None = None
    rootCauseDirect: str | None = None
    rootCauseDeep: str | None = None
    department: str | None = None
    riskLevel: str | None = None
    isRepeatedComplaint: bool | None = None
    confidence: float | None = None
    evidenceSnippets: list[dict[str, str]] | None = None
    suggestedRectification: dict[str, str] | None = None


class AnalysisOverrideRequest(BaseModel):
    id: str
    patch: AnalysisOverridePatch
    reason: str | None = None


class AnalysisTaskResponse(BaseModel):
    taskId: str


class AnalysisPageItem(BaseModel):
    id: str
    workOrderNo: str | None = None
    ownerInfo: str | None = None
    complaintTime: str | None = None
    complaintSummary: str | None = None
    categoryLv1: str | None = None
    department: str | None = None
    riskLevel: str | None = None
    status: str | None = None


class AnalysisPageResponse(BaseModel):
    total: int
    records: list[AnalysisPageItem]


class AnalysisDetailResponse(BaseModel):
    id: str
    workOrderNo: str | None = None
    ownerInfo: str | None = None
    complaintTime: str | None = None
    agent: str | None = None
    categoryLv1: str | None = None
    categoryLv2: str | None = None
    rootCauseLv1: str | None = None
    rootCauseLv2: str | None = None
    rootCauseLv3: str | None = None
    department: str | None = None
    riskLevel: str | None = None
    isRepeatedComplaint: bool | None = None
    confidence: float | None = None
    evidenceSnippets: list[dict[str, str]] = Field(default_factory=list)
    modelVersion: str | None = None
    analyzedAt: datetime | None = None
    rawContent: str | None = None
    analysisResult: str | None = None
    suggestedRectification: dict[str, Any] | None = None
    manualOverridden: bool | None = None
    status: str | None = None


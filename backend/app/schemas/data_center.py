from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DataImportResponse(BaseModel):
    taskId: str


class DataRecordItem(BaseModel):
    id: str
    dataType: str
    status: str
    workOrderNo: str | None = None
    ownerInfo: str | None = None
    callInfo: str | None = None
    rawContent: str | None = None
    uploadTime: str | None = None
    operator: str | None = None


class DataPageResponse(BaseModel):
    total: int
    records: list[DataRecordItem]


class DataDetailResponse(BaseModel):
    id: str
    dataType: str
    status: str
    workOrderNo: str | None = None
    eventTime: datetime | None = None
    durationSec: int | None = None
    agentName: str | None = None
    ownerName: str | None = None
    buildingRoom: str | None = None
    phone: str | None = None
    satisfactionScore: int | None = None
    rawText: str
    cleanedText: str | None = None
    rawPayload: Any | None = None
    cleanedPayload: Any | None = None
    linkedRecordId: str | None = None
    createdAt: datetime
    updatedAt: datetime
    cleanLogs: list[dict[str, Any]] = Field(default_factory=list)
    linkLogs: list[dict[str, Any]] = Field(default_factory=list)


class DataCleanRequest(BaseModel):
    ids: list[str] | None = None


class DataLinkManualFix(BaseModel):
    recordId: str
    workOrderNo: str


class DataLinkRequest(BaseModel):
    ids: list[str] | None = None
    manualFix: DataLinkManualFix | None = None


class DataTaskResponse(BaseModel):
    taskId: str

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class WorkOrderCreateRequest(BaseModel):
    analysisId: str | None = None
    workOrderNo: str | None = None


class WorkOrderCreateResponse(BaseModel):
    id: str


class WorkOrderSubmitRequest(BaseModel):
    id: str
    result: str


class WorkOrderVerifyRequest(BaseModel):
    id: str
    passed: bool
    reason: str | None = None


class WorkOrderUrgeRequest(BaseModel):
    id: str
    message: str | None = None


class WorkOrderForceCloseRequest(BaseModel):
    id: str
    reason: str


class WorkOrderItem(BaseModel):
    id: str
    workOrderNo: str | None = None
    ownerInfo: str | None = None
    department: str | None = None
    assignee: str | None = None
    status: str
    deadline: str | None = None
    createTime: str | None = None


class WorkOrderPageResponse(BaseModel):
    total: int
    records: list[WorkOrderItem]


class WorkOrderActionLogItem(BaseModel):
    id: int
    action: str
    operator: str | None = None
    reason: str | None = None
    message: str | None = None
    before: Any | None = None
    after: Any | None = None
    payload: Any | None = None
    createdAt: datetime


class SatisfactionRecordItem(BaseModel):
    id: int
    sourceDataRecordId: str | None = None
    score: int | None = None
    result: str | None = None
    checkStatus: str
    thresholdMapping: Any | None = None
    ruleHits: Any | None = None
    checkedAt: datetime | None = None
    createdAt: datetime


class WorkOrderDetailResponse(BaseModel):
    id: str
    workOrderNo: str | None = None
    ownerInfo: str | None = None
    department: str | None = None
    assignee: str | None = None
    status: str
    rectificationStatus: str
    verifyStatus: str
    closeStatus: str
    warningStatus: str
    satisfactionCheckStatus: str
    deadline: datetime | None = None
    requirement: str | None = None
    result: str | None = None
    forcedClose: bool = False
    forcedReason: str | None = None
    urgeCount: int = 0
    lastUrgedAt: datetime | None = None
    createdAt: datetime
    updatedAt: datetime
    actionLogs: list[WorkOrderActionLogItem] = Field(default_factory=list)
    satisfactionRecords: list[SatisfactionRecordItem] = Field(default_factory=list)

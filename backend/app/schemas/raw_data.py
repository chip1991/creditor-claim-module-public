from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class RawBatchItem(BaseModel):
    id: str
    filename: str
    sheetName: str
    status: str
    totalRows: int
    successRows: int
    failedRows: int
    createdAt: datetime
    updatedAt: datetime
    operator: str | None = None


class RawBatchPageResponse(BaseModel):
    total: int
    records: list[RawBatchItem]


class RawBatchDetailResponse(BaseModel):
    id: str
    filename: str
    sheetName: str
    status: str
    totalRows: int
    successRows: int
    failedRows: int
    createdAt: datetime
    updatedAt: datetime
    operator: str | None = None


class RawRowItem(BaseModel):
    id: int
    rowNo: int
    regionCompany: str | None = None
    projectName: str | None = None
    buildingNo: str | None = None
    taskBatch: str | None = None
    status: str | None = None
    bizResult: str | None = None
    isConnected: str | None = None
    isValid: str | None = None
    firstRating: str | None = None
    dialedAt: datetime | None = None
    generalIssue: str | None = None
    remarkIssue: str | None = None


class RawRowPageResponse(BaseModel):
    total: int
    records: list[RawRowItem]


class RawRowDetailResponse(BaseModel):
    id: int
    batchId: str
    rowNo: int
    payload: Any


class RawImportResponse(BaseModel):
    taskId: str
    batchId: str


class RawIssueItem(BaseModel):
    id: int
    batchId: str
    rowId: int
    sourceField: str
    issueText: str
    regionCompany: str | None = None
    projectName: str | None = None
    buildingNo: str | None = None
    taskBatch: str | None = None
    dialedAt: datetime | None = None
    createdAt: datetime


class RawIssuePageResponse(BaseModel):
    total: int
    records: list[RawIssueItem]


class RawScoreGroupItem(BaseModel):
    key: str
    regionCompany: str | None = None
    projectName: str | None = None
    taskBatch: str | None = None
    sampleCount: int
    ratedCountFirst: int
    avgFirst: float | None = None
    ratedCountButler: int
    avgButler: float | None = None
    ratedCountSecurity: int
    avgSecurity: float | None = None
    ratedCountEnv: int
    avgEnv: float | None = None
    ratedCountPublicRepair: int
    avgPublicRepair: float | None = None


class RawScoreSummaryResponse(BaseModel):
    records: list[RawScoreGroupItem]


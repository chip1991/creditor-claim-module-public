from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ReportGenerateRequest(BaseModel):
    reportType: str
    startTime: str | None = None
    endTime: str | None = None
    notifyUserIds: list[int] | None = None


class ReportGenerateResponse(BaseModel):
    taskId: str
    reportId: str


class ReportDeleteRequest(BaseModel):
    id: str


class ReportPageItem(BaseModel):
    id: str
    reportType: str
    title: str
    createTime: str | None = None
    status: str


class ReportPageResponse(BaseModel):
    total: int
    records: list[ReportPageItem]


class ReportDetailResponse(BaseModel):
    id: str
    reportType: str
    title: str
    createTime: str | None = None
    status: str
    content: str | None = None
    contentJson: object | None = None
    fileRef: object | None = None
    periodStart: datetime | None = None
    periodEnd: datetime | None = None
    generatedAt: datetime | None = None


class ReportAutoConfigSaveRequest(BaseModel):
    id: int | None = None
    reportType: str
    cycle: str
    enabled: bool = False
    runTime: str = "09:00"
    weekday: int | None = None
    dayOfMonth: int | None = None
    notifyUserIds: list[int] | None = None


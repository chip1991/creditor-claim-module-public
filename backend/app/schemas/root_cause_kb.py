from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class RootCauseKbListItem(BaseModel):
    id: str
    categoryLv1: str
    categoryLv2: str
    level: str
    content: str
    keywords: str | None = None
    isEnabled: bool
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class RootCauseKbPageResponse(BaseModel):
    total: int
    records: list[RootCauseKbListItem] = Field(default_factory=list)
    items: list[RootCauseKbListItem] = Field(default_factory=list)


class RootCauseKbCreateRequest(BaseModel):
    categoryLv1: str
    categoryLv2: str
    level: str
    content: str
    keywords: str | None = None
    isEnabled: bool = True


class RootCauseKbUpdateRequest(BaseModel):
    categoryLv1: str | None = None
    categoryLv2: str | None = None
    level: str | None = None
    content: str | None = None
    keywords: str | None = None
    isEnabled: bool | None = None


class RootCauseKbIdResponse(BaseModel):
    id: str


class RootCauseKbToggleRequest(BaseModel):
    isEnabled: bool


class RootCauseKbImportResponse(BaseModel):
    total: int
    success: int
    failed: int
    errors: list[dict] = Field(default_factory=list)


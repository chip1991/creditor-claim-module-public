from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class QaAskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


class QaAskResponse(BaseModel):
    id: str
    question: str
    dsl: dict[str, Any] | None = None
    metric: str | None = None
    result: Any = None
    conclusion: str | None = None
    createdAt: datetime


class QaPageResponse(BaseModel):
    total: int
    records: list[QaAskResponse]


class QaFavoriteRequest(BaseModel):
    id: str
    favorite: bool = True


class QaExportFormat(str):
    TEXT = "text"
    JSON = "json"


class QaExportResponse(BaseModel):
    id: str
    format: Literal["text", "json"]
    content: Any

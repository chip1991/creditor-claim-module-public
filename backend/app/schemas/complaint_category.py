from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CategoryLv1Item(BaseModel):
    id: str
    name: str
    orderNo: int = 0
    isEnabled: bool
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class CategoryLv2Item(BaseModel):
    id: str
    lv1Id: str
    name: str
    orderNo: int = 0
    isEnabled: bool
    keywords: str | None = None
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class CategoryLv1ListResponse(BaseModel):
    records: list[CategoryLv1Item] = Field(default_factory=list)


class CategoryLv2PageResponse(BaseModel):
    total: int
    records: list[CategoryLv2Item] = Field(default_factory=list)
    items: list[CategoryLv2Item] = Field(default_factory=list)


class CategoryLv1CreateRequest(BaseModel):
    name: str
    orderNo: int = 0
    isEnabled: bool = True


class CategoryLv1UpdateRequest(BaseModel):
    name: str | None = None
    orderNo: int | None = None
    isEnabled: bool | None = None


class CategoryLv2CreateRequest(BaseModel):
    lv1Id: str
    name: str
    orderNo: int = 0
    isEnabled: bool = True
    keywords: str | None = None


class CategoryLv2UpdateRequest(BaseModel):
    lv1Id: str | None = None
    name: str | None = None
    orderNo: int | None = None
    isEnabled: bool | None = None
    keywords: str | None = None


class CategoryToggleRequest(BaseModel):
    isEnabled: bool


class CategoryIdResponse(BaseModel):
    id: str


class CategoryImportResponse(BaseModel):
    total: int
    success: int
    failed: int
    errors: list[dict] = Field(default_factory=list)


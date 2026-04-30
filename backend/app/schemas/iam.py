from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class OrgTreeNode(BaseModel):
    id: int
    name: str
    parentId: int | None = None
    isActive: bool = True
    children: list["OrgTreeNode"] = Field(default_factory=list)


class OrgListItem(BaseModel):
    id: int
    name: str
    parentId: int | None = None
    isActive: bool = True
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class OrgPageResponse(BaseModel):
    total: int
    records: list[OrgListItem]


class RoleListItem(BaseModel):
    id: int
    name: str
    key: str
    isActive: bool = True
    dataScope: str
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class RolePageResponse(BaseModel):
    total: int
    records: list[RoleListItem]


class UserListItem(BaseModel):
    id: int
    username: str
    isActive: bool = True
    deptId: int | None = None
    deptName: str | None = None
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class UserPageResponse(BaseModel):
    total: int
    records: list[UserListItem]


class UserStatusUpdateRequest(BaseModel):
    isActive: bool


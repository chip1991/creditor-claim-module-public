from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PermissionItem(BaseModel):
    code: str
    name: str
    isActive: bool = True


class PermissionDictResponse(BaseModel):
    permissions: list[PermissionItem]


class MenuNode(BaseModel):
    id: str
    name: str
    path: str | None = None
    permissionCode: str | None = None
    children: list["MenuNode"] = Field(default_factory=list)


class MenuTreeResponse(BaseModel):
    tree: list[MenuNode]


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


class RoleDataScopeConfig(BaseModel):
    scope: str
    deptIds: list[int] = Field(default_factory=list)


class RoleDetail(BaseModel):
    id: int
    name: str
    key: str
    isActive: bool = True
    dataScope: str
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class RoleDetailResponse(BaseModel):
    role: RoleDetail
    menuIds: list[str] = Field(default_factory=list)
    permissionCodes: list[str] = Field(default_factory=list)
    dataScope: RoleDataScopeConfig


class RoleMenusSaveRequest(BaseModel):
    menuIds: list[str] = Field(default_factory=list)


class RolePermissionsSaveRequest(BaseModel):
    permissionCodes: list[str] = Field(default_factory=list)


class RoleDataScopeSaveRequest(BaseModel):
    scope: str
    deptIds: list[int] = Field(default_factory=list)


class UserRoleAssignRequest(BaseModel):
    roleIds: list[int] = Field(default_factory=list)


class UserRoleAssignResponse(BaseModel):
    userId: int
    roleIds: list[int] = Field(default_factory=list)


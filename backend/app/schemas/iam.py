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
    parentName: str | None = None
    isActive: bool = True
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class OrgPageResponse(BaseModel):
    total: int
    records: list[OrgListItem]


class OrgMutationRequest(BaseModel):
    name: str
    parentId: int | None = None
    isActive: bool = True


class OrgUpdateRequest(BaseModel):
    name: str | None = None
    parentId: int | None = None
    isActive: bool | None = None


class OrgDetailResponse(BaseModel):
    id: int
    name: str
    parentId: int | None = None
    parentName: str | None = None
    isActive: bool = True
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class RoleListItem(BaseModel):
    id: int
    name: str
    key: str
    code: str
    desc: str | None = None
    isActive: bool = True
    dataScope: str
    users: int = 0
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class RolePageResponse(BaseModel):
    total: int
    records: list[RoleListItem]


class RoleMutationRequest(BaseModel):
    name: str
    code: str
    desc: str | None = None
    isActive: bool = True


class RoleUpdateRequest(BaseModel):
    name: str | None = None
    code: str | None = None
    desc: str | None = None
    isActive: bool | None = None


class RoleDetailResponse(BaseModel):
    id: int
    name: str
    key: str
    code: str
    desc: str | None = None
    isActive: bool = True
    dataScope: str
    users: int = 0
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class UserListItem(BaseModel):
    id: int
    name: str
    username: str
    empId: str | None = None
    phone: str | None = None
    isActive: bool = True
    deptId: int | None = None
    deptName: str | None = None
    orgId: int | None = None
    org: str | None = None
    status: str
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class UserPageResponse(BaseModel):
    total: int
    records: list[UserListItem]


class UserMutationRequest(BaseModel):
    name: str
    empId: str | None = None
    phone: str | None = None
    orgId: int | None = None
    isActive: bool = True


class UserUpdateRequest(BaseModel):
    name: str | None = None
    empId: str | None = None
    phone: str | None = None
    orgId: int | None = None
    isActive: bool | None = None


class UserDetailResponse(BaseModel):
    id: int
    name: str
    username: str
    empId: str | None = None
    phone: str | None = None
    isActive: bool = True
    deptId: int | None = None
    deptName: str | None = None
    orgId: int | None = None
    org: str | None = None
    status: str
    roleIds: list[int] = Field(default_factory=list)
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class UserStatusUpdateRequest(BaseModel):
    isActive: bool

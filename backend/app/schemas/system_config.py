from __future__ import annotations

from pydantic import BaseModel


class SystemConfigSaveRequest(BaseModel):
    value: str | None = None
    enabled: bool | None = None


class SystemConfigPayload(BaseModel):
    key: str
    value: str | None = None
    version: int
    enabled: bool

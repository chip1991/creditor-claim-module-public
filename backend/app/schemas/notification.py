from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class NotificationItem(BaseModel):
    id: int
    title: str
    content: str
    category: str | None = None
    source: str | None = None
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime


class NotificationListData(BaseModel):
    items: list[NotificationItem]
    total: int
    unread: int

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class TaskItem(BaseModel):
    id: str
    status: str
    progress: int
    message: str
    created_at: datetime
    updated_at: datetime


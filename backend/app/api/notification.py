from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.audit import Notification
from app.schemas.notification import NotificationItem, NotificationListData
from app.services.audit import create_audit_log
from app.services.notification import list_notifications, mark_all_read


router = APIRouter(prefix="/notification", tags=["notification"])


@router.get("/list", response_model=ApiResponse)
def notification_list(
    offset: int = 0,
    limit: int = 20,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse:
    rows, total, unread = list_notifications(db, user_id=current_user.id, offset=offset, limit=limit, unread_only=unread_only)
    items = [
        NotificationItem(
            id=r.id,
            title=r.title,
            content=r.content,
            category=r.category,
            source=r.source,
            is_read=r.is_read,
            read_at=r.read_at,
            created_at=r.created_at,
        )
        for r in rows
    ]
    data = NotificationListData(items=items, total=total, unread=unread)
    return ApiResponse(data=data.model_dump())


@router.post("/read-all", response_model=ApiResponse)
def notification_read_all(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ApiResponse:
    unread_before = db.execute(
        select(func.count()).select_from(Notification).where(Notification.user_id == current_user.id, Notification.is_read.is_(False))
    ).scalar_one()
    updated = mark_all_read(db, user_id=current_user.id)
    create_audit_log(
        db,
        entity_type="notification",
        entity_id=str(current_user.id),
        action="READ_ALL",
        actor=current_user,
        before={"unread": int(unread_before)},
        after={"unread": 0},
        reason="全部已读",
        source="api:/notification/read-all",
    )
    db.commit()
    return ApiResponse(data={"updated": updated})

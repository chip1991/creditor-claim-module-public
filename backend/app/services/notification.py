from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.audit import Notification


def create_notification(
    db: Session,
    *,
    user_id: int,
    title: str,
    content: str,
    category: str | None = None,
    source: str | None = None,
) -> Notification:
    row = Notification(user_id=user_id, title=title, content=content, category=category, source=source)
    db.add(row)
    return row


def list_notifications(
    db: Session,
    *,
    user_id: int,
    offset: int,
    limit: int,
    unread_only: bool,
) -> tuple[list[Notification], int, int]:
    base = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        base = base.where(Notification.is_read.is_(False))
    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()

    unread = db.execute(
        select(func.count()).select_from(Notification).where(Notification.user_id == user_id, Notification.is_read.is_(False))
    ).scalar_one()

    stmt = base.order_by(Notification.created_at.desc(), Notification.id.desc()).offset(offset).limit(limit)
    rows = list(db.execute(stmt).scalars().all())
    return rows, int(total), int(unread)


def mark_all_read(db: Session, *, user_id: int) -> int:
    now = datetime.now(timezone.utc)
    stmt = (
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        .values(is_read=True, read_at=now)
    )
    result = db.execute(stmt)
    return int(result.rowcount or 0)

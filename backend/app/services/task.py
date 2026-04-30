from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task


def get_task(db: Session, *, task_id: str) -> Task | None:
    return db.get(Task, task_id)


def upsert_task(
    db: Session,
    *,
    task_id: str,
    status: str | None = None,
    progress: int | None = None,
    message: str | None = None,
) -> Task:
    row = db.get(Task, task_id)
    if row is None:
        row = Task(id=task_id)
        db.add(row)
        db.flush()

    if status is not None:
        row.status = status
    if progress is not None:
        row.progress = progress
    if message is not None:
        row.message = message
    return row


def list_task_ids(db: Session, *, offset: int, limit: int) -> list[str]:
    stmt = select(Task.id).order_by(Task.created_at.desc(), Task.id.desc()).offset(offset).limit(limit)
    return [r[0] for r in db.execute(stmt).all()]


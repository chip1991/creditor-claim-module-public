from __future__ import annotations

import json
from collections.abc import Mapping

from celery import Task as CeleryTask

from app.core.redis_client import get_redis
from app.db.session import SessionLocal
from app.models.task import TaskStatus
from app.services.task import upsert_task


def task_stream_channel(task_id: str) -> str:
    return f"task_stream:{task_id}"


def update_task_progress(
    celery_task: CeleryTask | None,
    *,
    task_id: str | None = None,
    progress: int | None = None,
    message: str | None = None,
    status: str | TaskStatus | None = None,
    extra: Mapping[str, object] | None = None,
) -> None:
    resolved_task_id = task_id or (celery_task.request.id if celery_task else None)
    if not resolved_task_id:
        raise ValueError("task_id 不能为空")

    resolved_status = status.value if isinstance(status, TaskStatus) else status
    resolved_progress = progress
    if resolved_status in {TaskStatus.SUCCESS.value}:
        resolved_progress = 100 if resolved_progress is None else resolved_progress

    payload: dict[str, object] = {
        "task_id": resolved_task_id,
        "progress": int(resolved_progress or 0),
        "message": message or "",
        "status": resolved_status or TaskStatus.RUNNING.value,
    }
    if extra:
        payload["extra"] = dict(extra)

    if celery_task is not None:
        celery_task.update_state(state=str(payload["status"]), meta=payload)

    with SessionLocal() as db:
        upsert_task(
            db,
            task_id=resolved_task_id,
            status=str(payload["status"]),
            progress=int(payload["progress"]),
            message=str(payload["message"]),
        )
        db.commit()

    try:
        redis_client = get_redis()
        redis_client.publish(task_stream_channel(resolved_task_id), json.dumps(payload, ensure_ascii=False))
    except Exception:
        return


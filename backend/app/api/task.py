from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.redis_client import get_redis
from app.core.response import ApiResponse
from app.db.session import SessionLocal, get_db
from app.schemas.task import TaskItem
from app.services.task import get_task
from app.tasks.progress import task_stream_channel


router = APIRouter()


def _to_item(row) -> TaskItem:
    return TaskItem(
        id=row.id,
        status=row.status,
        progress=row.progress,
        message=row.message,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/task/{task_id}", response_model=ApiResponse)
def get_task_status(task_id: str, db: Session = Depends(get_db)) -> ApiResponse:
    row = get_task(db, task_id=task_id)
    if row is None:
        raise AppError("NOT_FOUND", "任务不存在", 404)
    return ApiResponse(data=_to_item(row).model_dump())


@router.get("/task/{task_id}/stream")
async def stream_task(task_id: str, request: Request, db: Session = Depends(get_db)) -> StreamingResponse:
    row = get_task(db, task_id=task_id)
    if row is None:
        raise AppError("NOT_FOUND", "任务不存在", 404)

    async def event_gen() -> AsyncGenerator[bytes, None]:
        first_payload = {"task_id": row.id, "progress": row.progress, "message": row.message, "status": row.status}
        yield f"data: {json.dumps(first_payload, ensure_ascii=False)}\n\n".encode("utf-8")

        try:
            redis_client = get_redis()
            pubsub = redis_client.pubsub()
            pubsub.subscribe(task_stream_channel(task_id))
            try:
                while True:
                    if await request.is_disconnected():
                        break
                    msg = await asyncio.to_thread(pubsub.get_message, ignore_subscribe_messages=True, timeout=1.0)
                    if msg and msg.get("data"):
                        yield f"data: {msg['data']}\n\n".encode("utf-8")
            finally:
                await asyncio.to_thread(pubsub.close)
        except Exception:
            last = first_payload
            while True:
                if await request.is_disconnected():
                    break
                await asyncio.sleep(1)
                with SessionLocal() as polling_db:
                    refreshed = get_task(polling_db, task_id=task_id)
                if refreshed is None:
                    break
                payload = {
                    "task_id": refreshed.id,
                    "progress": refreshed.progress,
                    "message": refreshed.message,
                    "status": refreshed.status,
                }
                if payload != last:
                    yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n".encode("utf-8")
                    last = payload

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )

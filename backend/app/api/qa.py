from __future__ import annotations

import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permissions
from app.core.errors import AppError
from app.core.response import ApiResponse
from app.db.session import get_db
from app.schemas.qa import QaAskRequest, QaFavoriteRequest
from app.services.audit import create_audit_log
from app.services.qa import export_qa_record_json, export_qa_record_text, get_qa_record, list_qa_records, run_qa, set_favorite


router = APIRouter()


def _qa_user(
    current_user: CurrentUser = Depends(
        require_permissions("qa:ask", "qa:read", "dashboard:read", "analysis:read", "workorder:read", "data:read", mode="any")
    ),
) -> CurrentUser:
    return current_user


def _to_payload(row) -> dict:
    return {
        "id": row.id,
        "question": row.question,
        "dsl": row.dsl if isinstance(row.dsl, dict) else None,
        "metric": row.metric,
        "result": row.result,
        "conclusion": row.conclusion,
        "createdAt": row.created_at,
        "isFavorite": bool(row.is_favorite),
    }


@router.post("/qa/ask", response_model=ApiResponse)
def qa_ask(payload: QaAskRequest, db: Session = Depends(get_db), current_user: CurrentUser = Depends(_qa_user)) -> ApiResponse:
    row = run_qa(db, question=payload.question, actor=current_user)
    db.commit()
    return ApiResponse(data=_to_payload(row))


@router.post("/qa/stream")
async def qa_stream(
    payload: QaAskRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_qa_user),
) -> StreamingResponse:
    async def event_gen() -> AsyncGenerator[bytes, None]:
        try:
            from app.services.qa import execute_plan, plan_question

            plan = plan_question(payload.question)
            yield f"data: {json.dumps({'stage': 'planner', 'dsl': plan.to_dsl()}, ensure_ascii=False)}\n\n".encode("utf-8")
            if await request.is_disconnected():
                return
            yield f"data: {json.dumps({'stage': 'executor'}, ensure_ascii=False)}\n\n".encode("utf-8")
            if await request.is_disconnected():
                return
            effective_plan, metric, result, conclusion = execute_plan(db, plan, current_user)
            yield f"data: {json.dumps({'stage': 'result', 'metric': metric, 'result': result}, ensure_ascii=False)}\n\n".encode("utf-8")
            if await request.is_disconnected():
                return
            from app.services.qa import create_qa_record

            row = create_qa_record(
                db,
                question=payload.question,
                plan=effective_plan,
                metric=metric,
                result=result,
                conclusion=conclusion,
                actor=current_user,
            )
            db.commit()
            yield f"data: {json.dumps({'stage': 'done', 'id': row.id, 'conclusion': conclusion}, ensure_ascii=False)}\n\n".encode('utf-8')
        except AppError as e:
            db.rollback()
            yield f"data: {json.dumps({'stage': 'error', 'code': e.code, 'msg': e.msg}, ensure_ascii=False)}\n\n".encode("utf-8")
        except Exception as e:
            db.rollback()
            yield f"data: {json.dumps({'stage': 'error', 'code': 'INTERNAL_ERROR', 'msg': '系统内部错误'}, ensure_ascii=False)}\n\n".encode("utf-8")

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.get("/qa/page", response_model=ApiResponse)
def qa_page(
    page: int = 1,
    size: int = 20,
    favoriteOnly: bool = False,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_qa_user),
) -> ApiResponse:
    rows, total = list_qa_records(db, actor=current_user, page=page, size=size, favorite_only=favoriteOnly)
    return ApiResponse(data={"total": total, "records": [_to_payload(r) for r in rows]})


@router.get("/qa/detail", response_model=ApiResponse)
def qa_detail(id: str, db: Session = Depends(get_db), current_user: CurrentUser = Depends(_qa_user)) -> ApiResponse:
    row = get_qa_record(db, record_id=id, actor=current_user)
    return ApiResponse(data=_to_payload(row))


@router.post("/qa/favorite", response_model=ApiResponse)
def qa_favorite(payload: QaFavoriteRequest, db: Session = Depends(get_db), current_user: CurrentUser = Depends(_qa_user)) -> ApiResponse:
    row = set_favorite(db, record_id=payload.id, favorite=payload.favorite, actor=current_user)
    db.commit()
    return ApiResponse(data={"id": row.id, "isFavorite": bool(row.is_favorite)})


@router.get("/qa/export")
def qa_export(
    id: str,
    format: str = "text",
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_qa_user),
) -> Response:
    row = get_qa_record(db, record_id=id, actor=current_user)
    fmt = (format or "text").lower()
    if fmt not in {"text", "json"}:
        raise AppError(code="INVALID_FORMAT", msg="导出格式不支持", status_code=400)
    create_audit_log(
        db,
        entity_type="qa",
        entity_id=row.id,
        action="QA_EXPORT",
        actor=current_user,
        after={"format": fmt},
    )
    db.commit()
    if fmt == "json":
        content = json.dumps(export_qa_record_json(row), ensure_ascii=False, indent=2)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="qa_{row.id}.json"'},
        )
    content = export_qa_record_text(row)
    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="qa_{row.id}.txt"'},
    )

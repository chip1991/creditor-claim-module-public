from datetime import datetime, timezone

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.core.config import get_settings
from app.core.redis_client import get_redis
from app.core.response import ApiResponse
from app.db.session import engine


router = APIRouter()


@router.get("/healthz", response_model=ApiResponse)
def healthz() -> ApiResponse:
    settings = get_settings()
    return ApiResponse(
        data={
            "status": "ok",
            "app": settings.app_name,
            "env": settings.env,
            "time": datetime.now(timezone.utc).isoformat(),
        }
    )


@router.get("/readyz", response_model=ApiResponse)
def readyz(response: Response) -> ApiResponse:
    errors: list[str] = []

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        errors.append("数据库不可用")

    try:
        redis_client = get_redis()
        redis_client.ping()
    except Exception:
        errors.append("Redis 不可用")

    if errors:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ApiResponse(code="NOT_READY", msg="依赖未就绪", data={"errors": errors})

    return ApiResponse(data={"status": "ready"})

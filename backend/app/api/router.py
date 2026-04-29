from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.notification import router as notification_router
from app.api.task import router as task_router


api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(notification_router)
api_router.include_router(task_router)

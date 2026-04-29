import logging
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app


logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.tasks.ping")
def ping() -> dict:
    return {"status": "ok"}


@celery_app.task(name="app.tasks.tasks.heartbeat")
def heartbeat() -> dict:
    now = datetime.now(timezone.utc).isoformat()
    logger.info("celery_heartbeat time=%s", now)
    return {"time": now}

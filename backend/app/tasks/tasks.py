import logging
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app
from app.db.session import SessionLocal
from app.services.workorder_warning import scan_workorder_warning
from app.services.report import scan_report_auto_configs


logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.tasks.ping")
def ping() -> dict:
    return {"status": "ok"}


@celery_app.task(name="app.tasks.tasks.heartbeat")
def heartbeat() -> dict:
    now = datetime.now(timezone.utc).isoformat()
    logger.info("celery_heartbeat time=%s", now)
    return {"time": now}


@celery_app.task(name="app.tasks.tasks.workorder_warning_scan")
def workorder_warning_scan() -> dict:
    db = SessionLocal()
    try:
        result = scan_workorder_warning(db, actor=None, source="scheduler")
        db.commit()
        return result
    finally:
        db.close()


@celery_app.task(name="app.tasks.tasks.report_auto_generate_tick")
def report_auto_generate_tick() -> dict:
    db = SessionLocal()
    try:
        triggered = scan_report_auto_configs(db)
        db.commit()
        return {"triggered": int(triggered)}
    finally:
        db.close()

from celery import Celery

from app.core.config import get_settings
from app.core.logging import setup_logging


settings = get_settings()
setup_logging(settings)

celery_app = Celery(
    settings.app_name,
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.tasks"],
)

celery_app.conf.timezone = "Asia/Shanghai"
celery_app.conf.beat_schedule = {
    "heartbeat": {
        "task": "app.tasks.tasks.heartbeat",
        "schedule": 60.0,
    },
    "workorder_warning_scan": {
        "task": "app.tasks.tasks.workorder_warning_scan",
        "schedule": 300.0,
    },
    "report_auto_generate_tick": {
        "task": "app.tasks.tasks.report_auto_generate_tick",
        "schedule": 60.0,
    },
}

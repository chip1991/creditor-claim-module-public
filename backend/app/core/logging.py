import logging
from logging import LogRecord

from app.core.config import Settings
from app.core.request_context import get_request_id


class RequestIdFilter(logging.Filter):
    def filter(self, record: LogRecord) -> bool:
        record.request_id = get_request_id()
        return True


def setup_logging(settings: Settings) -> None:
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s request_id=%(request_id)s %(message)s",
    )
    logging.getLogger().addFilter(RequestIdFilter())

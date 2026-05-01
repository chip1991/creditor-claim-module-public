from __future__ import annotations

from datetime import date, datetime

from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.models.audit import AuditLog


def _jsonable(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [_jsonable(v) for v in value]
    return value


def create_audit_log(
    db: Session,
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    actor: CurrentUser | None,
    before: object | None = None,
    after: object | None = None,
    reason: str | None = None,
    source: str = "api",
) -> AuditLog:
    row = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor.id if actor else None,
        before=_jsonable(before),
        after=_jsonable(after),
        reason=reason,
        source=source,
    )
    db.add(row)
    return row

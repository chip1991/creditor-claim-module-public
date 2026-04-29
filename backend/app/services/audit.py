from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.auth import CurrentUser
from app.models.audit import AuditLog


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
        before=before,
        after=after,
        reason=reason,
        source=source,
    )
    db.add(row)
    return row

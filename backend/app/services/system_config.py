from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.system_config import SystemConfig
from app.services.audit import create_audit_log


def get_system_config_latest(db: Session, *, key: str) -> SystemConfig | None:
    return (
        db.execute(select(SystemConfig).where(SystemConfig.key == key).order_by(desc(SystemConfig.version)).limit(1))
        .scalars()
        .first()
    )


def get_system_config_payload(db: Session, *, key: str) -> dict:
    row = get_system_config_latest(db, key=key)
    if row is None:
        return {"key": key, "value": "", "version": 0, "enabled": True}
    return {"key": row.key, "value": row.value or "", "version": int(row.version), "enabled": bool(row.enabled)}


def save_system_config(
    db: Session,
    *,
    key: str,
    value: str | None,
    enabled: bool | None,
    actor,
    reason: str,
) -> dict:
    before_row = get_system_config_latest(db, key=key)
    before = None
    if before_row is not None:
        before = {
            "key": before_row.key,
            "value": before_row.value or "",
            "version": int(before_row.version),
            "enabled": bool(before_row.enabled),
        }

    max_version = db.execute(select(func.max(SystemConfig.version)).where(SystemConfig.key == key)).scalar()
    next_version = int(max_version or 0) + 1
    effective_enabled = bool(enabled) if enabled is not None else (bool(before_row.enabled) if before_row else True)
    effective_value = value if value is not None else ""

    row = SystemConfig(key=key, version=next_version, enabled=effective_enabled, value=effective_value)
    db.add(row)

    after = {"key": key, "value": effective_value, "version": next_version, "enabled": effective_enabled}
    create_audit_log(
        db,
        entity_type="system_config",
        entity_id=key,
        action="SYSTEM_CONFIG_SAVE",
        actor=actor,
        before=before,
        after=after,
        reason=reason,
        source="api",
    )
    return after

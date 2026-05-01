from __future__ import annotations

import os
import sqlite3
import tempfile
from pathlib import Path

from alembic import command
from alembic.config import Config


def test_permission_center_menu_split_migration():
    db_path = Path(tempfile.gettempdir()) / f"alembic_menu_split_{os.getpid()}.db"
    if db_path.exists():
        db_path.unlink()

    cfg = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    os.environ["DATABASE_URL"] = f"sqlite:////{str(db_path).lstrip('/')}"
    from app.core.config import get_settings

    get_settings.cache_clear()
    command.upgrade(cfg, "head")

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    old_id = "/system/permission-center"
    new_ids = [
        "/system/permission-center/orgs",
        "/system/permission-center/roles",
        "/system/permission-center/users",
    ]

    old = cur.execute("select is_active from menu where id=?", (old_id,)).fetchone()
    assert old is not None
    assert int(old[0]) == 0

    for mid in new_ids:
        row = cur.execute("select id, is_active from menu where id=?", (mid,)).fetchone()
        assert row is not None
        assert int(row[1]) == 1

    admin_role_id = cur.execute("select id from role where key='admin' limit 1").fetchone()[0]
    for mid in new_ids:
        cnt = cur.execute("select count(1) from role_menu where role_id=? and menu_id=?", (admin_role_id, mid)).fetchone()[0]
        assert int(cnt) == 1

    conn.close()

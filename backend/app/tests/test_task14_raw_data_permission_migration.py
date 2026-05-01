from __future__ import annotations

import os
import sqlite3
import tempfile
from pathlib import Path

from alembic import command
from alembic.config import Config


def test_task14_raw_data_permissions_seed_and_admin_grant():
    db_path = Path(tempfile.gettempdir()) / f"alembic_task14_{os.getpid()}.db"
    if db_path.exists():
        db_path.unlink()

    cfg = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    os.environ["DATABASE_URL"] = f"sqlite:////{str(db_path).lstrip('/')}"

    from app.core.config import get_settings

    get_settings.cache_clear()
    command.upgrade(cfg, "head")

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    for code in ("data:import", "data:read"):
        row = cur.execute("select id, name, is_active from permission where code=?", (code,)).fetchone()
        assert row is not None
        assert int(row[2]) == 1

    admin_role_id_row = cur.execute("select id from role where key='admin' limit 1").fetchone()
    assert admin_role_id_row is not None
    admin_role_id = int(admin_role_id_row[0])

    for code in ("data:import", "data:read"):
        cnt = cur.execute(
            """
            select count(1)
            from role_permission rp
            join permission p on p.id = rp.permission_id
            where rp.role_id = ? and p.code = ?
            """,
            (admin_role_id, code),
        ).fetchone()[0]
        assert int(cnt) == 1

    conn.close()

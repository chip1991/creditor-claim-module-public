from alembic import op
import sqlalchemy as sa

revision = "0023_raw_data_import_read_permissions"
down_revision = "0022_permission_center_crud"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    permissions = [
        ("data:import", "原始数据导入"),
        ("data:read", "原始数据查看"),
    ]

    for code, name in permissions:
        existed = conn.execute(sa.text("SELECT COUNT(1) FROM permission WHERE code=:code"), {"code": code}).scalar()
        if not existed:
            conn.execute(
                sa.text("INSERT INTO permission (code, name, is_active) VALUES (:code, :name, 1)"),
                {"code": code, "name": name},
            )

    role_id = conn.execute(sa.text("SELECT id FROM role WHERE key='admin' ORDER BY id ASC LIMIT 1")).scalar()
    if role_id:
        perm_ids = conn.execute(
            sa.text("SELECT id FROM permission WHERE code IN ('data:import', 'data:read')")
        ).fetchall()
        for (perm_id,) in perm_ids:
            conn.execute(
                sa.text("INSERT OR IGNORE INTO role_permission (role_id, permission_id) VALUES (:role_id, :permission_id)"),
                {"role_id": int(role_id), "permission_id": int(perm_id)},
            )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "DELETE FROM role_permission WHERE permission_id IN (SELECT id FROM permission WHERE code IN ('data:import', 'data:read'))"
        )
    )
    conn.execute(sa.text("DELETE FROM permission WHERE code IN ('data:import', 'data:read')"))

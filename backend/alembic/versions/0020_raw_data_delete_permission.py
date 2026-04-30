from alembic import op
import sqlalchemy as sa

revision = "0020_raw_data_delete_permission"
down_revision = "0019_raw_data_center"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    code = "data:delete"
    name = "原始数据批次删除"
    existed = conn.execute(sa.text("SELECT COUNT(1) FROM permission WHERE code=:code"), {"code": code}).scalar()
    if not existed:
        conn.execute(sa.text("INSERT INTO permission (code, name, is_active) VALUES (:code, :name, 1)"), {"code": code, "name": name})

    role_id = conn.execute(sa.text("SELECT id FROM role WHERE key='admin' ORDER BY id ASC LIMIT 1")).scalar()
    perm_id = conn.execute(sa.text("SELECT id FROM permission WHERE code=:code"), {"code": code}).scalar()
    if role_id and perm_id:
        conn.execute(
            sa.text("INSERT OR IGNORE INTO role_permission (role_id, permission_id) VALUES (:role_id, :permission_id)"),
            {"role_id": int(role_id), "permission_id": int(perm_id)},
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM role_permission WHERE permission_id IN (SELECT id FROM permission WHERE code='data:delete')"))
    conn.execute(sa.text("DELETE FROM permission WHERE code='data:delete'"))


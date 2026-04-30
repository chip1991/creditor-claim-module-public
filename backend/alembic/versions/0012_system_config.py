from alembic import op
import sqlalchemy as sa

revision = "0012_system_config"
down_revision = "0011_seed_admin"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_config",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("key", "version", name="uq_system_config_key_version"),
    )
    op.create_index("ix_system_config_key", "system_config", ["key"])
    op.create_index("ix_system_config_key_version", "system_config", ["key", "version"])

    conn = op.get_bind()
    existed = conn.execute(sa.text("SELECT COUNT(1) FROM permission WHERE code=:code"), {"code": "system:config"}).scalar()
    if not existed:
        conn.execute(
            sa.text("INSERT INTO permission (code, name, is_active) VALUES (:code, :name, 1)"),
            {"code": "system:config", "name": "系统配置"},
        )
    role_id = conn.execute(sa.text("SELECT id FROM role WHERE key='admin' ORDER BY id ASC LIMIT 1")).scalar()
    perm_id = conn.execute(sa.text("SELECT id FROM permission WHERE code=:code"), {"code": "system:config"}).scalar()
    if role_id and perm_id:
        conn.execute(
            sa.text("INSERT OR IGNORE INTO role_permission (role_id, permission_id) VALUES (:role_id, :permission_id)"),
            {"role_id": int(role_id), "permission_id": int(perm_id)},
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM role_permission WHERE permission_id IN (SELECT id FROM permission WHERE code='system:config')"))
    conn.execute(sa.text("DELETE FROM permission WHERE code='system:config'"))

    op.drop_index("ix_system_config_key_version", table_name="system_config")
    op.drop_index("ix_system_config_key", table_name="system_config")
    op.drop_table("system_config")

from alembic import op
import sqlalchemy as sa

revision = "0016_ai_config"
down_revision = "0015_rbac_menu_seed"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_llm",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("model", sa.String(length=128), nullable=False),
        sa.Column("base_url", sa.String(length=255), nullable=True),
        sa.Column("api_key", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("last_test_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_test_status", sa.String(length=16), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "ai_agent",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("code", sa.String(length=128), nullable=False),
        sa.Column("llm_id", sa.String(length=64), sa.ForeignKey("ai_llm.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("code", name="uq_ai_agent_code"),
    )

    op.create_table(
        "ai_agent_version",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("agent_id", sa.String(length=64), sa.ForeignKey("ai_agent.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default=sa.text("'draft'")),
        sa.Column("config", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )

    with op.batch_alter_table("ai_agent") as batch:
        batch.add_column(sa.Column("current_version_id", sa.String(length=64), nullable=True))
        batch.create_foreign_key(
            "fk_ai_agent_current_version",
            "ai_agent_version",
            ["current_version_id"],
            ["id"],
            ondelete="SET NULL",
        )

    conn = op.get_bind()
    permissions = [
        ("ai:llm:read", "大模型配置查看"),
        ("ai:llm:write", "大模型配置编辑"),
        ("ai:agent:read", "智能体配置查看"),
        ("ai:agent:write", "智能体配置编辑"),
        ("ai:agent:publish", "智能体版本发布"),
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
        perm_rows = conn.execute(sa.text("SELECT id FROM permission WHERE code LIKE 'ai:%'")).fetchall()
        for (pid,) in perm_rows:
            conn.execute(
                sa.text("INSERT OR IGNORE INTO role_permission (role_id, permission_id) VALUES (:role_id, :permission_id)"),
                {"role_id": int(role_id), "permission_id": int(pid)},
            )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM role_permission WHERE permission_id IN (SELECT id FROM permission WHERE code LIKE 'ai:%')"))
    conn.execute(sa.text("DELETE FROM permission WHERE code LIKE 'ai:%'"))
    op.drop_table("ai_agent_version")
    op.drop_table("ai_agent")
    op.drop_table("ai_llm")


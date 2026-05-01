from alembic import op
import sqlalchemy as sa

revision = "0017_root_cause_kb"
down_revision = "0016_ai_config"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "root_cause_kb",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("category_lv1", sa.String(length=64), nullable=False),
        sa.Column("category_lv2", sa.String(length=64), nullable=False),
        sa.Column("level", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("keywords", sa.Text(), nullable=True),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_root_cause_kb_lv2_level_enabled", "root_cause_kb", ["category_lv2", "level", "is_enabled"])


def downgrade() -> None:
    op.drop_index("ix_root_cause_kb_lv2_level_enabled", table_name="root_cause_kb")
    op.drop_table("root_cause_kb")


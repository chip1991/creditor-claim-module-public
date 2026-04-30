from alembic import op
import sqlalchemy as sa

revision = "0010_report"
down_revision = "0009_qa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "report",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("report_type", sa.String(length=32), nullable=False),
        sa.Column("cycle", sa.String(length=32), nullable=False, server_default="自定义周期报告"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="生成中"),
        sa.Column("title", sa.String(length=255), nullable=False, server_default=sa.text("''")),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("content_json", sa.JSON(), nullable=True),
        sa.Column("file_ref", sa.JSON(), nullable=True),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_report_created_at", "report", ["created_at"])
    op.create_index("ix_report_report_type", "report", ["report_type"])
    op.create_index("ix_report_status", "report", ["status"])
    op.create_index("ix_report_created_by", "report", ["created_by"])

    op.create_table(
        "report_auto_config",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("report_type", sa.String(length=32), nullable=False),
        sa.Column("cycle", sa.String(length=16), nullable=False, server_default="日报"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("run_time", sa.String(length=8), nullable=False, server_default="09:00"),
        sa.Column("weekday", sa.Integer(), nullable=True),
        sa.Column("day_of_month", sa.Integer(), nullable=True),
        sa.Column("notify_user_ids", sa.JSON(), nullable=True),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_report_auto_config_enabled", "report_auto_config", ["enabled"])
    op.create_index("ix_report_auto_config_cycle", "report_auto_config", ["cycle"])
    op.create_index("ix_report_auto_config_created_at", "report_auto_config", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_report_auto_config_created_at", table_name="report_auto_config")
    op.drop_index("ix_report_auto_config_cycle", table_name="report_auto_config")
    op.drop_index("ix_report_auto_config_enabled", table_name="report_auto_config")
    op.drop_table("report_auto_config")

    op.drop_index("ix_report_created_by", table_name="report")
    op.drop_index("ix_report_status", table_name="report")
    op.drop_index("ix_report_report_type", table_name="report")
    op.drop_index("ix_report_created_at", table_name="report")
    op.drop_table("report")


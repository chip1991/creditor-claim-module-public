from alembic import op
import sqlalchemy as sa

revision = "0006_complaint_analysis"
down_revision = "0005_data_center"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "complaint_analysis",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("complaint_record_id", sa.String(length=64), sa.ForeignKey("data_record.id", ondelete="CASCADE"), nullable=False),
        sa.Column("work_order_no", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="待分析"),
        sa.Column("message", sa.String(length=255), nullable=True),
        sa.Column("category_lv1", sa.String(length=32), nullable=True),
        sa.Column("category_lv2", sa.String(length=64), nullable=True),
        sa.Column("root_cause_surface", sa.String(length=255), nullable=True),
        sa.Column("root_cause_direct", sa.String(length=255), nullable=True),
        sa.Column("root_cause_deep", sa.String(length=255), nullable=True),
        sa.Column("responsible_dept", sa.String(length=64), nullable=True),
        sa.Column("risk_level", sa.String(length=16), nullable=True),
        sa.Column("is_repeated", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("confidence", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("evidence_snippets", sa.JSON(), nullable=True),
        sa.Column("suggested_rectification", sa.JSON(), nullable=True),
        sa.Column("model_version", sa.String(length=64), nullable=True),
        sa.Column("analyzed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ai_result", sa.JSON(), nullable=True),
        sa.Column("ai_confidence", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("ai_model_version", sa.String(length=64), nullable=True),
        sa.Column("ai_analyzed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("manual_override", sa.JSON(), nullable=True),
        sa.Column("manual_overridden", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("manual_overridden_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("manual_overridden_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("manual_override_reason", sa.String(length=255), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("complaint_record_id", name="uq_complaint_analysis_record"),
    )
    op.create_index("ix_complaint_analysis_work_order_no", "complaint_analysis", ["work_order_no"])
    op.create_index("ix_complaint_analysis_status_time", "complaint_analysis", ["status", "updated_at"])


def downgrade() -> None:
    op.drop_index("ix_complaint_analysis_status_time", table_name="complaint_analysis")
    op.drop_index("ix_complaint_analysis_work_order_no", table_name="complaint_analysis")
    op.drop_table("complaint_analysis")

from alembic import op
import sqlalchemy as sa

revision = "0007_work_order"
down_revision = "0006_complaint_analysis"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "work_order",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("analysis_id", sa.String(length=64), sa.ForeignKey("complaint_analysis.id", ondelete="SET NULL"), nullable=True),
        sa.Column("work_order_no", sa.String(length=64), nullable=True),
        sa.Column("rectification_status", sa.String(length=16), nullable=False, server_default="待整改"),
        sa.Column("verify_status", sa.String(length=16), nullable=False, server_default="待核验"),
        sa.Column("close_status", sa.String(length=16), nullable=False, server_default="未闭环"),
        sa.Column("warning_status", sa.String(length=16), nullable=False, server_default="正常"),
        sa.Column("satisfaction_check_status", sa.String(length=16), nullable=False, server_default="待校验"),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("department.id", ondelete="SET NULL"), nullable=True),
        sa.Column("department_name", sa.String(length=64), nullable=True),
        sa.Column("assignee_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("requirement", sa.Text(), nullable=True),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("verify_reason", sa.String(length=255), nullable=True),
        sa.Column("forced_close", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("forced_reason", sa.String(length=255), nullable=True),
        sa.Column("urge_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("last_urged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("analysis_id", name="uq_work_order_analysis_id"),
        sa.UniqueConstraint("work_order_no", name="uq_work_order_work_order_no"),
    )
    op.create_index("ix_work_order_status_time", "work_order", ["rectification_status", "updated_at"])
    op.create_index("ix_work_order_dept", "work_order", ["department_id"])

    op.create_table(
        "work_order_action_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("work_order_id", sa.String(length=64), sa.ForeignKey("work_order.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("message", sa.String(length=255), nullable=True),
        sa.Column("before", sa.JSON(), nullable=True),
        sa.Column("after", sa.JSON(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_work_order_action_log_work_order_id", "work_order_action_log", ["work_order_id", "created_at"])

    op.create_table(
        "satisfaction_record",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("work_order_id", sa.String(length=64), sa.ForeignKey("work_order.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_data_record_id", sa.String(length=64), sa.ForeignKey("data_record.id", ondelete="SET NULL"), nullable=True),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("result", sa.String(length=16), nullable=True),
        sa.Column("check_status", sa.String(length=16), nullable=False, server_default="待校验"),
        sa.Column("threshold_mapping", sa.JSON(), nullable=True),
        sa.Column("rule_hits", sa.JSON(), nullable=True),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_satisfaction_record_work_order_id", "satisfaction_record", ["work_order_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_satisfaction_record_work_order_id", table_name="satisfaction_record")
    op.drop_table("satisfaction_record")
    op.drop_index("ix_work_order_action_log_work_order_id", table_name="work_order_action_log")
    op.drop_table("work_order_action_log")
    op.drop_index("ix_work_order_dept", table_name="work_order")
    op.drop_index("ix_work_order_status_time", table_name="work_order")
    op.drop_table("work_order")

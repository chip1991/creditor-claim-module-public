from alembic import op
import sqlalchemy as sa

revision = "0005_data_center"
down_revision = "0004_task"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "data_import_task",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("filename", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("file_path", sa.String(length=512), nullable=False, server_default=""),
        sa.Column("conflict_strategy", sa.String(length=32), nullable=False, server_default="REJECT"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="RUNNING"),
        sa.Column("total_rows", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("success_rows", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("failed_rows", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("conflict_rows", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_data_import_task_status", "data_import_task", ["status", "updated_at"])

    op.create_table(
        "data_import_row_error",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("import_task_id", sa.String(length=64), sa.ForeignKey("data_import_task.id", ondelete="CASCADE"), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("field", sa.String(length=128), nullable=True),
        sa.Column("message", sa.String(length=255), nullable=False),
        sa.Column("raw_payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_data_import_row_error_task_row", "data_import_row_error", ["import_task_id", "row_number"])

    op.create_table(
        "data_record",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("data_type", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="待清洗"),
        sa.Column("work_order_no", sa.String(length=64), nullable=True),
        sa.Column("event_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_sec", sa.Integer(), nullable=True),
        sa.Column("agent_name", sa.String(length=64), nullable=True),
        sa.Column("owner_name", sa.String(length=64), nullable=True),
        sa.Column("building_room", sa.String(length=128), nullable=True),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("satisfaction_score", sa.Integer(), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("cleaned_text", sa.Text(), nullable=True),
        sa.Column("raw_payload", sa.JSON(), nullable=True),
        sa.Column("cleaned_payload", sa.JSON(), nullable=True),
        sa.Column("import_task_id", sa.String(length=64), sa.ForeignKey("data_import_task.id", ondelete="SET NULL"), nullable=True),
        sa.Column("linked_record_id", sa.String(length=64), sa.ForeignKey("data_record.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_data_record_type_status_time", "data_record", ["data_type", "status", "event_time"])
    op.create_index("ix_data_record_work_order_no", "data_record", ["work_order_no"])

    op.create_table(
        "data_clean_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("record_id", sa.String(length=64), sa.ForeignKey("data_record.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", sa.String(length=64), nullable=True),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("before", sa.JSON(), nullable=True),
        sa.Column("after", sa.JSON(), nullable=True),
        sa.Column("message", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_data_clean_log_record", "data_clean_log", ["record_id", "created_at"])

    op.create_table(
        "data_link_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("complaint_record_id", sa.String(length=64), sa.ForeignKey("data_record.id", ondelete="CASCADE"), nullable=False),
        sa.Column("satisfaction_record_id", sa.String(length=64), sa.ForeignKey("data_record.id", ondelete="SET NULL"), nullable=True),
        sa.Column("strategy", sa.String(length=64), nullable=False, server_default="WORK_ORDER_NO"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="SUCCESS"),
        sa.Column("message", sa.String(length=255), nullable=True),
        sa.Column("task_id", sa.String(length=64), nullable=True),
        sa.Column("operator_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_data_link_log_complaint", "data_link_log", ["complaint_record_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_data_link_log_complaint", table_name="data_link_log")
    op.drop_table("data_link_log")
    op.drop_index("ix_data_clean_log_record", table_name="data_clean_log")
    op.drop_table("data_clean_log")
    op.drop_index("ix_data_record_work_order_no", table_name="data_record")
    op.drop_index("ix_data_record_type_status_time", table_name="data_record")
    op.drop_table("data_record")
    op.drop_index("ix_data_import_row_error_task_row", table_name="data_import_row_error")
    op.drop_table("data_import_row_error")
    op.drop_index("ix_data_import_task_status", table_name="data_import_task")
    op.drop_table("data_import_task")

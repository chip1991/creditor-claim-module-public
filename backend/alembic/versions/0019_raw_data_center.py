from alembic import op
import sqlalchemy as sa

revision = "0019_raw_data_center"
down_revision = "0018_complaint_category"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "raw_data_batch",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("filename", sa.String(length=255), nullable=False, server_default=sa.text("''")),
        sa.Column("file_path", sa.String(length=512), nullable=False, server_default=sa.text("''")),
        sa.Column("file_hash", sa.String(length=64), nullable=True),
        sa.Column("sheet_name", sa.String(length=128), nullable=False, server_default=sa.text("'考核项目'")),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'RUNNING'")),
        sa.Column("total_rows", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("success_rows", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("failed_rows", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "raw_data_row",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("batch_id", sa.String(length=64), sa.ForeignKey("raw_data_batch.id", ondelete="CASCADE"), nullable=False),
        sa.Column("row_no", sa.Integer(), nullable=False),
        sa.Column("region_company", sa.String(length=128), nullable=True),
        sa.Column("project_name", sa.String(length=128), nullable=True),
        sa.Column("building_no", sa.String(length=255), nullable=True),
        sa.Column("warranty_date", sa.String(length=64), nullable=True),
        sa.Column("owner_name", sa.String(length=128), nullable=True),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("gender", sa.String(length=32), nullable=True),
        sa.Column("task_batch", sa.String(length=128), nullable=True),
        sa.Column("assigned_by", sa.String(length=128), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dialed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=True),
        sa.Column("biz_result", sa.String(length=128), nullable=True),
        sa.Column("is_connected", sa.String(length=32), nullable=True),
        sa.Column("is_valid", sa.String(length=32), nullable=True),
        sa.Column("non_resident_usable", sa.String(length=32), nullable=True),
        sa.Column("first_rating", sa.String(length=32), nullable=True),
        sa.Column("living_status", sa.String(length=32), nullable=True),
        sa.Column("call400_category", sa.String(length=128), nullable=True),
        sa.Column("general_issue", sa.Text(), nullable=True),
        sa.Column("butler_service", sa.String(length=32), nullable=True),
        sa.Column("security_service", sa.String(length=32), nullable=True),
        sa.Column("env_hygiene", sa.String(length=32), nullable=True),
        sa.Column("public_repair", sa.String(length=32), nullable=True),
        sa.Column("remark_issue", sa.Text(), nullable=True),
        sa.Column("raw_payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("batch_id", "row_no", name="uq_raw_data_row_batch_row_no"),
    )
    op.create_index("ix_raw_data_row_batch", "raw_data_row", ["batch_id"])
    op.create_index("ix_raw_data_row_batch_task", "raw_data_row", ["batch_id", "task_batch"])
    op.create_index("ix_raw_data_row_batch_valid_connected", "raw_data_row", ["batch_id", "is_valid", "is_connected"])

    op.create_table(
        "raw_issue",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("batch_id", sa.String(length=64), sa.ForeignKey("raw_data_batch.id", ondelete="CASCADE"), nullable=False),
        sa.Column("row_id", sa.Integer(), sa.ForeignKey("raw_data_row.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_field", sa.String(length=64), nullable=False),
        sa.Column("issue_text", sa.Text(), nullable=False),
        sa.Column("region_company", sa.String(length=128), nullable=True),
        sa.Column("project_name", sa.String(length=128), nullable=True),
        sa.Column("building_no", sa.String(length=255), nullable=True),
        sa.Column("task_batch", sa.String(length=128), nullable=True),
        sa.Column("dialed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_resolved", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_raw_issue_batch", "raw_issue", ["batch_id"])
    op.create_index("ix_raw_issue_batch_task", "raw_issue", ["batch_id", "task_batch"])


def downgrade() -> None:
    op.drop_index("ix_raw_issue_batch_task", table_name="raw_issue")
    op.drop_index("ix_raw_issue_batch", table_name="raw_issue")
    op.drop_table("raw_issue")
    op.drop_index("ix_raw_data_row_batch_valid_connected", table_name="raw_data_row")
    op.drop_index("ix_raw_data_row_batch_task", table_name="raw_data_row")
    op.drop_index("ix_raw_data_row_batch", table_name="raw_data_row")
    op.drop_table("raw_data_row")
    op.drop_table("raw_data_batch")


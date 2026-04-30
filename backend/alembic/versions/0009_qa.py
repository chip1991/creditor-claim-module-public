from alembic import op
import sqlalchemy as sa

revision = "0009_qa"
down_revision = "0008_workorder_warning_rule"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "qa_record",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("dsl", sa.JSON(), nullable=True),
        sa.Column("metric", sa.String(length=64), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("conclusion", sa.Text(), nullable=True),
        sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("favorited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_qa_record_created_by", "qa_record", ["created_by"])
    op.create_index("ix_qa_record_created_at", "qa_record", ["created_at"])
    op.create_index("ix_qa_record_is_favorite", "qa_record", ["is_favorite"])


def downgrade() -> None:
    op.drop_index("ix_qa_record_is_favorite", table_name="qa_record")
    op.drop_index("ix_qa_record_created_at", table_name="qa_record")
    op.drop_index("ix_qa_record_created_by", table_name="qa_record")
    op.drop_table("qa_record")

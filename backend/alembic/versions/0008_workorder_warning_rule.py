from alembic import op
import sqlalchemy as sa

revision = "0008_workorder_warning_rule"
down_revision = "0007_work_order"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_rule",
        sa.Column("key", sa.String(length=128), primary_key=True),
        sa.Column("value", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.add_column("work_order", sa.Column("soon_notified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("work_order", sa.Column("overdue_notified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("work_order", sa.Column("escalated_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_work_order_deadline", "work_order", ["deadline"])


def downgrade() -> None:
    op.drop_index("ix_work_order_deadline", table_name="work_order")
    op.drop_column("work_order", "escalated_at")
    op.drop_column("work_order", "overdue_notified_at")
    op.drop_column("work_order", "soon_notified_at")
    op.drop_table("system_rule")

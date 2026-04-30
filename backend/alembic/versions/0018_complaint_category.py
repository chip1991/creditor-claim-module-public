from alembic import op
import sqlalchemy as sa

revision = "0018_complaint_category"
down_revision = "0017_root_cause_kb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "complaint_category_lv1",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("order_no", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("name", name="uq_complaint_category_lv1_name"),
    )

    op.create_table(
        "complaint_category_lv2",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column(
            "lv1_id",
            sa.String(length=64),
            sa.ForeignKey("complaint_category_lv1.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("order_no", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("keywords", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("lv1_id", "name", name="uq_complaint_category_lv2_lv1_name"),
    )

    op.create_index("ix_complaint_category_lv2_lv1_enabled", "complaint_category_lv2", ["lv1_id", "is_enabled"])
    op.create_index("ix_complaint_category_lv2_name", "complaint_category_lv2", ["name"])


def downgrade() -> None:
    op.drop_index("ix_complaint_category_lv2_name", table_name="complaint_category_lv2")
    op.drop_index("ix_complaint_category_lv2_lv1_enabled", table_name="complaint_category_lv2")
    op.drop_table("complaint_category_lv2")
    op.drop_table("complaint_category_lv1")


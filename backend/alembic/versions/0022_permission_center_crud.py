from alembic import op
import sqlalchemy as sa

revision = "0022_permission_center_crud"
down_revision = "0021_permission_center_menu_split"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("role") as batch_op:
        batch_op.add_column(sa.Column("description", sa.String(length=255), nullable=True))

    with op.batch_alter_table("user") as batch_op:
        batch_op.add_column(sa.Column("emp_id", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("phone", sa.String(length=64), nullable=True))

    conn = op.get_bind()
    permissions = [
        ("iam:org:write", "组织维护"),
        ("iam:role:write", "角色主数据维护"),
        ("iam:user:write", "用户维护"),
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
        perm_ids = conn.execute(
            sa.text(
                "SELECT id FROM permission WHERE code IN ('iam:org:write', 'iam:role:write', 'iam:user:write')"
            )
        ).fetchall()
        for (pid,) in perm_ids:
            conn.execute(
                sa.text("INSERT OR IGNORE INTO role_permission (role_id, permission_id) VALUES (:role_id, :permission_id)"),
                {"role_id": int(role_id), "permission_id": int(pid)},
            )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "DELETE FROM role_permission WHERE permission_id IN (SELECT id FROM permission WHERE code IN ('iam:org:write', 'iam:role:write', 'iam:user:write'))"
        )
    )
    conn.execute(
        sa.text("DELETE FROM permission WHERE code IN ('iam:org:write', 'iam:role:write', 'iam:user:write')")
    )

    with op.batch_alter_table("user") as batch_op:
        batch_op.drop_column("phone")
        batch_op.drop_column("emp_id")

    with op.batch_alter_table("role") as batch_op:
        batch_op.drop_column("description")

from alembic import op
import sqlalchemy as sa

revision = "0011_seed_admin"
down_revision = "0010_report"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    dept_exists = conn.execute(sa.text("SELECT COUNT(1) FROM department")).scalar()
    if not dept_exists:
        conn.execute(sa.text("INSERT INTO department (name, parent_id, is_active) VALUES (:name, NULL, 1)"), {"name": "默认部门"})

    user_exists = conn.execute(sa.text("SELECT COUNT(1) FROM user")).scalar()
    if not user_exists:
        dept_id = conn.execute(sa.text("SELECT id FROM department ORDER BY id ASC LIMIT 1")).scalar()
        conn.execute(
            sa.text(
                "INSERT INTO user (username, password_hash, is_active, department_id) VALUES (:username, :password_hash, 1, :department_id)"
            ),
            {"username": "admin", "password_hash": "", "department_id": int(dept_id) if dept_id else None},
        )

    role_exists = conn.execute(sa.text("SELECT COUNT(1) FROM role")).scalar()
    if not role_exists:
        conn.execute(
            sa.text("INSERT INTO role (name, key, is_active, data_scope) VALUES (:name, :key, 1, :data_scope)"),
            {"name": "系统管理员", "key": "admin", "data_scope": "ALL"},
        )

    permissions = [
        ("dashboard:read", "看板查看"),
        ("report:read", "报告查看"),
        ("report:generate", "报告生成"),
        ("report:export", "报告导出"),
        ("report:delete", "报告删除"),
        ("report:config", "报告自动生成配置"),
        ("system:rules", "系统规则配置"),
        ("system:scheduler", "系统定时任务"),
    ]

    for code, name in permissions:
        existed = conn.execute(sa.text("SELECT COUNT(1) FROM permission WHERE code=:code"), {"code": code}).scalar()
        if not existed:
            conn.execute(sa.text("INSERT INTO permission (code, name, is_active) VALUES (:code, :name, 1)"), {"code": code, "name": name})

    role_id = conn.execute(sa.text("SELECT id FROM role ORDER BY id ASC LIMIT 1")).scalar()
    user_id = conn.execute(sa.text("SELECT id FROM user ORDER BY id ASC LIMIT 1")).scalar()
    if role_id and user_id:
        conn.execute(
            sa.text("INSERT OR IGNORE INTO user_role (user_id, role_id) VALUES (:user_id, :role_id)"),
            {"user_id": int(user_id), "role_id": int(role_id)},
        )
        perm_ids = conn.execute(sa.text("SELECT id FROM permission")).fetchall()
        for (pid,) in perm_ids:
            conn.execute(
                sa.text("INSERT OR IGNORE INTO role_permission (role_id, permission_id) VALUES (:role_id, :permission_id)"),
                {"role_id": int(role_id), "permission_id": int(pid)},
            )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM role_permission"))
    conn.execute(sa.text("DELETE FROM user_role"))
    conn.execute(sa.text("DELETE FROM permission WHERE code LIKE 'report:%' OR code IN ('dashboard:read','system:rules','system:scheduler')"))
    conn.execute(sa.text("DELETE FROM role WHERE key='admin'"))
    conn.execute(sa.text("DELETE FROM user WHERE username='admin'"))
    conn.execute(sa.text("DELETE FROM department WHERE name='默认部门'"))


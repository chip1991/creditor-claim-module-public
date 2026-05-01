from alembic import op
import sqlalchemy as sa

revision = "0013_permission_center_permissions"
down_revision = "0012_system_config"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    permissions = [
        ("iam:org:read", "组织查看"),
        ("iam:org:sync", "组织同步"),
        ("iam:role:read", "角色主数据查看"),
        ("iam:role:sync", "角色主数据同步"),
        ("iam:user:read", "用户查看"),
        ("iam:user:sync", "用户同步"),
        ("iam:user:status", "用户启停"),
        ("rbac:role:read", "角色配置查看"),
        ("rbac:role:write", "角色配置保存"),
        ("rbac:permission:read", "权限字典查看"),
        ("rbac:menu:read", "菜单树查看"),
        ("rbac:user:read", "用户角色查看"),
        ("rbac:user:write", "用户角色保存"),
    ]
    for code, name in permissions:
        existed = conn.execute(sa.text("SELECT COUNT(1) FROM permission WHERE code=:code"), {"code": code}).scalar()
        if not existed:
            conn.execute(sa.text("INSERT INTO permission (code, name, is_active) VALUES (:code, :name, 1)"), {"code": code, "name": name})

    role_id = conn.execute(sa.text("SELECT id FROM role WHERE key='admin' ORDER BY id ASC LIMIT 1")).scalar()
    if role_id:
        perm_ids = conn.execute(sa.text("SELECT id FROM permission WHERE code LIKE 'iam:%' OR code LIKE 'rbac:%'")).fetchall()
        for (pid,) in perm_ids:
            conn.execute(
                sa.text("INSERT OR IGNORE INTO role_permission (role_id, permission_id) VALUES (:role_id, :permission_id)"),
                {"role_id": int(role_id), "permission_id": int(pid)},
            )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM role_permission WHERE permission_id IN (SELECT id FROM permission WHERE code LIKE 'iam:%' OR code LIKE 'rbac:%')"))
    conn.execute(sa.text("DELETE FROM permission WHERE code LIKE 'iam:%' OR code LIKE 'rbac:%'"))


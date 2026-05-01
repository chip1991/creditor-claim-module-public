from alembic import op
import sqlalchemy as sa

revision = "0021_permission_center_menu_split"
down_revision = "0020_raw_data_delete_permission"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    parent_id = "grp_system"
    old_id = "/system/permission-center"
    new_nodes = [
        {"id": "/system/permission-center/orgs", "name": "组织管理", "path": "/system/permission-center/orgs", "order_no": 10},
        {"id": "/system/permission-center/roles", "name": "角色管理", "path": "/system/permission-center/roles", "order_no": 11},
        {"id": "/system/permission-center/users", "name": "用户管理", "path": "/system/permission-center/users", "order_no": 12},
    ]

    for node in new_nodes:
        conn.execute(
            sa.text(
                "INSERT OR IGNORE INTO menu (id, name, path, permission_code, parent_id, order_no, is_active) "
                "VALUES (:id, :name, :path, NULL, :parent_id, :order_no, 1)"
            ),
            {"id": node["id"], "name": node["name"], "path": node["path"], "parent_id": parent_id, "order_no": int(node["order_no"])},
        )

    conn.execute(sa.text("UPDATE menu SET is_active=0 WHERE id=:id"), {"id": old_id})

    role_ids = conn.execute(sa.text("SELECT DISTINCT role_id FROM role_menu WHERE menu_id=:menu_id"), {"menu_id": old_id}).fetchall()
    for (role_id,) in role_ids:
        for node in new_nodes:
            conn.execute(
                sa.text("INSERT OR IGNORE INTO role_menu (role_id, menu_id) VALUES (:role_id, :menu_id)"),
                {"role_id": int(role_id), "menu_id": node["id"]},
            )


def downgrade() -> None:
    conn = op.get_bind()
    old_id = "/system/permission-center"
    new_ids = [
        "/system/permission-center/orgs",
        "/system/permission-center/roles",
        "/system/permission-center/users",
    ]
    for mid in new_ids:
        conn.execute(sa.text("DELETE FROM role_menu WHERE menu_id=:mid"), {"mid": mid})
        conn.execute(sa.text("DELETE FROM menu WHERE id=:mid"), {"mid": mid})
    conn.execute(sa.text("UPDATE menu SET is_active=1 WHERE id=:id"), {"id": old_id})


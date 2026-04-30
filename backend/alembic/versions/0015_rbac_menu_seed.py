from alembic import op
import sqlalchemy as sa
import json

revision = "0015_rbac_menu_seed"
down_revision = "0014_rbac_menu"
branch_labels = None
depends_on = None


def _safe_load_list(raw: str | None) -> list:
    if not raw:
        return []
    try:
        v = json.loads(raw)
    except Exception:
        return []
    return v if isinstance(v, list) else []


def _walk_insert(conn, nodes: list, parent_id: str | None) -> None:
    for idx, node in enumerate(nodes):
        if not isinstance(node, dict):
            continue
        menu_id = node.get("id")
        name = node.get("name")
        if not isinstance(menu_id, str) or not menu_id:
            continue
        if not isinstance(name, str) or not name:
            continue
        conn.execute(
            sa.text(
                "INSERT OR IGNORE INTO menu (id, name, path, permission_code, parent_id, order_no, is_active) "
                "VALUES (:id, :name, :path, :permission_code, :parent_id, :order_no, 1)"
            ),
            {
                "id": menu_id,
                "name": name,
                "path": node.get("path"),
                "permission_code": node.get("permissionCode"),
                "parent_id": parent_id,
                "order_no": int(idx),
            },
        )
        children = node.get("children")
        if isinstance(children, list) and children:
            _walk_insert(conn, children, menu_id)


def upgrade() -> None:
    conn = op.get_bind()
    row = conn.execute(
        sa.text(
            "SELECT value FROM system_config WHERE key='rbac:menu_tree' AND enabled=1 ORDER BY version DESC LIMIT 1"
        )
    ).fetchone()
    tree = _safe_load_list(row[0] if row else None)
    if tree:
        _walk_insert(conn, tree, None)

    menu_count = conn.execute(sa.text("SELECT COUNT(1) FROM menu")).scalar() or 0
    if int(menu_count) <= 0:
        default_tree = [
            {
                "id": "grp_data_center",
                "name": "数据中心",
                "children": [{"id": "/data/center", "name": "数据管理中心", "path": "/data/center"}],
            },
            {
                "id": "grp_analysis",
                "name": "AI分析",
                "children": [{"id": "/analysis/list", "name": "投诉AI分析", "path": "/analysis/list"}],
            },
            {
                "id": "grp_workorder",
                "name": "整改闭环",
                "children": [{"id": "/workorder/list", "name": "工单管理", "path": "/workorder/list"}],
            },
            {
                "id": "grp_dashboard",
                "name": "数据看板",
                "children": [{"id": "/dashboard", "name": "可视化看板", "path": "/dashboard"}],
            },
            {
                "id": "grp_assistant",
                "name": "智能助手",
                "children": [
                    {"id": "/assistant/qa", "name": "AI智能问答", "path": "/assistant/qa"},
                    {"id": "/assistant/report", "name": "自动化报告", "path": "/assistant/report"},
                ],
            },
            {
                "id": "grp_system",
                "name": "系统管理",
                "children": [
                    {"id": "/system/category", "name": "投诉分类配置", "path": "/system/category"},
                    {"id": "/system/knowledge", "name": "根因知识库配置", "path": "/system/knowledge"},
                    {"id": "/system/permission-center", "name": "权限中心", "path": "/system/permission-center"},
                    {"id": "/system/rules", "name": "智能体规则配置", "path": "/system/rules"},
                ],
            },
        ]
        _walk_insert(conn, default_tree, None)

    role_id = conn.execute(sa.text("SELECT id FROM role WHERE key='admin' ORDER BY id ASC LIMIT 1")).scalar()
    if role_id:
        menu_ids = conn.execute(sa.text("SELECT id FROM menu")).fetchall()
        for (mid,) in menu_ids:
            conn.execute(
                sa.text("INSERT OR IGNORE INTO role_menu (role_id, menu_id) VALUES (:role_id, :menu_id)"),
                {"role_id": int(role_id), "menu_id": str(mid)},
            )


def downgrade() -> None:
    pass


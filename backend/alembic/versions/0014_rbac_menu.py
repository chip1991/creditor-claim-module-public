from alembic import op
import sqlalchemy as sa
import json

revision = "0014_rbac_menu"
down_revision = "0013_permission_center_permissions"
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


def upgrade() -> None:
    op.create_table(
        "menu",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("path", sa.String(length=255), nullable=True),
        sa.Column("permission_code", sa.String(length=128), nullable=True),
        sa.Column("parent_id", sa.String(length=64), sa.ForeignKey("menu.id", ondelete="SET NULL"), nullable=True),
        sa.Column("order_no", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "role_menu",
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("role.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("menu_id", sa.String(length=64), sa.ForeignKey("menu.id", ondelete="CASCADE"), primary_key=True),
    )

    conn = op.get_bind()
    row = conn.execute(
        sa.text(
            "SELECT value FROM system_config WHERE key='rbac:menu_tree' AND enabled=1 ORDER BY version DESC LIMIT 1"
        )
    ).fetchone()
    tree = _safe_load_list(row[0] if row else None)

    def walk(nodes: list, parent_id: str | None) -> None:
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
                walk(children, menu_id)

    if tree:
        walk(tree, None)

    rows = conn.execute(
        sa.text(
            "SELECT key, value FROM system_config WHERE key LIKE :pattern AND enabled=1 ORDER BY version DESC"
        )
        ,
        {"pattern": "rbac:role:%:menus"},
    ).fetchall()
    latest: dict[str, str | None] = {}
    for key, value in rows:
        if key not in latest:
            latest[str(key)] = value

    for key, value in latest.items():
        parts = key.split(":")
        if len(parts) != 4:
            continue
        role_id_raw = parts[2]
        if not role_id_raw.isdigit():
            continue
        role_id = int(role_id_raw)
        menu_ids = _safe_load_list(value)
        for mid in menu_ids:
            if not isinstance(mid, str) or not mid:
                continue
            existed = conn.execute(sa.text("SELECT 1 FROM menu WHERE id=:id LIMIT 1"), {"id": mid}).fetchone()
            if not existed:
                continue
            conn.execute(
                sa.text("INSERT OR IGNORE INTO role_menu (role_id, menu_id) VALUES (:role_id, :menu_id)"),
                {"role_id": role_id, "menu_id": mid},
            )


def downgrade() -> None:
    op.drop_table("role_menu")
    op.drop_table("menu")

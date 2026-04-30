from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import CurrentUser, require_admin_or_permissions
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.rbac import Department, Role, User, user_role


router = APIRouter()


def _migrated_response(*, migrated_to: str) -> JSONResponse:
    return JSONResponse(
        status_code=410,
        content={"code": "MIGRATED", "msg": f"接口已迁移，请使用 {migrated_to}", "data": {"migratedTo": migrated_to}},
    )


@router.api_route("/v1/orgs", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], response_model=ApiResponse)
def v1_orgs(
    request: Request,
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    parentId: int | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("iam:org:read")),
) -> ApiResponse | JSONResponse:
    if request.method != "GET":
        return _migrated_response(migrated_to="/api/iam/org/page")

    page = max(1, page)
    size = max(1, min(200, size))

    base = select(Department).options(selectinload(Department.parent))
    if parentId is not None:
        base = base.where(Department.parent_id == parentId)
    if keyword:
        kw = f"%{keyword.strip()}%"
        base = base.where(Department.name.ilike(kw))

    count_stmt = select(func.count()).select_from(base.subquery())
    total = int(db.execute(count_stmt).scalar() or 0)

    rows = db.execute(base.order_by(Department.id.asc()).offset((page - 1) * size).limit(size)).scalars().all()
    all_depts = db.execute(select(Department.id, Department.parent_id, Department.name)).all()
    parent_map = {int(r[0]): int(r[1]) if r[1] is not None else None for r in all_depts}
    name_map = {int(r[0]): str(r[2]) for r in all_depts}
    level_cache: dict[int, int] = {}

    def calc_level(dept_id: int) -> int:
        if dept_id in level_cache:
            return level_cache[dept_id]
        seen: set[int] = set()
        cur = dept_id
        level = 0
        while cur is not None and cur not in seen:
            seen.add(cur)
            cur = parent_map.get(cur)
            if cur is not None:
                level += 1
        level_cache[dept_id] = level
        return level

    records = [
        {
            "id": d.id,
            "name": d.name,
            "code": None,
            "parent": name_map.get(d.parent_id) if d.parent_id else None,
            "parentId": d.parent_id,
            "level": calc_level(d.id),
            "syncTime": getattr(d, "updated_at", None),
            "isActive": bool(d.is_active),
        }
        for d in rows
    ]
    return ApiResponse(data={"total": total, "records": records})


@router.api_route("/v1/roles", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], response_model=ApiResponse)
def v1_roles(
    request: Request,
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("iam:role:read")),
) -> ApiResponse | JSONResponse:
    if request.method != "GET":
        return _migrated_response(migrated_to="/api/iam/roles/page")

    page = max(1, page)
    size = max(1, min(200, size))

    base = select(Role)
    if keyword:
        kw = f"%{keyword.strip()}%"
        base = base.where(or_(Role.name.ilike(kw), Role.key.ilike(kw)))

    count_stmt = select(func.count()).select_from(base.subquery())
    total = int(db.execute(count_stmt).scalar() or 0)
    rows = db.execute(base.order_by(Role.id.asc()).offset((page - 1) * size).limit(size)).scalars().all()

    role_ids = [r.id for r in rows]
    role_user_counts: dict[int, int] = {}
    if role_ids:
        count_rows = db.execute(
            select(user_role.c.role_id, func.count(user_role.c.user_id))
            .where(user_role.c.role_id.in_(role_ids))
            .group_by(user_role.c.role_id)
        ).all()
        role_user_counts = {int(r[0]): int(r[1]) for r in count_rows}

    records = [
        {
            "id": r.id,
            "name": r.name,
            "code": r.key,
            "desc": None,
            "users": role_user_counts.get(r.id, 0),
            "syncTime": getattr(r, "updated_at", None),
            "isActive": bool(r.is_active),
        }
        for r in rows
    ]
    return ApiResponse(data={"total": total, "records": records})


@router.api_route("/v1/users", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], response_model=ApiResponse)
def v1_users(
    request: Request,
    page: int = 1,
    size: int = 20,
    keyword: str | None = None,
    deptId: int | None = None,
    orgId: int | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_permissions("iam:user:read")),
) -> ApiResponse | JSONResponse:
    if request.method != "GET":
        return _migrated_response(migrated_to="/api/iam/users/page")

    page = max(1, page)
    size = max(1, min(200, size))
    target_dept_id = deptId if deptId is not None else orgId

    base = select(User).join(Department, Department.id == User.department_id, isouter=True).options(selectinload(User.department))
    if target_dept_id is not None:
        base = base.where(User.department_id == target_dept_id)
    if keyword:
        kw = f"%{keyword.strip()}%"
        base = base.where(or_(User.username.ilike(kw), Department.name.ilike(kw)))

    count_stmt = select(func.count()).select_from(base.subquery())
    total = int(db.execute(count_stmt).scalar() or 0)
    rows = db.execute(base.order_by(User.id.asc()).offset((page - 1) * size).limit(size)).scalars().all()

    records = [
        {
            "id": u.id,
            "name": u.username,
            "empId": None,
            "phone": None,
            "org": u.department.name if u.department else None,
            "orgId": u.department_id,
            "status": "启用" if u.is_active else "禁用",
            "syncTime": getattr(u, "updated_at", None),
        }
        for u in rows
    ]
    return ApiResponse(data={"total": total, "records": records})


from __future__ import annotations

import os
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permissions
from app.core.errors import AppError
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.report import Report, ReportAutoConfig
from app.schemas.report import ReportAutoConfigSaveRequest, ReportDeleteRequest, ReportGenerateRequest, ReportGenerateResponse
from app.services.audit import create_audit_log
from app.services.report import export_report_pdf, new_id, run_report_generate_task
from app.services.data_center import to_datetime


router = APIRouter()


def _report_user(
    current_user: CurrentUser = Depends(
        require_permissions("report:read", "dashboard:read", "analysis:read", "workorder:read", "data:read", mode="any")
    ),
) -> CurrentUser:
    return current_user


@router.post("/report/generate", response_model=ApiResponse)
def report_generate(
    background_tasks: BackgroundTasks,
    payload: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("report:generate", "dashboard:read", mode="any")),
) -> ApiResponse:
    report_id = new_id()
    task_id = new_id()
    create_audit_log(
        db,
        entity_type="task",
        entity_id=task_id,
        action="REPORT_GENERATE_TASK_CREATE",
        actor=current_user,
        after={"reportId": report_id, **payload.model_dump()},
        source="api:/report/generate",
    )
    db.commit()
    background_tasks.add_task(
        run_report_generate_task,
        task_id=task_id,
        report_id=report_id,
        report_type=payload.reportType,
        start_time=payload.startTime,
        end_time=payload.endTime,
        notify_user_ids=payload.notifyUserIds,
        actor_id=current_user.id,
    )
    return ApiResponse(data=ReportGenerateResponse(taskId=task_id, reportId=report_id).model_dump())


@router.get("/report/page", response_model=ApiResponse)
def report_page(
    page: int = 1,
    size: int = 20,
    reportType: str | None = None,
    keyword: str | None = None,
    status: str | None = None,
    startTime: str | None = None,
    endTime: str | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(_report_user),
) -> ApiResponse:
    start_dt = to_datetime(startTime) if startTime else None
    end_dt = to_datetime(endTime) if endTime else None

    clauses = []
    if reportType:
        clauses.append(Report.report_type == reportType.strip())
    if status:
        clauses.append(Report.status == status.strip())
    if keyword:
        k = keyword.strip()
        clauses.append(or_(Report.title.like(f"%{k}%"), Report.content.like(f"%{k}%")))
    if start_dt:
        clauses.append(Report.created_at >= start_dt)
    if end_dt:
        clauses.append(Report.created_at <= end_dt)

    base = select(Report)
    if clauses:
        base = base.where(and_(*clauses))

    total = int(db.execute(select(func.count()).select_from(base.subquery())).scalar_one() or 0)
    rows = (
        db.execute(
            base.order_by(Report.created_at.desc(), Report.id.desc())
            .offset((max(1, page) - 1) * max(1, min(200, size)))
            .limit(max(1, min(200, size)))
        )
        .scalars()
        .all()
    )

    def to_item(r: Report) -> dict:
        create_time = r.created_at.strftime("%Y-%m-%d %H:%M:%S") if isinstance(r.created_at, datetime) else None
        return {"id": r.id, "reportType": r.report_type, "title": r.title, "createTime": create_time, "status": r.status}

    return ApiResponse(data={"total": total, "records": [to_item(r) for r in rows]})


@router.get("/report/detail", response_model=ApiResponse)
def report_detail(id: str, db: Session = Depends(get_db), current_user: CurrentUser = Depends(_report_user)) -> ApiResponse:
    row = db.get(Report, id)
    if row is None:
        raise AppError(code="NOT_FOUND", msg="报告不存在", status_code=404)
    create_time = row.created_at.strftime("%Y-%m-%d %H:%M:%S") if isinstance(row.created_at, datetime) else None
    data = {
        "id": row.id,
        "reportType": row.report_type,
        "title": row.title,
        "createTime": create_time,
        "status": row.status,
        "content": row.content,
        "contentJson": row.content_json,
        "fileRef": row.file_ref,
        "periodStart": row.period_start,
        "periodEnd": row.period_end,
        "generatedAt": row.generated_at,
    }
    return ApiResponse(data=data)


@router.get("/report/export")
def report_export(
    id: str,
    format: str = "pdf",
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("report:export", "dashboard:read", mode="any")),
) -> FileResponse:
    fmt = (format or "pdf").lower()
    if fmt != "pdf":
        raise AppError(code="INVALID_FORMAT", msg="导出格式不支持", status_code=400)
    path = export_report_pdf(db, report_id=id, actor=current_user, source="api:/report/export")
    db.commit()
    filename = os.path.basename(path) or "report.pdf"
    return FileResponse(path=path, filename=filename, media_type="application/pdf")


@router.post("/report/delete", response_model=ApiResponse)
def report_delete(
    payload: ReportDeleteRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("report:delete", "dashboard:read", mode="any")),
) -> ApiResponse:
    row = db.get(Report, payload.id)
    if row is None:
        raise AppError(code="NOT_FOUND", msg="报告不存在", status_code=404)
    before = {"id": row.id, "reportType": row.report_type, "title": row.title, "status": row.status}
    file_ref = row.file_ref if isinstance(row.file_ref, dict) else None
    db.delete(row)
    create_audit_log(
        db,
        entity_type="report",
        entity_id=payload.id,
        action="REPORT_DELETE",
        actor=current_user,
        before=before,
        source="api:/report/delete",
    )
    db.commit()
    if file_ref and isinstance(file_ref.get("pdf"), dict):
        path = file_ref.get("pdf", {}).get("path")
        if isinstance(path, str) and path.startswith("/workspace/backend/.data/") and os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass
    return ApiResponse(data={"deleted": True})


@router.get("/report/auto-config/list", response_model=ApiResponse)
def report_auto_config_list(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("report:config", "system:rules", "dashboard:read", mode="any")),
) -> ApiResponse:
    rows = db.execute(select(ReportAutoConfig).order_by(ReportAutoConfig.id.desc())).scalars().all()
    items = []
    for r in rows:
        items.append(
            {
                "id": r.id,
                "reportType": r.report_type,
                "cycle": r.cycle,
                "enabled": bool(r.enabled),
                "runTime": r.run_time,
                "weekday": r.weekday,
                "dayOfMonth": r.day_of_month,
                "notifyUserIds": r.notify_user_ids if isinstance(r.notify_user_ids, list) else None,
                "lastRunAt": r.last_run_at,
                "createdAt": r.created_at,
            }
        )
    return ApiResponse(data={"records": items, "total": len(items)})


@router.post("/report/auto-config/save", response_model=ApiResponse)
def report_auto_config_save(
    payload: ReportAutoConfigSaveRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("report:config", "system:rules", mode="any")),
) -> ApiResponse:
    row = db.get(ReportAutoConfig, payload.id) if payload.id else None
    before = None
    if row is not None:
        before = {
            "reportType": row.report_type,
            "cycle": row.cycle,
            "enabled": bool(row.enabled),
            "runTime": row.run_time,
            "weekday": row.weekday,
            "dayOfMonth": row.day_of_month,
            "notifyUserIds": row.notify_user_ids if isinstance(row.notify_user_ids, list) else None,
        }
    if row is None:
        row = ReportAutoConfig(created_by=current_user.id)
        db.add(row)
    row.report_type = payload.reportType
    row.cycle = payload.cycle
    row.enabled = bool(payload.enabled)
    row.run_time = payload.runTime
    row.weekday = payload.weekday
    row.day_of_month = payload.dayOfMonth
    row.notify_user_ids = payload.notifyUserIds
    db.flush()
    create_audit_log(
        db,
        entity_type="report_auto_config",
        entity_id=str(row.id),
        action="REPORT_AUTO_CONFIG_SAVE",
        actor=current_user,
        before=before,
        after={
            "reportType": row.report_type,
            "cycle": row.cycle,
            "enabled": bool(row.enabled),
            "runTime": row.run_time,
            "weekday": row.weekday,
            "dayOfMonth": row.day_of_month,
            "notifyUserIds": row.notify_user_ids if isinstance(row.notify_user_ids, list) else None,
        },
        source="api:/report/auto-config/save",
    )
    db.commit()
    return ApiResponse(data={"id": row.id})


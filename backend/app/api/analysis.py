from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permissions
from app.core.errors import AppError
from app.core.response import ApiResponse
from app.db.session import get_db
from app.models.complaint_analysis import ComplaintAnalysis
from app.models.data_center import DataRecord
from app.models.task import TaskStatus
from app.schemas.analysis import (
    AnalysisDetailResponse,
    AnalysisOverrideRequest,
    AnalysisPageResponse,
    AnalysisRerunRequest,
    AnalysisRunRequest,
    AnalysisTaskResponse,
)
from app.services.analysis import new_id, override_analysis, rerun_analysis_task, run_analysis_task
from app.services.audit import create_audit_log
from app.services.data_center import to_datetime
from app.tasks.progress import update_task_progress


router = APIRouter()


@router.post("/analysis/run", response_model=ApiResponse)
def analysis_run(
    background_tasks: BackgroundTasks,
    payload: AnalysisRunRequest | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("analysis:run")),
) -> ApiResponse:
    task_id = new_id()
    body = payload.model_dump() if payload else {}
    create_audit_log(
        db,
        entity_type="task",
        entity_id=task_id,
        action="ANALYSIS_START",
        actor=current_user,
        after=body,
    )
    db.commit()
    update_task_progress(None, task_id=task_id, status=TaskStatus.PENDING, progress=0, message="任务已创建，等待执行")
    background_tasks.add_task(
        run_analysis_task,
        task_id=task_id,
        record_ids=payload.recordIds if payload else None,
        work_order_nos=payload.workOrderNos if payload else None,
        force_override=payload.forceOverride if payload else False,
        actor_id=current_user.id,
    )
    return ApiResponse(data=AnalysisTaskResponse(taskId=task_id).model_dump())


@router.get("/analysis/page", response_model=ApiResponse)
def analysis_page(
    page: int = 1,
    size: int = 20,
    workOrderNo: str | None = None,
    category: str | None = None,
    department: str | None = None,
    riskLevel: str | None = None,
    startTime: str | None = None,
    endTime: str | None = None,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_permissions("analysis:read")),
) -> ApiResponse:
    start_dt = to_datetime(startTime) if startTime else None
    end_dt = to_datetime(endTime) if endTime else None
    clauses = [ComplaintAnalysis.complaint_record_id.is_not(None)]
    if workOrderNo:
        clauses.append(ComplaintAnalysis.work_order_no.like(f"%{workOrderNo.strip()}%"))
    if category:
        clauses.append(ComplaintAnalysis.category_lv1.like(f"%{category.strip()}%"))
    if department:
        clauses.append(ComplaintAnalysis.responsible_dept.like(f"%{department.strip()}%"))
    if riskLevel:
        clauses.append(ComplaintAnalysis.risk_level == riskLevel)

    stmt = (
        select(ComplaintAnalysis, DataRecord)
        .join(DataRecord, ComplaintAnalysis.complaint_record_id == DataRecord.id)
        .where(and_(*clauses))
    )
    if start_dt:
        stmt = stmt.where(DataRecord.event_time >= start_dt)
    if end_dt:
        stmt = stmt.where(DataRecord.event_time <= end_dt)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = (
        db.execute(
            stmt.order_by(DataRecord.event_time.desc().nullslast(), ComplaintAnalysis.updated_at.desc())
            .offset((max(1, page) - 1) * max(1, min(200, size)))
            .limit(max(1, min(200, size)))
        )
        .all()
    )

    def to_item(r: ComplaintAnalysis, d: DataRecord) -> dict:
        owner_info = " / ".join([x for x in [d.owner_name, d.building_room, d.phone] if x])
        complaint_time: str | None = None
        if isinstance(d.event_time, datetime):
            complaint_time = d.event_time.strftime("%Y-%m-%d %H:%M:%S")
        summary_src = (d.cleaned_text or d.raw_text or "").strip()
        summary = summary_src[:60] if summary_src else None
        return {
            "id": r.id,
            "workOrderNo": r.work_order_no,
            "ownerInfo": owner_info or None,
            "complaintTime": complaint_time,
            "complaintSummary": summary,
            "categoryLv1": r.category_lv1,
            "department": r.responsible_dept,
            "riskLevel": r.risk_level,
            "status": r.status,
        }

    data = AnalysisPageResponse(total=int(total), records=[to_item(r, d) for r, d in rows]).model_dump()
    return ApiResponse(data=data)


@router.get("/analysis/detail", response_model=ApiResponse)
def analysis_detail(
    id: str,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_permissions("analysis:read")),
) -> ApiResponse:
    row = db.get(ComplaintAnalysis, id)
    if row is None:
        raise AppError(code="NOT_FOUND", msg="分析记录不存在", status_code=404)
    complaint = db.get(DataRecord, row.complaint_record_id)
    if complaint is None:
        raise AppError(code="NOT_FOUND", msg="关联投诉数据不存在", status_code=404)

    owner_info = " / ".join([x for x in [complaint.owner_name, complaint.building_room, complaint.phone] if x])
    complaint_time: str | None = None
    if isinstance(complaint.event_time, datetime):
        complaint_time = complaint.event_time.strftime("%Y-%m-%d %H:%M:%S")

    evidence = row.evidence_snippets if isinstance(row.evidence_snippets, list) else []
    evidence_lines = []
    for e in evidence:
        if not isinstance(e, dict):
            continue
        text = str(e.get("text") or "").strip()
        reason = str(e.get("reason") or "").strip()
        if text and reason:
            evidence_lines.append(f"- {text}（{reason}）")
        elif text:
            evidence_lines.append(f"- {text}")

    suggested = row.suggested_rectification if isinstance(row.suggested_rectification, dict) else None
    suggested_line = ""
    if suggested and suggested.get("requirement"):
        deadline = suggested.get("deadline")
        if deadline:
            suggested_line = f"整改建议：{suggested.get('requirement')}（建议时限：{deadline}）"
        else:
            suggested_line = f"整改建议：{suggested.get('requirement')}"

    result_lines = [
        f"一级分类：{row.category_lv1 or '-'}",
        f"二级分类：{row.category_lv2 or '-'}",
        f"表层问题：{row.root_cause_surface or '-'}",
        f"直接原因：{row.root_cause_direct or '-'}",
        f"深层管理根因：{row.root_cause_deep or '-'}",
        f"责任部门：{row.responsible_dept or '-'}",
        f"风险等级：{row.risk_level or '-'}",
        f"重复投诉：{'是' if row.is_repeated else '否'}",
        f"置信度：{row.confidence:.2f}",
    ]
    if evidence_lines:
        result_lines.append("证据片段：")
        result_lines.extend(evidence_lines)
    if suggested_line:
        result_lines.append(suggested_line)

    detail = AnalysisDetailResponse(
        id=row.id,
        workOrderNo=row.work_order_no,
        ownerInfo=owner_info or None,
        complaintTime=complaint_time,
        agent=complaint.agent_name,
        categoryLv1=row.category_lv1,
        categoryLv2=row.category_lv2,
        rootCauseLv1=row.root_cause_surface,
        rootCauseLv2=row.root_cause_direct,
        rootCauseLv3=row.root_cause_deep,
        department=row.responsible_dept,
        riskLevel=row.risk_level,
        isRepeatedComplaint=row.is_repeated,
        confidence=row.confidence,
        evidenceSnippets=evidence,
        modelVersion=row.model_version,
        analyzedAt=row.analyzed_at if isinstance(row.analyzed_at, datetime) else None,
        rawContent=complaint.raw_text,
        analysisResult="\n".join(result_lines),
        suggestedRectification=suggested,
        manualOverridden=row.manual_overridden,
        status=row.status,
    ).model_dump()
    return ApiResponse(data=detail)


@router.post("/analysis/override", response_model=ApiResponse)
def analysis_override(
    payload: AnalysisOverrideRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("analysis:override")),
) -> ApiResponse:
    row = override_analysis(
        db,
        analysis_id=payload.id,
        patch=payload.patch.model_dump(exclude_none=True),
        reason=payload.reason,
        actor=current_user,
    )
    db.commit()
    return ApiResponse(data={"id": row.id})


@router.post("/analysis/rerun", response_model=ApiResponse)
def analysis_rerun(
    background_tasks: BackgroundTasks,
    payload: AnalysisRerunRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permissions("analysis:rerun")),
) -> ApiResponse:
    task_id = new_id()
    create_audit_log(
        db,
        entity_type="task",
        entity_id=task_id,
        action="ANALYSIS_RERUN_START",
        actor=current_user,
        after={"analysisId": payload.id, "forceOverride": payload.forceOverride},
    )
    db.commit()

    update_task_progress(None, task_id=task_id, status=TaskStatus.PENDING, progress=0, message="任务已创建，等待执行")
    background_tasks.add_task(
        rerun_analysis_task,
        task_id=task_id,
        analysis_id=payload.id,
        force_override=payload.forceOverride,
        actor_id=current_user.id,
    )
    return ApiResponse(data=AnalysisTaskResponse(taskId=task_id).model_dump())

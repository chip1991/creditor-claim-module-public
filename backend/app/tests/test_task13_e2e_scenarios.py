from __future__ import annotations

from io import BytesIO

from openpyxl import Workbook
from sqlalchemy import func, select

from app.models import AuditLog, ComplaintAnalysis, DataLinkLog, DataRecord, DataStatus, DataType, SatisfactionRecord, WorkOrder
from app.services.data_center import ImportConflictStrategy, create_import_task_row, new_id, run_clean_task, run_import_task, run_link_task, save_upload_bytes
from app.services.analysis import run_analysis_task
from app.services.workorder import create_work_order, run_satisfaction_check, submit_work_order, verify_work_order


def _xlsx_bytes(headers: list[str], rows: list[list[object]]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _import_excel(db, actor, *, filename: str, content: bytes) -> str:
    task_id = new_id()
    path = save_upload_bytes(filename, content)
    create_import_task_row(
        db,
        task_id=task_id,
        filename=filename,
        file_path=path,
        conflict_strategy=ImportConflictStrategy.REJECT,
        actor=actor,
    )
    db.commit()
    run_import_task(task_id=task_id, actor_id=actor.id)
    return task_id


def test_scenario_a_standard_close_loop(db, actor):
    complaint_xlsx = _xlsx_bytes(
        [
            "数据类型",
            "关联工单号",
            "业主姓名",
            "楼栋房号",
            "联系电话",
            "通话时间",
            "通话时长（秒）",
            "接待坐席",
            "原始数据内容",
        ],
        [
            [
                DataType.COMPLAINT.value,
                "WO-A-001",
                "张三",
                "A-1-1201",
                "13800000001",
                "2026-04-29 10:00:00",
                120,
                "坐席01",
                "电梯故障，电梯停梯，困在电梯里很久无人处理",
            ]
        ],
    )
    _import_excel(db, actor, filename="complaint_a.xlsx", content=complaint_xlsx)
    db.expire_all()

    complaint = db.execute(select(DataRecord).where(DataRecord.data_type == DataType.COMPLAINT.value, DataRecord.work_order_no == "WO-A-001")).scalars().one()
    assert complaint.status == DataStatus.PENDING_CLEAN.value

    clean_task_id = new_id()
    run_clean_task(task_id=clean_task_id, record_ids=[complaint.id], actor_id=actor.id)
    db.expire_all()
    complaint = db.get(DataRecord, complaint.id)
    assert complaint.status == DataStatus.CLEANED.value
    assert complaint.cleaned_text

    analysis_task_id = new_id()
    run_analysis_task(task_id=analysis_task_id, record_ids=[complaint.id], work_order_nos=None, force_override=False, actor_id=actor.id)
    db.expire_all()
    analysis = db.execute(select(ComplaintAnalysis).where(ComplaintAnalysis.complaint_record_id == complaint.id)).scalars().one()
    assert analysis.status in {"已分析", "需人工确认"}
    assert analysis.category_lv1
    assert analysis.category_lv2

    work_order = create_work_order(db, analysis_id=analysis.id, work_order_no="WO-A-001", actor=actor)
    db.commit()
    db.expire_all()
    created = db.get(WorkOrder, work_order.id)
    duplicated = create_work_order(db, analysis_id=analysis.id, work_order_no="WO-A-001", actor=actor)
    assert duplicated.id == created.id

    submit_work_order(db, work_order_id=created.id, result="已完成整改并上传凭证", actor=actor)
    db.commit()
    db.expire_all()

    verify_work_order(db, work_order_id=created.id, passed=True, reason="核验通过", actor=actor)
    db.commit()
    db.expire_all()

    satisfaction_xlsx = _xlsx_bytes(
        [
            "数据类型",
            "关联工单号",
            "业主姓名",
            "楼栋房号",
            "联系电话",
            "回访时间",
            "回访坐席",
            "满意度评分（1-10）",
            "原始数据内容",
        ],
        [[DataType.SATISFACTION_400.value, "WO-A-001", "张三", "A-1-1201", "13800000001", "2026-04-29 12:00:00", "回访01", 9, "回访满意，问题已解决"]],
    )
    _import_excel(db, actor, filename="satisfaction_a.xlsx", content=satisfaction_xlsx)
    db.expire_all()

    clean_task_id2 = new_id()
    run_clean_task(task_id=clean_task_id2, record_ids=None, actor_id=actor.id)
    link_task_id = new_id()
    run_link_task(task_id=link_task_id, record_ids=None, actor_id=actor.id)
    db.expire_all()

    complaint = db.get(DataRecord, complaint.id)
    assert complaint.status == DataStatus.LINKED.value
    assert complaint.linked_record_id

    best = db.get(DataRecord, complaint.linked_record_id)
    assert best is not None
    assert best.data_type == DataType.SATISFACTION_400.value

    work_order = db.get(WorkOrder, created.id)
    run_satisfaction_check(db, row=work_order, actor=actor, trigger="import")
    db.commit()
    db.expire_all()

    work_order = db.get(WorkOrder, created.id)
    assert work_order.close_status == "已闭环"
    assert work_order.rectification_status == "已闭环"
    assert work_order.satisfaction_check_status == "校验通过"

    audit_actions = set(db.execute(select(AuditLog.action)).scalars().all())
    for action in ["DATA_IMPORT_FINISH", "DATA_CLEAN_FINISH", "ANALYSIS_FINISH", "WORKORDER_CREATE", "WORKORDER_SUBMIT", "WORKORDER_VERIFY_PASS", "WORKORDER_SATISFACTION_CHECK", "WORKORDER_CLOSE"]:
        assert action in audit_actions


def test_scenario_b_match_failed_manual_fix(db, actor):
    complaint_xlsx = _xlsx_bytes(
        ["数据类型", "关联工单号", "业主姓名", "楼栋房号", "联系电话", "通话时间", "通话时长（秒）", "接待坐席", "原始数据内容"],
        [[DataType.COMPLAINT.value, "WO-B-001", "李四", "B-2-0801", "13800000002", "2026-04-29 09:00:00", 90, "坐席02", "电梯故障电梯故障电梯故障"]],
    )
    _import_excel(db, actor, filename="complaint_b.xlsx", content=complaint_xlsx)
    db.expire_all()
    complaint = db.execute(select(DataRecord).where(DataRecord.data_type == DataType.COMPLAINT.value, DataRecord.work_order_no == "WO-B-001")).scalars().one()
    run_clean_task(task_id=new_id(), record_ids=[complaint.id], actor_id=actor.id)
    run_analysis_task(task_id=new_id(), record_ids=[complaint.id], work_order_nos=None, force_override=False, actor_id=actor.id)
    db.expire_all()

    satisfaction_xlsx = _xlsx_bytes(
        ["数据类型", "关联工单号", "业主姓名", "楼栋房号", "联系电话", "回访时间", "回访坐席", "满意度评分（1-10）", "原始数据内容"],
        [[DataType.SATISFACTION_400.value, None, "李四", "B-2-0801", "13800000002", "2026-04-29 11:00:00", "回访02", 10, "回访满意"]],
    )
    _import_excel(db, actor, filename="satisfaction_b.xlsx", content=satisfaction_xlsx)
    db.expire_all()

    run_clean_task(task_id=new_id(), record_ids=None, actor_id=actor.id)
    run_link_task(task_id=new_id(), record_ids=None, actor_id=actor.id)
    db.expire_all()

    complaint = db.get(DataRecord, complaint.id)
    assert complaint.status == DataStatus.MATCH_FAILED.value
    assert complaint.linked_record_id is None

    broken_satisfaction = db.execute(select(DataRecord).where(DataRecord.data_type == DataType.SATISFACTION_400.value, DataRecord.work_order_no.is_(None))).scalars().one()
    manual_fix_task = new_id()
    from app.services.data_center import manual_fix_and_retry_link

    manual_fix_and_retry_link(db, record_id=broken_satisfaction.id, work_order_no="WO-B-001", task_id=manual_fix_task, actor=actor)
    db.commit()
    db.expire_all()

    complaint = db.get(DataRecord, complaint.id)
    assert complaint.status == DataStatus.LINKED.value
    assert complaint.linked_record_id == broken_satisfaction.id
    assert db.get(DataRecord, broken_satisfaction.id).linked_record_id == complaint.id

    link_logs = db.execute(select(func.count()).select_from(DataLinkLog).where(DataLinkLog.strategy == "MANUAL_FIX")).scalar_one()
    assert int(link_logs) >= 1

    analysis = db.execute(select(ComplaintAnalysis).where(ComplaintAnalysis.complaint_record_id == complaint.id)).scalars().one()
    work_order = create_work_order(db, analysis_id=analysis.id, work_order_no="WO-B-001", actor=actor)
    submit_work_order(db, work_order_id=work_order.id, result="整改完成", actor=actor)
    verify_work_order(db, work_order_id=work_order.id, passed=True, reason="核验通过", actor=actor)
    run_satisfaction_check(db, row=work_order, actor=actor, trigger="manual_fix")
    db.commit()
    db.expire_all()

    work_order = db.get(WorkOrder, work_order.id)
    assert work_order.close_status == "已闭环"
    assert work_order.satisfaction_check_status == "校验通过"


def test_scenario_c_verify_reject_and_satisfaction_auto_return(db, actor):
    complaint_xlsx = _xlsx_bytes(
        ["数据类型", "关联工单号", "业主姓名", "楼栋房号", "联系电话", "通话时间", "通话时长（秒）", "接待坐席", "原始数据内容"],
        [[DataType.COMPLAINT.value, "WO-C-001", "王五", "C-3-0602", "13800000003", "2026-04-29 08:30:00", 60, "坐席03", "电梯故障，困在电梯，电梯停梯"]],
    )
    _import_excel(db, actor, filename="complaint_c.xlsx", content=complaint_xlsx)
    db.expire_all()

    complaint = db.execute(select(DataRecord).where(DataRecord.data_type == DataType.COMPLAINT.value, DataRecord.work_order_no == "WO-C-001")).scalars().one()
    run_clean_task(task_id=new_id(), record_ids=[complaint.id], actor_id=actor.id)
    run_analysis_task(task_id=new_id(), record_ids=[complaint.id], work_order_nos=None, force_override=False, actor_id=actor.id)
    db.expire_all()

    analysis = db.execute(select(ComplaintAnalysis).where(ComplaintAnalysis.complaint_record_id == complaint.id)).scalars().one()
    work_order = create_work_order(db, analysis_id=analysis.id, work_order_no="WO-C-001", actor=actor)
    submit_work_order(db, work_order_id=work_order.id, result="第一次整改提交", actor=actor)
    db.commit()
    db.expire_all()

    verify_work_order(db, work_order_id=work_order.id, passed=False, reason="整改凭证不完整", actor=actor)
    db.commit()
    db.expire_all()
    work_order = db.get(WorkOrder, work_order.id)
    assert work_order.rectification_status == "整改中"
    assert work_order.verify_status == "核验不通过"
    assert work_order.verify_reason == "整改凭证不完整"

    submit_work_order(db, work_order_id=work_order.id, result="第二次整改提交", actor=actor)
    verify_work_order(db, work_order_id=work_order.id, passed=True, reason="复核通过", actor=actor)
    db.commit()
    db.expire_all()

    satisfaction_xlsx = _xlsx_bytes(
        ["数据类型", "关联工单号", "业主姓名", "楼栋房号", "联系电话", "回访时间", "回访坐席", "满意度评分（1-10）", "原始数据内容"],
        [[DataType.SATISFACTION_400.value, "WO-C-001", "王五", "C-3-0602", "13800000003", "2026-04-29 13:00:00", "回访03", 5, "回访不满意，问题仍存在"]],
    )
    _import_excel(db, actor, filename="satisfaction_c.xlsx", content=satisfaction_xlsx)
    run_clean_task(task_id=new_id(), record_ids=None, actor_id=actor.id)
    run_link_task(task_id=new_id(), record_ids=None, actor_id=actor.id)
    db.expire_all()

    work_order = db.get(WorkOrder, work_order.id)
    run_satisfaction_check(db, row=work_order, actor=actor, trigger="import")
    db.commit()
    db.expire_all()

    work_order = db.get(WorkOrder, work_order.id)
    assert work_order.satisfaction_check_status == "校验不通过"
    assert work_order.rectification_status == "整改中"

    latest = db.execute(select(SatisfactionRecord).where(SatisfactionRecord.work_order_id == work_order.id).order_by(SatisfactionRecord.id.desc())).scalars().first()
    assert latest is not None
    assert latest.check_status == "校验不通过"
    assert latest.rule_hits and any((isinstance(x, dict) and x.get("code") == "SCORE_TOO_LOW") for x in (latest.rule_hits or []))


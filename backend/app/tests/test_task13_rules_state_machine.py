from __future__ import annotations

from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.core.errors import AppError
from app.models import ComplaintAnalysis, DataRecord, DataStatus, DataType, WorkOrder
from app.services.analysis import ensure_analysis_row, persist_analysis_result
from app.services.analysis import analyze_complaint_record
from app.services.workorder import (
    SatisfactionCheckStatus,
    WorkOrderCloseStatus,
    WorkOrderRectificationStatus,
    WorkOrderVerifyStatus,
    run_satisfaction_check,
    verify_work_order,
)


def test_repeat_complaint_rule(db, actor):
    t1 = datetime(2026, 4, 1, 10, 0, 0, tzinfo=timezone.utc)
    r1 = DataRecord(
        id="r1",
        data_type=DataType.COMPLAINT.value,
        status=DataStatus.CLEANED.value,
        work_order_no="WO-R-001",
        phone="13911112222",
        building_room="R-1-101",
        event_time=t1,
        agent_name="坐席A",
        raw_text="电梯电梯电梯困在电梯",
        cleaned_text="电梯电梯电梯困在电梯",
    )
    db.add(r1)
    db.commit()

    row1 = ensure_analysis_row(db, record=r1, actor_id=actor.id)
    res1 = analyze_complaint_record(db, record=r1)
    persist_analysis_result(db, row=row1, record=r1, result=res1, force_override=False, actor=actor, task_id=None, action="ANALYSIS_RUN")
    db.commit()

    t2 = datetime(2026, 4, 15, 9, 0, 0, tzinfo=timezone.utc)
    r2 = DataRecord(
        id="r2",
        data_type=DataType.COMPLAINT.value,
        status=DataStatus.CLEANED.value,
        work_order_no="WO-R-002",
        phone="13911112222",
        building_room="R-1-101",
        event_time=t2,
        agent_name="坐席A",
        raw_text="电梯故障电梯故障困在电梯",
        cleaned_text="电梯故障电梯故障困在电梯",
    )
    db.add(r2)
    db.commit()

    row2 = ensure_analysis_row(db, record=r2, actor_id=actor.id)
    res2 = analyze_complaint_record(db, record=r2)
    persist_analysis_result(db, row=row2, record=r2, result=res2, force_override=False, actor=actor, task_id=None, action="ANALYSIS_RUN")
    db.commit()

    saved = db.execute(select(ComplaintAnalysis).where(ComplaintAnalysis.complaint_record_id == "r2")).scalars().one()
    assert saved.is_repeated is True


@pytest.mark.parametrize(
    ("score", "expected_result", "expected_status"),
    [
        (9, "满意", SatisfactionCheckStatus.PASSED),
        (7, "基本满意", SatisfactionCheckStatus.PASSED),
        (6, "不满意", SatisfactionCheckStatus.FAILED),
    ],
)
def test_satisfaction_threshold_mapping(db, actor, score, expected_result, expected_status):
    wo = WorkOrder(
        id=f"wo_{score}",
        analysis_id=None,
        work_order_no=f"WO-S-{score}",
        rectification_status=WorkOrderRectificationStatus.WAIT_VERIFY,
        verify_status=WorkOrderVerifyStatus.PASSED,
        close_status=WorkOrderCloseStatus.OPEN,
        warning_status="正常",
        satisfaction_check_status=SatisfactionCheckStatus.PENDING,
        department_id=None,
        department_name=None,
        assignee_id=None,
        requirement=None,
        deadline=None,
        result="已整改",
        verify_reason="核验通过",
        forced_close=False,
        forced_reason=None,
        urge_count=0,
        created_by=actor.id,
    )
    db.add(wo)
    db.add(
        DataRecord(
            id=f"sr_{score}",
            data_type=DataType.SATISFACTION_400.value,
            status=DataStatus.CLEANED.value,
            work_order_no=f"WO-S-{score}",
            event_time=datetime(2026, 4, 29, 10, 0, 0, tzinfo=timezone.utc),
            agent_name="回访",
            satisfaction_score=int(score),
            raw_text="回访记录",
            cleaned_text="回访记录",
        )
    )
    db.commit()

    rec = run_satisfaction_check(db, row=wo, actor=actor, trigger="test")
    db.commit()
    assert rec.result == expected_result
    assert rec.check_status == expected_status
    db.expire_all()
    wo = db.get(WorkOrder, wo.id)
    if expected_status == SatisfactionCheckStatus.PASSED:
        assert wo.close_status == WorkOrderCloseStatus.CLOSED
        assert wo.rectification_status == WorkOrderRectificationStatus.CLOSED
    else:
        assert wo.close_status == WorkOrderCloseStatus.OPEN
        assert wo.rectification_status == WorkOrderRectificationStatus.IN_PROGRESS


def test_verify_reject_reason_required(db, actor):
    wo = WorkOrder(
        id="wo_vr",
        analysis_id=None,
        work_order_no="WO-VR-001",
        rectification_status=WorkOrderRectificationStatus.WAIT_VERIFY,
        verify_status=WorkOrderVerifyStatus.PENDING,
        close_status=WorkOrderCloseStatus.OPEN,
        warning_status="正常",
        satisfaction_check_status=SatisfactionCheckStatus.PENDING,
        department_id=None,
        department_name=None,
        assignee_id=None,
        requirement=None,
        deadline=None,
        result="已整改",
        verify_reason=None,
        forced_close=False,
        forced_reason=None,
        urge_count=0,
        created_by=actor.id,
    )
    db.add(wo)
    db.commit()
    with pytest.raises(AppError) as ex:
        verify_work_order(db, work_order_id=wo.id, passed=False, reason=" ", actor=actor)
    assert ex.value.code == "REASON_REQUIRED"


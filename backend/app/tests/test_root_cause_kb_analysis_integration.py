from __future__ import annotations

from app.models.data_center import DataRecord, DataType
from app.models.root_cause_kb import RootCauseKb
from app.services.analysis import analyze_complaint_record


def test_analysis_uses_root_cause_kb_when_enabled(db, actor):
    db.add(
        RootCauseKb(
            id="kb1",
            category_lv1="设施设备类",
            category_lv2="电梯故障",
            level="surface",
            content="电梯故障（知识库标准表述）",
            keywords="电梯,停梯",
            is_enabled=True,
            created_by=actor.id,
            updated_by=actor.id,
        )
    )
    db.commit()

    record = DataRecord(
        id="r1",
        data_type=DataType.COMPLAINT.value,
        raw_text="电梯停了很久，住户被困在电梯里",
        cleaned_text="电梯停了很久，住户被困在电梯里",
        created_by=actor.id,
    )
    db.add(record)
    db.commit()

    result = analyze_complaint_record(db, record=record)
    assert result.category_lv1 == "设施设备类"
    assert result.category_lv2 == "电梯故障"
    assert result.root_cause_surface == "电梯故障（知识库标准表述）"


def test_analysis_falls_back_when_kb_disabled(db, actor):
    db.add(
        RootCauseKb(
            id="kb2",
            category_lv1="设施设备类",
            category_lv2="电梯故障",
            level="surface",
            content="不会被使用",
            keywords="电梯",
            is_enabled=False,
            created_by=actor.id,
            updated_by=actor.id,
        )
    )
    db.commit()

    record = DataRecord(
        id="r2",
        data_type=DataType.COMPLAINT.value,
        raw_text="电梯坏了",
        cleaned_text="电梯坏了",
        created_by=actor.id,
    )
    db.add(record)
    db.commit()

    result = analyze_complaint_record(db, record=record)
    assert result.category_lv2 == "电梯故障"
    assert result.root_cause_surface == "电梯故障"


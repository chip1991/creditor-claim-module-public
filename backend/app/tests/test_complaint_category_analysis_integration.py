from __future__ import annotations

from app.models.complaint_category import ComplaintCategoryLv1, ComplaintCategoryLv2
from app.models.data_center import DataRecord, DataType
from app.services.analysis import analyze_complaint_record


def test_analysis_uses_db_categories_when_present(db, actor):
    lv1 = ComplaintCategoryLv1(id="lv1", name="设施设备类", order_no=1, is_enabled=True, created_by=actor.id, updated_by=actor.id)
    lv2 = ComplaintCategoryLv2(
        id="lv2",
        lv1_id="lv1",
        name="电梯故障",
        order_no=1,
        is_enabled=True,
        keywords="电梯,停梯",
        created_by=actor.id,
        updated_by=actor.id,
    )
    db.add(lv1)
    db.add(lv2)
    db.commit()

    record = DataRecord(
        id="r1",
        data_type=DataType.COMPLAINT.value,
        raw_text="电梯停梯困人，太危险了",
        cleaned_text="电梯停梯困人，太危险了",
        created_by=actor.id,
    )
    db.add(record)
    db.commit()

    result = analyze_complaint_record(db, record=record)
    assert result.category_lv1 == "设施设备类"
    assert result.category_lv2 == "电梯故障"


def test_analysis_falls_back_when_db_empty(db, actor):
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


from __future__ import annotations

from io import BytesIO

from openpyxl import Workbook
from sqlalchemy import select

from app.models.data_center import DataRecord, DataType
from app.services.data_center import ImportConflictStrategy, create_import_task_row, new_id, rebuild_call_audit_raw_text_from_general_problem, run_import_task, save_upload_bytes


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


def test_call_audit_raw_text_only_general_problem(db, actor):
    xlsx = _xlsx_bytes(
        [
            "数据类型",
            "关联工单号",
            "地区公司",
            "项目名称",
            "楼栋号码",
            "是否过保",
            "姓名",
            "电话号码",
            "性别",
            "任务批次",
            "分配人",
            "分配时间",
            "拨打时间",
            "状态",
            "业务结果",
            "是否接通",
            "是否有效",
            "非常住可用",
            "首轮评价",
            "居住情况",
            "400类",
            "一般问题",
            "管家服务",
            "安保服务",
            "环境卫生",
            "公区维修",
            "调查备注问题",
        ],
        [
            [
                DataType.CALL_AUDIT.value,
                None,
                "四川公司",
                "自贡恒大未来城",
                "10栋-2单元-101",
                "2022.2.26",
                "钟某",
                "13900000000",
                "女",
                "25第三季度（个）1",
                "梁嘉文",
                "2026-04-29 10:00:00",
                "2026-04-29 10:01:00",
                "已完成",
                "已配合调查",
                "是",
                "有",
                "不可",
                "一般",
                "常住",
                "400类A",
                "T列一般问题",
                "一般",
                "不满意",
                "满意",
                "未评价",
                "备注列内容",
            ]
        ],
    )
    _import_excel(db, actor, filename="call_audit.xlsx", content=xlsx)
    db.expire_all()

    row = db.execute(select(DataRecord).where(DataRecord.data_type == DataType.CALL_AUDIT.value)).scalars().one()
    assert row.raw_text == "T列一般问题"

    row.raw_text = "备注列内容"
    db.commit()
    db.expire_all()

    result = rebuild_call_audit_raw_text_from_general_problem(db)
    db.commit()
    db.expire_all()
    assert int(result["updated"]) >= 1
    row2 = db.get(DataRecord, row.id)
    assert row2 is not None
    assert row2.raw_text == "T列一般问题"


def test_call_audit_general_problem_empty(db, actor):
    xlsx = _xlsx_bytes(
        [
            "数据类型",
            "关联工单号",
            "地区公司",
            "项目名称",
            "楼栋号码",
            "是否过保",
            "姓名",
            "电话号码",
            "性别",
            "任务批次",
            "分配人",
            "分配时间",
            "拨打时间",
            "状态",
            "业务结果",
            "是否接通",
            "是否有效",
            "非常住可用",
            "首轮评价",
            "居住情况",
            "400类",
            "一般问题",
            "管家服务",
            "安保服务",
            "环境卫生",
            "公区维修",
            "调查备注问题",
        ],
        [
            [
                DataType.CALL_AUDIT.value,
                None,
                "四川公司",
                "自贡恒大未来城",
                "10栋-2单元-101",
                "2022.2.26",
                "钟某",
                "13900000000",
                "女",
                "25第三季度（个）1",
                "梁嘉文",
                "2026-04-29 10:00:00",
                "2026-04-29 10:01:00",
                "已完成",
                "已配合调查",
                "是",
                "有",
                "不可",
                "一般",
                "常住",
                "400类A",
                "",
                "一般",
                "不满意",
                "满意",
                "未评价",
                "备注列内容",
            ]
        ],
    )
    _import_excel(db, actor, filename="call_audit_empty.xlsx", content=xlsx)
    db.expire_all()
    row = db.execute(select(DataRecord).where(DataRecord.data_type == DataType.CALL_AUDIT.value).order_by(DataRecord.created_at.desc())).scalars().first()
    assert row is not None
    assert row.raw_text == ""


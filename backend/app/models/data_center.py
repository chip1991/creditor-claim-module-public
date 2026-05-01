from __future__ import annotations

from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DataType(StrEnum):
    COMPLAINT = "业主进线投诉数据"
    SATISFACTION_400 = "400外呼满意度数据"
    CALL_AUDIT = "外呼回访考核数据"


class DataStatus(StrEnum):
    PENDING_CLEAN = "待清洗"
    CLEANED = "已清洗"
    ANALYZED = "已分析"
    LINKED = "已关联"
    MATCH_FAILED = "匹配失败"


class DataImportTask(Base):
    __tablename__ = "data_import_task"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")
    file_path: Mapped[str] = mapped_column(String(512), nullable=False, server_default="")
    conflict_strategy: Mapped[str] = mapped_column(String(32), nullable=False, server_default="REJECT")
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="RUNNING")
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    success_rows: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    failed_rows: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    conflict_rows: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    creator = relationship("User")


class DataImportRowError(Base):
    __tablename__ = "data_import_row_error"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    import_task_id: Mapped[str] = mapped_column(ForeignKey("data_import_task.id", ondelete="CASCADE"), nullable=False)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    field: Mapped[str | None] = mapped_column(String(128), nullable=True)
    message: Mapped[str] = mapped_column(String(255), nullable=False)
    raw_payload: Mapped[object | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    import_task = relationship("DataImportTask")


class DataRecord(Base):
    __tablename__ = "data_record"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    data_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, server_default=DataStatus.PENDING_CLEAN.value)
    work_order_no: Mapped[str | None] = mapped_column(String(64), nullable=True)
    event_time: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
    agent_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    owner_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    building_room: Mapped[str | None] = mapped_column(String(128), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    satisfaction_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    cleaned_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_payload: Mapped[object | None] = mapped_column(JSON, nullable=True)
    cleaned_payload: Mapped[object | None] = mapped_column(JSON, nullable=True)
    import_task_id: Mapped[str | None] = mapped_column(ForeignKey("data_import_task.id", ondelete="SET NULL"), nullable=True)
    linked_record_id: Mapped[str | None] = mapped_column(ForeignKey("data_record.id", ondelete="SET NULL"), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    import_task = relationship("DataImportTask")
    creator = relationship("User")
    linked_record = relationship("DataRecord", remote_side="DataRecord.id")


class DataCleanLog(Base):
    __tablename__ = "data_clean_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    record_id: Mapped[str] = mapped_column(ForeignKey("data_record.id", ondelete="CASCADE"), nullable=False)
    task_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    before: Mapped[object | None] = mapped_column(JSON, nullable=True)
    after: Mapped[object | None] = mapped_column(JSON, nullable=True)
    message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    record = relationship("DataRecord")
    operator = relationship("User")


class DataLinkLog(Base):
    __tablename__ = "data_link_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    complaint_record_id: Mapped[str] = mapped_column(ForeignKey("data_record.id", ondelete="CASCADE"), nullable=False)
    satisfaction_record_id: Mapped[str | None] = mapped_column(ForeignKey("data_record.id", ondelete="SET NULL"), nullable=True)
    strategy: Mapped[str] = mapped_column(String(64), nullable=False, server_default="WORK_ORDER_NO")
    status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="SUCCESS")
    message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    task_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    complaint_record = relationship("DataRecord", foreign_keys=[complaint_record_id])
    satisfaction_record = relationship("DataRecord", foreign_keys=[satisfaction_record_id])
    operator = relationship("User")

from __future__ import annotations

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class WorkOrder(Base):
    __tablename__ = "work_order"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    analysis_id: Mapped[str | None] = mapped_column(
        ForeignKey("complaint_analysis.id", ondelete="SET NULL"), nullable=True, unique=True
    )
    work_order_no: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)

    rectification_status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="待整改")
    verify_status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="待核验")
    close_status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="未闭环")
    warning_status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="正常")
    satisfaction_check_status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="待校验")

    department_id: Mapped[int | None] = mapped_column(ForeignKey("department.id", ondelete="SET NULL"), nullable=True)
    department_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)

    requirement: Mapped[str | None] = mapped_column(Text, nullable=True)
    deadline: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
    verify_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    forced_close: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")
    forced_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    urge_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    last_urged_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    soon_notified_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    overdue_notified_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    escalated_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    analysis = relationship("ComplaintAnalysis")
    department = relationship("Department")
    assignee = relationship("User", foreign_keys=[assignee_id])
    creator = relationship("User", foreign_keys=[created_by])


class WorkOrderActionLog(Base):
    __tablename__ = "work_order_action_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_order_id: Mapped[str] = mapped_column(ForeignKey("work_order.id", ondelete="CASCADE"), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    before: Mapped[object | None] = mapped_column(JSON, nullable=True)
    after: Mapped[object | None] = mapped_column(JSON, nullable=True)
    payload: Mapped[object | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    work_order = relationship("WorkOrder")
    operator = relationship("User")


class SatisfactionRecord(Base):
    __tablename__ = "satisfaction_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    work_order_id: Mapped[str] = mapped_column(ForeignKey("work_order.id", ondelete="CASCADE"), nullable=False)
    source_data_record_id: Mapped[str | None] = mapped_column(
        ForeignKey("data_record.id", ondelete="SET NULL"), nullable=True
    )
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    result: Mapped[str | None] = mapped_column(String(16), nullable=True)
    check_status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="待校验")
    threshold_mapping: Mapped[object | None] = mapped_column(JSON, nullable=True)
    rule_hits: Mapped[object | None] = mapped_column(JSON, nullable=True)
    checked_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    work_order = relationship("WorkOrder")
    source_data_record = relationship("DataRecord")

from __future__ import annotations

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ComplaintAnalysis(Base):
    __tablename__ = "complaint_analysis"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    complaint_record_id: Mapped[str] = mapped_column(ForeignKey("data_record.id", ondelete="CASCADE"), nullable=False)
    work_order_no: Mapped[str | None] = mapped_column(String(64), nullable=True)

    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="待分析")
    message: Mapped[str | None] = mapped_column(String(255), nullable=True)

    category_lv1: Mapped[str | None] = mapped_column(String(32), nullable=True)
    category_lv2: Mapped[str | None] = mapped_column(String(64), nullable=True)
    root_cause_surface: Mapped[str | None] = mapped_column(String(255), nullable=True)
    root_cause_direct: Mapped[str | None] = mapped_column(String(255), nullable=True)
    root_cause_deep: Mapped[str | None] = mapped_column(String(255), nullable=True)
    responsible_dept: Mapped[str | None] = mapped_column(String(64), nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(16), nullable=True)
    is_repeated: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")
    confidence: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    evidence_snippets: Mapped[object | None] = mapped_column(JSON, nullable=True)
    suggested_rectification: Mapped[object | None] = mapped_column(JSON, nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    analyzed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    ai_result: Mapped[object | None] = mapped_column(JSON, nullable=True)
    ai_confidence: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    ai_model_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ai_analyzed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    manual_override: Mapped[object | None] = mapped_column(JSON, nullable=True)
    manual_overridden: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")
    manual_overridden_by: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    manual_overridden_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    manual_override_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    complaint_record = relationship("DataRecord")
    creator = relationship("User", foreign_keys=[created_by])
    manual_operator = relationship("User", foreign_keys=[manual_overridden_by])

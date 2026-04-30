from __future__ import annotations

from enum import StrEnum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReportStatus(StrEnum):
    GENERATING = "生成中"
    GENERATED = "已生成"
    FAILED = "生成失败"


class ReportCycle(StrEnum):
    DAILY = "日报"
    WEEKLY = "周报"
    MONTHLY = "月报"
    QUARTERLY = "季度报"
    CUSTOM = "自定义周期报告"


class Report(Base):
    __tablename__ = "report"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    report_type: Mapped[str] = mapped_column(String(32), nullable=False)
    cycle: Mapped[str] = mapped_column(String(32), nullable=False, server_default=ReportCycle.CUSTOM.value)
    status: Mapped[str] = mapped_column(String(16), nullable=False, server_default=ReportStatus.GENERATING.value)

    title: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_json: Mapped[object | None] = mapped_column(JSON, nullable=True)
    file_ref: Mapped[object | None] = mapped_column(JSON, nullable=True)

    period_start: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    generated_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    creator = relationship("User", foreign_keys=[created_by])


class ReportAutoConfig(Base):
    __tablename__ = "report_auto_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_type: Mapped[str] = mapped_column(String(32), nullable=False)
    cycle: Mapped[str] = mapped_column(String(16), nullable=False, server_default=ReportCycle.DAILY.value)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")

    run_time: Mapped[str] = mapped_column(String(8), nullable=False, server_default="09:00")
    weekday: Mapped[int | None] = mapped_column(Integer, nullable=True)
    day_of_month: Mapped[int | None] = mapped_column(Integer, nullable=True)

    notify_user_ids: Mapped[object | None] = mapped_column(JSON, nullable=True)
    last_run_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    creator = relationship("User", foreign_keys=[created_by])


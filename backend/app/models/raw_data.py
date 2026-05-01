from __future__ import annotations

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RawDataBatch(Base):
    __tablename__ = "raw_data_batch"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")
    file_path: Mapped[str] = mapped_column(String(512), nullable=False, server_default="")
    file_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sheet_name: Mapped[str] = mapped_column(String(128), nullable=False, server_default="考核项目")
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="RUNNING")
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    success_rows: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    failed_rows: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    creator = relationship("User")


class RawDataRow(Base):
    __tablename__ = "raw_data_row"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    batch_id: Mapped[str] = mapped_column(ForeignKey("raw_data_batch.id", ondelete="CASCADE"), nullable=False)
    row_no: Mapped[int] = mapped_column(Integer, nullable=False)

    region_company: Mapped[str | None] = mapped_column(String(128), nullable=True)
    project_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    building_no: Mapped[str | None] = mapped_column(String(255), nullable=True)
    warranty_date: Mapped[str | None] = mapped_column(String(64), nullable=True)
    owner_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(32), nullable=True)
    task_batch: Mapped[str | None] = mapped_column(String(128), nullable=True)
    assigned_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    assigned_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dialed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    biz_result: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_connected: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_valid: Mapped[str | None] = mapped_column(String(32), nullable=True)
    non_resident_usable: Mapped[str | None] = mapped_column(String(32), nullable=True)
    first_rating: Mapped[str | None] = mapped_column(String(32), nullable=True)
    living_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    call400_category: Mapped[str | None] = mapped_column(String(128), nullable=True)

    general_issue: Mapped[str | None] = mapped_column(Text, nullable=True)
    butler_service: Mapped[str | None] = mapped_column(String(32), nullable=True)
    security_service: Mapped[str | None] = mapped_column(String(32), nullable=True)
    env_hygiene: Mapped[str | None] = mapped_column(String(32), nullable=True)
    public_repair: Mapped[str | None] = mapped_column(String(32), nullable=True)
    remark_issue: Mapped[str | None] = mapped_column(Text, nullable=True)

    raw_payload: Mapped[object | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    batch = relationship("RawDataBatch")

    __table_args__ = (UniqueConstraint("batch_id", "row_no", name="uq_raw_data_row_batch_row_no"),)


class RawIssue(Base):
    __tablename__ = "raw_issue"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    batch_id: Mapped[str] = mapped_column(ForeignKey("raw_data_batch.id", ondelete="CASCADE"), nullable=False)
    row_id: Mapped[int] = mapped_column(ForeignKey("raw_data_row.id", ondelete="CASCADE"), nullable=False)
    source_field: Mapped[str] = mapped_column(String(64), nullable=False)
    issue_text: Mapped[str] = mapped_column(Text, nullable=False)

    region_company: Mapped[str | None] = mapped_column(String(128), nullable=True)
    project_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    building_no: Mapped[str | None] = mapped_column(String(255), nullable=True)
    task_batch: Mapped[str | None] = mapped_column(String(128), nullable=True)
    dialed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    batch = relationship("RawDataBatch")
    row = relationship("RawDataRow")


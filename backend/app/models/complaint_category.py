from __future__ import annotations

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ComplaintCategoryLv1(Base):
    __tablename__ = "complaint_category_lv1"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    order_no: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")

    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    children = relationship("ComplaintCategoryLv2", back_populates="parent", foreign_keys="ComplaintCategoryLv2.lv1_id")


class ComplaintCategoryLv2(Base):
    __tablename__ = "complaint_category_lv2"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    lv1_id: Mapped[str] = mapped_column(ForeignKey("complaint_category_lv1.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    order_no: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    keywords: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    parent = relationship("ComplaintCategoryLv1", back_populates="children", foreign_keys=[lv1_id])


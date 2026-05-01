from __future__ import annotations

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AiLlm(Base):
    __tablename__ = "ai_llm"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    base_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")

    last_test_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_test_status: Mapped[str | None] = mapped_column(String(16), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class AiAgent(Base):
    __tablename__ = "ai_agent"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    code: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    llm_id: Mapped[str | None] = mapped_column(ForeignKey("ai_llm.id", ondelete="SET NULL"), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    current_version_id: Mapped[str | None] = mapped_column(
        ForeignKey("ai_agent_version.id", ondelete="SET NULL", use_alter=True, name="fk_ai_agent_current_version"),
        nullable=True,
    )

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    llm = relationship("AiLlm", foreign_keys=[llm_id])
    versions = relationship("AiAgentVersion", back_populates="agent", foreign_keys="AiAgentVersion.agent_id")
    current_version = relationship("AiAgentVersion", foreign_keys=[current_version_id], post_update=True)


class AiAgentVersion(Base):
    __tablename__ = "ai_agent_version"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    agent_id: Mapped[str] = mapped_column(ForeignKey("ai_agent.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, server_default="draft")
    config: Mapped[object | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    published_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    agent = relationship("AiAgent", back_populates="versions", foreign_keys=[agent_id])

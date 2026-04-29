from __future__ import annotations

from enum import StrEnum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Table, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RoleDataScope(StrEnum):
    ALL = "ALL"
    CUSTOM = "CUSTOM"
    DEPT_AND_CHILD = "DEPT_AND_CHILD"
    DEPT = "DEPT"
    SELF = "SELF"


user_role = Table(
    "user_role",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("role.id", ondelete="CASCADE"), primary_key=True),
)

role_permission = Table(
    "role_permission",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("role.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permission.id", ondelete="CASCADE"), primary_key=True),
)

role_department = Table(
    "role_department",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("role.id", ondelete="CASCADE"), primary_key=True),
    Column("department_id", Integer, ForeignKey("department.id", ondelete="CASCADE"), primary_key=True),
)


class Department(Base):
    __tablename__ = "department"
    __table_args__ = (UniqueConstraint("name", name="uq_department_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("department.id", ondelete="SET NULL"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    parent: Mapped[Department | None] = relationship("Department", remote_side="Department.id", back_populates="children")
    children: Mapped[list[Department]] = relationship("Department", back_populates="parent")
    users: Mapped[list[User]] = relationship("User", back_populates="department")
    roles: Mapped[list[Role]] = relationship("Role", secondary=role_department, back_populates="departments")


class User(Base):
    __tablename__ = "user"
    __table_args__ = (UniqueConstraint("username", name="uq_user_username"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    department_id: Mapped[int | None] = mapped_column(ForeignKey("department.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    department: Mapped[Department | None] = relationship("Department", back_populates="users")
    roles: Mapped[list[Role]] = relationship("Role", secondary=user_role, back_populates="users")


class Role(Base):
    __tablename__ = "role"
    __table_args__ = (UniqueConstraint("key", name="uq_role_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    data_scope: Mapped[RoleDataScope] = mapped_column(
        Enum(RoleDataScope, name="role_data_scope"),
        nullable=False,
        server_default=RoleDataScope.SELF.value,
    )
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    users: Mapped[list[User]] = relationship("User", secondary=user_role, back_populates="roles")
    permissions: Mapped[list[Permission]] = relationship("Permission", secondary=role_permission, back_populates="roles")
    departments: Mapped[list[Department]] = relationship("Department", secondary=role_department, back_populates="roles")


class Permission(Base):
    __tablename__ = "permission"
    __table_args__ = (UniqueConstraint("code", name="uq_permission_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(128), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    roles: Mapped[list[Role]] = relationship("Role", secondary=role_permission, back_populates="permissions")

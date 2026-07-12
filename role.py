"""Role model -> roles table."""

from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .employee import Employee
    from .role_permission import RolePermission


class Role(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "roles"

    role_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    role_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    role_name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # One role has many employees.
    employees: Mapped[List["Employee"]] = relationship(
        "Employee",
        back_populates="role",
    )

    # One role has many permission grants (association object pattern,
    # since role_permissions carries its own granted_at column).
    role_permissions: Mapped[List["RolePermission"]] = relationship(
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Role id={self.role_id} code={self.role_code!r}>"

"""Department model -> departments table."""

from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .employee import Employee


class Department(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "departments"
    __table_args__ = (
        Index("idx_departments_active", "is_active", "deleted_at"),
    )

    department_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    department_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    department_name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # One department has many employees.
    employees: Mapped[List["Employee"]] = relationship(
        "Employee",
        back_populates="department",
        cascade="save-update, merge",
    )

    def __repr__(self) -> str:
        return f"<Department id={self.department_id} code={self.department_code!r}>"

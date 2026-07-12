"""LeaveRequest model -> leave_requests table."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import LeaveStatus, LeaveType
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .employee import Employee


class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="ck_leave_dates"),
        Index("idx_leave_employee", "employee_id", "leave_status"),
    )

    leave_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.employee_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    approved_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.employee_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )

    leave_type: Mapped[LeaveType] = mapped_column(
        SAEnum(LeaveType, native_enum=False, length=20, validate_strings=True),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    leave_status: Mapped[LeaveStatus] = mapped_column(
        SAEnum(LeaveStatus, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=LeaveStatus.PENDING,
    )

    # Many-to-one relationships (two FKs to the same table -> disambiguated).
    employee: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="leave_requests",
        foreign_keys=[employee_id],
    )
    approver: Mapped[Optional["Employee"]] = relationship(
        "Employee",
        back_populates="approved_leave_requests",
        foreign_keys=[approved_by_id],
    )

    def __repr__(self) -> str:
        return f"<LeaveRequest id={self.leave_id} employee_id={self.employee_id}>"

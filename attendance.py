"""Attendance model -> attendance table."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import AttendanceStatus
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .employee import Employee


class Attendance(Base, TimestampMixin):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint("employee_id", "attendance_date", name="uq_attendance_employee_date"),
        CheckConstraint(
            "check_out_time IS NULL OR check_in_time IS NULL OR check_out_time >= check_in_time",
            name="ck_attendance_times",
        ),
        Index("idx_attendance_date", "attendance_date"),
    )

    attendance_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.employee_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False)
    check_in_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    check_out_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    attendance_status: Mapped[AttendanceStatus] = mapped_column(
        SAEnum(AttendanceStatus, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=AttendanceStatus.PRESENT,
    )

    # Many-to-one relationship.
    employee: Mapped["Employee"] = relationship("Employee", back_populates="attendances")

    def __repr__(self) -> str:
        return f"<Attendance id={self.attendance_id} employee_id={self.employee_id} date={self.attendance_date}>"

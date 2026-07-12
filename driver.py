"""Driver model -> drivers table. 1:1 extension of Employee."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, List

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, SmallInteger, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import DriverStatus
from .mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .employee import Employee
    from .fuel_log import FuelLog
    from .incident import Incident
    from .trip import Trip
    from .vehicle_assignment import VehicleAssignment


class Driver(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "drivers"
    __table_args__ = (
        CheckConstraint(
            "license_expiry_date > license_issue_date",
            name="ck_drivers_license_dates",
        ),
        Index("idx_drivers_status", "driver_status", "deleted_at"),
        Index("idx_drivers_license_expiry", "license_expiry_date"),
    )

    driver_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.employee_id", ondelete="CASCADE", onupdate="CASCADE"),
        unique=True,
        nullable=False,
    )
    license_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    license_class: Mapped[str] = mapped_column(String(10), nullable=False)
    license_issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    license_expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    years_of_experience: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)

    driver_status: Mapped[DriverStatus] = mapped_column(
        SAEnum(DriverStatus, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=DriverStatus.ACTIVE,
    )

    # One-to-one back to the owning employee record.
    employee: Mapped["Employee"] = relationship("Employee", back_populates="driver_profile")

    # One-to-many relationships.
    trips: Mapped[List["Trip"]] = relationship("Trip", back_populates="driver")
    fuel_logs: Mapped[List["FuelLog"]] = relationship("FuelLog", back_populates="driver")
    incidents: Mapped[List["Incident"]] = relationship("Incident", back_populates="driver")
    vehicle_assignments: Mapped[List["VehicleAssignment"]] = relationship(
        "VehicleAssignment",
        back_populates="driver",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Driver id={self.driver_id} license={self.license_number!r}>"

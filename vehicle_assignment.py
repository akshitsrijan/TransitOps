"""VehicleAssignment model -> vehicle_assignments table (driver<->vehicle history)."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import AssignmentStatus
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .driver import Driver
    from .vehicle import Vehicle


class VehicleAssignment(Base, TimestampMixin):
    __tablename__ = "vehicle_assignments"
    __table_args__ = (
        CheckConstraint(
            "unassigned_date IS NULL OR unassigned_date >= assigned_date",
            name="ck_vehicle_assignments_dates",
        ),
        Index("idx_vehicle_assignments_vehicle", "vehicle_id", "assignment_status"),
        Index("idx_vehicle_assignments_driver", "driver_id", "assignment_status"),
    )

    assignment_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.vehicle_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    driver_id: Mapped[int] = mapped_column(
        ForeignKey("drivers.driver_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )

    assigned_date: Mapped[date] = mapped_column(Date, nullable=False)
    unassigned_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    assignment_status: Mapped[AssignmentStatus] = mapped_column(
        SAEnum(AssignmentStatus, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=AssignmentStatus.ACTIVE,
    )

    # Many-to-one relationships.
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="vehicle_assignments")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="vehicle_assignments")

    def __repr__(self) -> str:
        return f"<VehicleAssignment id={self.assignment_id} vehicle_id={self.vehicle_id} driver_id={self.driver_id}>"

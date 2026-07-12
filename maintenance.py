"""Maintenance model -> maintenance table."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import MaintenanceStatus
from .mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .employee import Employee
    from .vehicle import Vehicle


class Maintenance(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "maintenance"
    __table_args__ = (
        CheckConstraint("cost >= 0", name="ck_maintenance_cost"),
        CheckConstraint(
            "completed_date IS NULL OR completed_date >= scheduled_date",
            name="ck_maintenance_dates",
        ),
        Index("idx_maintenance_vehicle", "vehicle_id"),
        Index("idx_maintenance_status", "maintenance_status", "deleted_at"),
    )

    maintenance_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.vehicle_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    performed_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.employee_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )

    maintenance_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    completed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    maintenance_status: Mapped[MaintenanceStatus] = mapped_column(
        SAEnum(MaintenanceStatus, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=MaintenanceStatus.SCHEDULED,
    )

    # Many-to-one relationships.
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="maintenance_records")
    performed_by: Mapped[Optional["Employee"]] = relationship(
        "Employee",
        back_populates="maintenance_performed",
        foreign_keys=[performed_by_id],
    )

    def __repr__(self) -> str:
        return f"<Maintenance id={self.maintenance_id} vehicle_id={self.vehicle_id}>"

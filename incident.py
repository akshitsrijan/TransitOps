"""Incident model -> incidents table."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import IncidentSeverity, IncidentStatus
from .mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .driver import Driver
    from .employee import Employee
    from .trip import Trip
    from .vehicle import Vehicle


class Incident(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "incidents"
    __table_args__ = (
        Index("idx_incidents_vehicle", "vehicle_id"),
        Index("idx_incidents_driver", "driver_id"),
        Index("idx_incidents_status", "incident_status", "deleted_at"),
    )

    incident_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    incident_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)

    trip_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("trips.trip_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("vehicles.vehicle_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    driver_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("drivers.driver_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    reported_by_id: Mapped[int] = mapped_column(
        ForeignKey("employees.employee_id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )

    incident_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    incident_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    severity: Mapped[IncidentSeverity] = mapped_column(
        SAEnum(IncidentSeverity, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=IncidentSeverity.LOW,
    )
    incident_status: Mapped[IncidentStatus] = mapped_column(
        SAEnum(IncidentStatus, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=IncidentStatus.OPEN,
    )

    # Many-to-one relationships.
    trip: Mapped[Optional["Trip"]] = relationship("Trip", back_populates="incidents")
    vehicle: Mapped[Optional["Vehicle"]] = relationship("Vehicle", back_populates="incidents")
    driver: Mapped[Optional["Driver"]] = relationship("Driver", back_populates="incidents")
    reporter: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="reported_incidents",
        foreign_keys=[reported_by_id],
    )

    def __repr__(self) -> str:
        return f"<Incident id={self.incident_id} code={self.incident_code!r}>"

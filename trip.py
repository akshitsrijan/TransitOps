"""Trip model -> trips table."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, SmallInteger, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import TripStatus
from .mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .driver import Driver
    from .fuel_log import FuelLog
    from .incident import Incident
    from .route import Route
    from .vehicle import Vehicle


class Trip(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint(
            "scheduled_arrival > scheduled_departure",
            name="ck_trips_scheduled_window",
        ),
        CheckConstraint(
            "actual_arrival IS NULL OR actual_departure IS NULL OR actual_arrival >= actual_departure",
            name="ck_trips_actual_window",
        ),
        Index("idx_trips_route", "route_id"),
        Index("idx_trips_vehicle", "vehicle_id"),
        Index("idx_trips_driver", "driver_id"),
        Index("idx_trips_status", "trip_status", "deleted_at"),
        Index("idx_trips_departure", "scheduled_departure"),
    )

    trip_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    trip_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)

    route_id: Mapped[int] = mapped_column(
        ForeignKey("routes.route_id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.vehicle_id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    driver_id: Mapped[int] = mapped_column(
        ForeignKey("drivers.driver_id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )

    scheduled_departure: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    scheduled_arrival: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    actual_departure: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    actual_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    passenger_count: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)

    trip_status: Mapped[TripStatus] = mapped_column(
        SAEnum(TripStatus, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=TripStatus.SCHEDULED,
    )

    # Many-to-one relationships.
    route: Mapped["Route"] = relationship("Route", back_populates="trips")
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="trips")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="trips")

    # One-to-many relationships.
    fuel_logs: Mapped[List["FuelLog"]] = relationship("FuelLog", back_populates="trip")
    incidents: Mapped[List["Incident"]] = relationship("Incident", back_populates="trip")

    def __repr__(self) -> str:
        return f"<Trip id={self.trip_id} code={self.trip_code!r}>"

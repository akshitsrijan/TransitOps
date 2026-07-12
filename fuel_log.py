"""FuelLog model -> fuel_logs table."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .driver import Driver
    from .trip import Trip
    from .vehicle import Vehicle


class FuelLog(Base, TimestampMixin):
    __tablename__ = "fuel_logs"
    __table_args__ = (
        CheckConstraint("liters > 0", name="ck_fuel_logs_liters"),
        CheckConstraint(
            "total_cost >= 0 AND cost_per_liter >= 0",
            name="ck_fuel_logs_cost",
        ),
        Index("idx_fuel_logs_vehicle", "vehicle_id", "fuel_date"),
        Index("idx_fuel_logs_driver", "driver_id"),
    )

    fuel_log_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    vehicle_id: Mapped[int] = mapped_column(
        ForeignKey("vehicles.vehicle_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    driver_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("drivers.driver_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    trip_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("trips.trip_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )

    fuel_date: Mapped[date] = mapped_column(Date, nullable=False)
    liters: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    cost_per_liter: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    odometer_reading: Mapped[int] = mapped_column(Integer, nullable=False)
    fuel_station: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Many-to-one relationships.
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="fuel_logs")
    driver: Mapped[Optional["Driver"]] = relationship("Driver", back_populates="fuel_logs")
    trip: Mapped[Optional["Trip"]] = relationship("Trip", back_populates="fuel_logs")

    def __repr__(self) -> str:
        return f"<FuelLog id={self.fuel_log_id} vehicle_id={self.vehicle_id}>"

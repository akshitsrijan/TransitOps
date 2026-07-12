"""Vehicle model -> vehicles table."""

from __future__ import annotations

from typing import TYPE_CHECKING, List

from sqlalchemy import CheckConstraint, Index, Integer, SmallInteger, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import FuelType, VehicleStatus
from .mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .document import Document
    from .fuel_log import FuelLog
    from .incident import Incident
    from .maintenance import Maintenance
    from .trip import Trip
    from .vehicle_assignment import VehicleAssignment


class Vehicle(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "vehicles"
    __table_args__ = (
        CheckConstraint("capacity > 0", name="ck_vehicles_capacity"),
        Index("idx_vehicles_status", "vehicle_status", "deleted_at"),
    )

    vehicle_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    vehicle_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    registration_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    make: Mapped[str] = mapped_column(String(60), nullable=False)
    model: Mapped[str] = mapped_column(String(60), nullable=False)
    manufacture_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    capacity: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    odometer_reading: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    fuel_type: Mapped[FuelType] = mapped_column(
        SAEnum(FuelType, native_enum=False, length=20, validate_strings=True),
        nullable=False,
    )
    vehicle_status: Mapped[VehicleStatus] = mapped_column(
        SAEnum(VehicleStatus, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=VehicleStatus.ACTIVE,
    )

    # One-to-many relationships.
    trips: Mapped[List["Trip"]] = relationship("Trip", back_populates="vehicle")
    fuel_logs: Mapped[List["FuelLog"]] = relationship(
        "FuelLog", back_populates="vehicle", cascade="all, delete-orphan"
    )
    maintenance_records: Mapped[List["Maintenance"]] = relationship(
        "Maintenance", back_populates="vehicle", cascade="all, delete-orphan"
    )
    incidents: Mapped[List["Incident"]] = relationship("Incident", back_populates="vehicle")
    vehicle_assignments: Mapped[List["VehicleAssignment"]] = relationship(
        "VehicleAssignment", back_populates="vehicle", cascade="all, delete-orphan"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="vehicle", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Vehicle id={self.vehicle_id} code={self.vehicle_code!r}>"

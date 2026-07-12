"""Route model -> routes table."""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING, List

from sqlalchemy import CheckConstraint, Numeric, SmallInteger, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import RouteStatus
from .mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .trip import Trip


class Route(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "routes"
    __table_args__ = (
        CheckConstraint("distance_km > 0", name="ck_routes_distance"),
    )

    route_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    route_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    route_name: Mapped[str] = mapped_column(String(150), nullable=False)
    origin: Mapped[str] = mapped_column(String(150), nullable=False)
    destination: Mapped[str] = mapped_column(String(150), nullable=False)
    distance_km: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    estimated_duration_minutes: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    route_status: Mapped[RouteStatus] = mapped_column(
        SAEnum(RouteStatus, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=RouteStatus.ACTIVE,
    )

    # One route has many trips.
    trips: Mapped[List["Trip"]] = relationship("Trip", back_populates="route")

    def __repr__(self) -> str:
        return f"<Route id={self.route_id} code={self.route_code!r}>"

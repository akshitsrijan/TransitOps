"""EmergencyContact model -> emergency_contacts table."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .employee import Employee


class EmergencyContact(Base, TimestampMixin):
    __tablename__ = "emergency_contacts"
    __table_args__ = (
        Index("idx_emergency_contacts_employee", "employee_id"),
    )

    emergency_contact_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.employee_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    contact_name: Mapped[str] = mapped_column(String(120), nullable=False)
    relationship_: Mapped[str] = mapped_column("relationship", String(50), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Many-to-one relationship.
    employee: Mapped["Employee"] = relationship("Employee", back_populates="emergency_contacts")

    def __repr__(self) -> str:
        return f"<EmergencyContact id={self.emergency_contact_id} employee_id={self.employee_id}>"

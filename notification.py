"""Notification model -> notifications table."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import NotificationType

if TYPE_CHECKING:
    from .employee import Employee


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("idx_notifications_employee", "employee_id", "is_read"),
    )

    notification_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.employee_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(String(150), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)

    notification_type: Mapped[NotificationType] = mapped_column(
        SAEnum(NotificationType, native_enum=False, length=30, validate_strings=True),
        nullable=False,
        default=NotificationType.GENERAL,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    # Many-to-one relationship.
    employee: Mapped["Employee"] = relationship("Employee", back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification id={self.notification_id} employee_id={self.employee_id}>"

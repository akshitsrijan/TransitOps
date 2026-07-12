"""Session model -> sessions table. Named `Session` (class) mapped to `sessions` (table)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .employee import Employee


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        Index("idx_sessions_employee", "employee_id"),
        Index("idx_sessions_expiry", "expires_at"),
    )

    session_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.employee_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )

    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Many-to-one relationship.
    employee: Mapped["Employee"] = relationship("Employee", back_populates="sessions")

    def __repr__(self) -> str:
        return f"<Session id={self.session_id} employee_id={self.employee_id}>"

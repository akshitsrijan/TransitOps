"""AuditLog model -> audit_logs table. Immutable change-history trail."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, Index, String, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import AuditActionType

if TYPE_CHECKING:
    from .employee import Employee


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("idx_audit_logs_table_record", "table_name", "record_id"),
        Index("idx_audit_logs_employee", "employee_id"),
        Index("idx_audit_logs_created", "created_at"),
    )

    audit_log_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.employee_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )

    table_name: Mapped[str] = mapped_column(String(64), nullable=False)
    record_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    action_type: Mapped[AuditActionType] = mapped_column(
        SAEnum(AuditActionType, native_enum=False, length=20, validate_strings=True),
        nullable=False,
    )
    old_values: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    # Many-to-one relationship (nullable actor; NULL means a system action).
    employee: Mapped[Optional["Employee"]] = relationship("Employee", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog id={self.audit_log_id} table={self.table_name!r} record_id={self.record_id}>"

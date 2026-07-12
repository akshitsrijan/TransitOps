"""Document model -> documents table. Owned by an Employee OR a Vehicle."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import DocumentStatus
from .mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .employee import Employee
    from .vehicle import Vehicle


class Document(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint(
            "expiry_date IS NULL OR issue_date IS NULL OR expiry_date >= issue_date",
            name="ck_documents_dates",
        ),
        CheckConstraint(
            "employee_id IS NOT NULL OR vehicle_id IS NOT NULL",
            name="ck_documents_owner",
        ),
        Index("idx_documents_employee", "employee_id"),
        Index("idx_documents_vehicle", "vehicle_id"),
        Index("idx_documents_expiry", "expiry_date"),
    )

    document_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    employee_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.employee_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=True,
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("vehicles.vehicle_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=True,
    )

    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    document_number: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    issue_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    document_status: Mapped[DocumentStatus] = mapped_column(
        SAEnum(DocumentStatus, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=DocumentStatus.VALID,
    )

    # Many-to-one relationships (exactly one of these two is populated).
    employee: Mapped[Optional["Employee"]] = relationship("Employee", back_populates="documents")
    vehicle: Mapped[Optional["Vehicle"]] = relationship("Vehicle", back_populates="documents")

    def __repr__(self) -> str:
        return f"<Document id={self.document_id} type={self.document_type!r}>"

"""Employee model -> employees table. Superset entity; Driver extends it 1:1."""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .enums import EmploymentStatus
from .mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from .attendance import Attendance
    from .audit_log import AuditLog
    from .department import Department
    from .document import Document
    from .driver import Driver
    from .emergency_contact import EmergencyContact
    from .incident import Incident
    from .leave_request import LeaveRequest
    from .maintenance import Maintenance
    from .notification import Notification
    from .role import Role
    from .session import Session


class Employee(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "employees"
    __table_args__ = (
        CheckConstraint(
            "termination_date IS NULL OR termination_date >= hire_date",
            name="ck_employees_dates",
        ),
        Index("idx_employees_department", "department_id"),
        Index("idx_employees_role", "role_id"),
        Index("idx_employees_manager", "manager_id"),
        Index("idx_employees_status", "employment_status", "deleted_at"),
    )

    employee_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    hire_date: Mapped[date] = mapped_column(Date, nullable=False)
    termination_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.department_id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.role_id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    manager_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.employee_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )

    employment_status: Mapped[EmploymentStatus] = mapped_column(
        SAEnum(EmploymentStatus, native_enum=False, length=20, validate_strings=True),
        nullable=False,
        default=EmploymentStatus.ACTIVE,
    )

    # Many-to-one relationships.
    department: Mapped["Department"] = relationship("Department", back_populates="employees")
    role: Mapped["Role"] = relationship("Role", back_populates="employees")

    # Self-referencing manager / direct-reports hierarchy.
    manager: Mapped[Optional["Employee"]] = relationship(
        "Employee",
        remote_side="Employee.employee_id",
        back_populates="direct_reports",
    )
    direct_reports: Mapped[List["Employee"]] = relationship(
        "Employee",
        back_populates="manager",
    )

    # One-to-one extension: an employee may also be a driver.
    driver_profile: Mapped[Optional["Driver"]] = relationship(
        "Driver",
        back_populates="employee",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # One-to-many relationships.
    attendances: Mapped[List["Attendance"]] = relationship(
        "Attendance",
        back_populates="employee",
        cascade="all, delete-orphan",
    )
    leave_requests: Mapped[List["LeaveRequest"]] = relationship(
        "LeaveRequest",
        back_populates="employee",
        foreign_keys="LeaveRequest.employee_id",
        cascade="all, delete-orphan",
    )
    approved_leave_requests: Mapped[List["LeaveRequest"]] = relationship(
        "LeaveRequest",
        back_populates="approver",
        foreign_keys="LeaveRequest.approved_by_id",
    )
    emergency_contacts: Mapped[List["EmergencyContact"]] = relationship(
        "EmergencyContact",
        back_populates="employee",
        cascade="all, delete-orphan",
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document",
        back_populates="employee",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification",
        back_populates="employee",
        cascade="all, delete-orphan",
    )
    sessions: Mapped[List["Session"]] = relationship(
        "Session",
        back_populates="employee",
        cascade="all, delete-orphan",
    )
    reported_incidents: Mapped[List["Incident"]] = relationship(
        "Incident",
        back_populates="reporter",
        foreign_keys="Incident.reported_by_id",
    )
    maintenance_performed: Mapped[List["Maintenance"]] = relationship(
        "Maintenance",
        back_populates="performed_by",
        foreign_keys="Maintenance.performed_by_id",
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog",
        back_populates="employee",
    )

    def __repr__(self) -> str:
        return f"<Employee id={self.employee_id} code={self.employee_code!r}>"

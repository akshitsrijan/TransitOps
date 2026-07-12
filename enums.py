"""
Python enums mirroring the CHECK constraints defined in schema.sql.
Each is mapped via SQLAlchemy's Enum type, which stores the enum's
`.value` as a native VARCHAR - keeping the database column values
identical to the CHECK constraint lists in schema.sql.
"""

import enum


class EmploymentStatus(str, enum.Enum):
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"


class DriverStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class FuelType(str, enum.Enum):
    DIESEL = "diesel"
    PETROL = "petrol"
    CNG = "cng"
    ELECTRIC = "electric"
    HYBRID = "hybrid"


class VehicleStatus(str, enum.Enum):
    ACTIVE = "active"
    IN_MAINTENANCE = "in_maintenance"
    DECOMMISSIONED = "decommissioned"


class RouteStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    RETIRED = "retired"


class TripStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DELAYED = "delayed"


class MaintenanceStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"
    ON_LEAVE = "on_leave"
    HOLIDAY = "holiday"


class LeaveType(str, enum.Enum):
    SICK = "sick"
    CASUAL = "casual"
    ANNUAL = "annual"
    UNPAID = "unpaid"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    OTHER = "other"


class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class IncidentSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, enum.Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    CLOSED = "closed"


class AssignmentStatus(str, enum.Enum):
    ACTIVE = "active"
    ENDED = "ended"


class DocumentStatus(str, enum.Enum):
    VALID = "valid"
    EXPIRED = "expired"
    REVOKED = "revoked"


class AuditActionType(str, enum.Enum):
    INSERT = "insert"
    UPDATE = "update"
    DELETE = "delete"
    SOFT_DELETE = "soft_delete"
    RESTORE = "restore"


class NotificationType(str, enum.Enum):
    GENERAL = "general"
    ALERT = "alert"
    REMINDER = "reminder"
    SYSTEM = "system"

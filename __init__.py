"""
TransitOps ORM models package.

Importing this package registers every mapped class on `Base.metadata`,
which is required for `Base.metadata.create_all(engine)` and for
Alembic autogeneration to see the full schema.
"""

from .base import Base

from .department import Department
from .role import Role
from .permission import Permission
from .role_permission import RolePermission
from .employee import Employee
from .driver import Driver
from .vehicle import Vehicle
from .route import Route
from .trip import Trip
from .fuel_log import FuelLog
from .maintenance import Maintenance
from .attendance import Attendance
from .leave_request import LeaveRequest
from .incident import Incident
from .vehicle_assignment import VehicleAssignment
from .emergency_contact import EmergencyContact
from .document import Document
from .audit_log import AuditLog
from .notification import Notification
from .session import Session

__all__ = [
    "Base",
    "Department",
    "Role",
    "Permission",
    "RolePermission",
    "Employee",
    "Driver",
    "Vehicle",
    "Route",
    "Trip",
    "FuelLog",
    "Maintenance",
    "Attendance",
    "LeaveRequest",
    "Incident",
    "VehicleAssignment",
    "EmergencyContact",
    "Document",
    "AuditLog",
    "Notification",
    "Session",
]

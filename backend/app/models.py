from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel


class Role(str, Enum):
    fleet_manager = "Fleet Manager"
    driver = "Driver"
    safety_officer = "Safety Officer"
    financial_analyst = "Financial Analyst"


class VehicleStatus(str, Enum):
    available = "Available"
    on_trip = "On Trip"
    in_shop = "In Shop"
    retired = "Retired"


class DriverStatus(str, Enum):
    available = "Available"
    on_trip = "On Trip"
    off_duty = "Off Duty"
    suspended = "Suspended"


class TripStatus(str, Enum):
    draft = "Draft"
    dispatched = "Dispatched"
    completed = "Completed"
    cancelled = "Cancelled"


class MaintenanceStatus(str, Enum):
    active = "Active"
    closed = "Closed"


class ExpenseCategory(str, Enum):
    toll = "Toll"
    maintenance = "Maintenance"
    insurance = "Insurance"
    fine = "Fine"
    other = "Other"


class CheckStatus(str, Enum):
    pending = "Pending"
    complete = "Complete"
    error = "Error"


class Verdict(str, Enum):
    pass_ = "Pass"
    fail = "Fail"
    unverifiable = "Unverifiable"


class User(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    password: str
    role: Role


class Vehicle(SQLModel, table=True):
    id: str = Field(primary_key=True)
    registration_number: str = Field(index=True, unique=True)
    model: str
    type: str
    max_load_capacity_kg: float
    odometer_km: float
    acquisition_cost: float
    status: VehicleStatus
    region: str


class Driver(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    license_number: str = Field(index=True, unique=True)
    license_category: str
    license_expiry: str  # ISO date (YYYY-MM-DD)
    contact: str
    safety_score: int
    status: DriverStatus


class Trip(SQLModel, table=True):
    id: str = Field(primary_key=True)
    source: str
    destination: str
    vehicle_id: str = Field(foreign_key="vehicle.id")
    driver_id: str = Field(foreign_key="driver.id")
    cargo_weight_kg: float
    planned_distance_km: float
    actual_distance_km: float | None = None
    fuel_consumed_liters: float | None = None
    status: TripStatus
    created_at: datetime = Field(default_factory=datetime.utcnow)
    dispatched_at: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None


class MaintenanceLog(SQLModel, table=True):
    id: str = Field(primary_key=True)
    vehicle_id: str = Field(foreign_key="vehicle.id")
    description: str
    cost: float
    odometer_km_at_open: float = 0
    opened_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: datetime | None = None
    status: MaintenanceStatus


class FuelLog(SQLModel, table=True):
    id: str = Field(primary_key=True)
    vehicle_id: str = Field(foreign_key="vehicle.id")
    liters: float
    cost: float
    date: str  # ISO date


class Expense(SQLModel, table=True):
    id: str = Field(primary_key=True)
    vehicle_id: str = Field(foreign_key="vehicle.id")
    category: ExpenseCategory
    amount: float
    date: str  # ISO date
    notes: str | None = None


class ConfidenceCheck(SQLModel, table=True):
    """RAG-based advisory confidence score for a submitted record, judged against
    the TransitOps policy/regulation corpus. Runs asynchronously after the record
    is created and never blocks the write."""

    id: str = Field(primary_key=True)
    entity_type: str  # "trip" | "maintenance"
    entity_id: str = Field(index=True)
    status: CheckStatus = CheckStatus.pending
    confidence: float | None = None
    verdict: Verdict | None = None
    rationale: str | None = None
    citations: str | None = None  # JSON-encoded list[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None

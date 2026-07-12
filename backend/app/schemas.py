from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.models import DriverStatus, ExpenseCategory, MaintenanceStatus, Role, TripStatus, VehicleStatus


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ---------- Auth ----------
class LoginRequest(CamelModel):
    email: str
    password: str


class UserRead(CamelModel):
    id: str
    name: str
    email: str
    role: Role


class LoginResponse(CamelModel):
    token: str
    user: UserRead


class SendOtpRequest(CamelModel):
    email: str
    code: str
    name: str = ""


class SendOtpResponse(CamelModel):
    sent: bool
    via: str  # "smtp" | "disabled" | "error"
    detail: str = ""


# ---------- Vehicles ----------
class VehicleCreate(CamelModel):
    registration_number: str
    model: str
    type: str
    max_load_capacity_kg: float
    odometer_km: float
    acquisition_cost: float
    status: VehicleStatus
    region: str


class VehicleRead(VehicleCreate):
    id: str


# ---------- Drivers ----------
class DriverCreate(CamelModel):
    name: str
    license_number: str
    license_category: str
    license_expiry: str
    contact: str
    safety_score: int
    status: DriverStatus


class DriverRead(DriverCreate):
    id: str


# ---------- Trips ----------
class TripCreate(CamelModel):
    source: str
    destination: str
    vehicle_id: str
    driver_id: str
    cargo_weight_kg: float
    planned_distance_km: float


class TripComplete(CamelModel):
    actual_distance_km: float
    fuel_consumed_liters: float


class TripRead(CamelModel):
    id: str
    source: str
    destination: str
    vehicle_id: str
    driver_id: str
    cargo_weight_kg: float
    planned_distance_km: float
    actual_distance_km: float | None
    fuel_consumed_liters: float | None
    status: TripStatus
    created_at: datetime
    dispatched_at: datetime | None
    completed_at: datetime | None
    cancelled_at: datetime | None


# ---------- Maintenance ----------
class MaintenanceCreate(CamelModel):
    vehicle_id: str
    description: str
    cost: float


class MaintenanceRead(CamelModel):
    id: str
    vehicle_id: str
    description: str
    cost: float
    opened_at: datetime
    closed_at: datetime | None
    status: MaintenanceStatus


# ---------- Fuel & Expenses ----------
class FuelLogCreate(CamelModel):
    vehicle_id: str
    liters: float
    cost: float
    date: str


class FuelLogRead(FuelLogCreate):
    id: str


class ExpenseCreate(CamelModel):
    vehicle_id: str
    category: ExpenseCategory
    amount: float
    date: str
    notes: str | None = None


class ExpenseRead(ExpenseCreate):
    id: str


# ---------- Errors ----------
class ErrorResponse(CamelModel):
    detail: str

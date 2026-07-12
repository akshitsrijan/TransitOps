import uuid
from datetime import date, datetime

from sqlmodel import Session, select

from app.errors import BusinessRuleError
from app.models import (
    Driver,
    DriverStatus,
    Expense,
    FuelLog,
    MaintenanceLog,
    MaintenanceStatus,
    Trip,
    TripStatus,
    Vehicle,
    VehicleStatus,
)
from app.schemas import (
    DriverCreate,
    ExpenseCreate,
    FuelLogCreate,
    MaintenanceCreate,
    TripCreate,
    VehicleCreate,
)


def next_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def is_license_expired(driver: Driver) -> bool:
    try:
        return date.fromisoformat(driver.license_expiry) < datetime.utcnow().date()
    except ValueError:
        return False


# ---------- Vehicles ----------
def create_vehicle(session: Session, data: VehicleCreate) -> Vehicle:
    existing = session.exec(
        select(Vehicle).where(Vehicle.registration_number.ilike(data.registration_number))
    ).first()
    if existing:
        raise BusinessRuleError(f'Registration number "{data.registration_number}" is already in use.')
    vehicle = Vehicle(id=next_id("v"), **data.model_dump())
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def update_vehicle(session: Session, vehicle_id: str, data: VehicleCreate) -> Vehicle:
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise BusinessRuleError("Vehicle not found.")
    existing = session.exec(
        select(Vehicle).where(Vehicle.registration_number.ilike(data.registration_number), Vehicle.id != vehicle_id)
    ).first()
    if existing:
        raise BusinessRuleError(f'Registration number "{data.registration_number}" is already in use.')
    for key, value in data.model_dump().items():
        setattr(vehicle, key, value)
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def delete_vehicle(session: Session, vehicle_id: str) -> None:
    active_trip = session.exec(
        select(Trip).where(
            Trip.vehicle_id == vehicle_id,
            Trip.status.in_([TripStatus.draft, TripStatus.dispatched]),
        )
    ).first()
    if active_trip:
        raise BusinessRuleError("Cannot delete a vehicle with active or draft trips.")
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise BusinessRuleError("Vehicle not found.")
    session.delete(vehicle)
    session.commit()


# ---------- Drivers ----------
def create_driver(session: Session, data: DriverCreate) -> Driver:
    existing = session.exec(select(Driver).where(Driver.license_number.ilike(data.license_number))).first()
    if existing:
        raise BusinessRuleError(f'License number "{data.license_number}" is already in use.')
    driver = Driver(id=next_id("d"), **data.model_dump())
    session.add(driver)
    session.commit()
    session.refresh(driver)
    return driver


def update_driver(session: Session, driver_id: str, data: DriverCreate) -> Driver:
    driver = session.get(Driver, driver_id)
    if not driver:
        raise BusinessRuleError("Driver not found.")
    existing = session.exec(
        select(Driver).where(Driver.license_number.ilike(data.license_number), Driver.id != driver_id)
    ).first()
    if existing:
        raise BusinessRuleError(f'License number "{data.license_number}" is already in use.')
    for key, value in data.model_dump().items():
        setattr(driver, key, value)
    session.add(driver)
    session.commit()
    session.refresh(driver)
    return driver


def delete_driver(session: Session, driver_id: str) -> None:
    active_trip = session.exec(
        select(Trip).where(
            Trip.driver_id == driver_id,
            Trip.status.in_([TripStatus.draft, TripStatus.dispatched]),
        )
    ).first()
    if active_trip:
        raise BusinessRuleError("Cannot delete a driver with active or draft trips.")
    driver = session.get(Driver, driver_id)
    if not driver:
        raise BusinessRuleError("Driver not found.")
    session.delete(driver)
    session.commit()


# ---------- Trips ----------
def create_trip(session: Session, data: TripCreate) -> Trip:
    vehicle = session.get(Vehicle, data.vehicle_id)
    driver = session.get(Driver, data.driver_id)
    if not vehicle:
        raise BusinessRuleError("Select a vehicle.")
    if not driver:
        raise BusinessRuleError("Select a driver.")
    if vehicle.status in (VehicleStatus.retired, VehicleStatus.in_shop):
        raise BusinessRuleError(f"Vehicle {vehicle.registration_number} is {vehicle.status.value} and cannot be dispatched.")
    if vehicle.status == VehicleStatus.on_trip:
        raise BusinessRuleError(f"Vehicle {vehicle.registration_number} is already on a trip.")
    if driver.status == DriverStatus.suspended:
        raise BusinessRuleError(f"Driver {driver.name} is suspended and cannot be assigned.")
    if is_license_expired(driver):
        raise BusinessRuleError(f"Driver {driver.name}'s license expired on {driver.license_expiry}.")
    if driver.status == DriverStatus.on_trip:
        raise BusinessRuleError(f"Driver {driver.name} is already on a trip.")
    if data.cargo_weight_kg > vehicle.max_load_capacity_kg:
        raise BusinessRuleError(
            f"Cargo weight ({data.cargo_weight_kg} kg) exceeds vehicle max load capacity ({vehicle.max_load_capacity_kg} kg)."
        )
    if data.cargo_weight_kg <= 0:
        raise BusinessRuleError("Cargo weight must be greater than zero.")
    if data.planned_distance_km <= 0:
        raise BusinessRuleError("Planned distance must be greater than zero.")
    if not data.source.strip() or not data.destination.strip():
        raise BusinessRuleError("Source and destination are required.")

    trip = Trip(id=next_id("t"), status=TripStatus.draft, **data.model_dump())
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip


def dispatch_trip(session: Session, trip_id: str) -> Trip:
    trip = session.get(Trip, trip_id)
    if not trip:
        raise BusinessRuleError("Trip not found.")
    if trip.status != TripStatus.draft:
        raise BusinessRuleError("Only draft trips can be dispatched.")
    vehicle = session.get(Vehicle, trip.vehicle_id)
    driver = session.get(Driver, trip.driver_id)
    if not vehicle or vehicle.status != VehicleStatus.available:
        raise BusinessRuleError("Vehicle is no longer available.")
    if not driver or driver.status != DriverStatus.available or is_license_expired(driver):
        raise BusinessRuleError("Driver is no longer available.")

    trip.status = TripStatus.dispatched
    trip.dispatched_at = datetime.utcnow()
    vehicle.status = VehicleStatus.on_trip
    driver.status = DriverStatus.on_trip
    session.add_all([trip, vehicle, driver])
    session.commit()
    session.refresh(trip)
    return trip


def complete_trip(session: Session, trip_id: str, actual_distance_km: float, fuel_consumed_liters: float) -> Trip:
    trip = session.get(Trip, trip_id)
    if not trip:
        raise BusinessRuleError("Trip not found.")
    if trip.status != TripStatus.dispatched:
        raise BusinessRuleError("Only dispatched trips can be completed.")
    if actual_distance_km <= 0:
        raise BusinessRuleError("Final odometer distance must be greater than zero.")
    if fuel_consumed_liters < 0:
        raise BusinessRuleError("Fuel consumed cannot be negative.")

    vehicle = session.get(Vehicle, trip.vehicle_id)
    driver = session.get(Driver, trip.driver_id)

    trip.status = TripStatus.completed
    trip.completed_at = datetime.utcnow()
    trip.actual_distance_km = actual_distance_km
    trip.fuel_consumed_liters = fuel_consumed_liters
    if vehicle:
        vehicle.status = VehicleStatus.available
        vehicle.odometer_km += actual_distance_km
    if driver:
        driver.status = DriverStatus.available
    session.add_all([obj for obj in (trip, vehicle, driver) if obj is not None])
    session.commit()
    session.refresh(trip)
    return trip


def cancel_trip(session: Session, trip_id: str) -> Trip:
    trip = session.get(Trip, trip_id)
    if not trip:
        raise BusinessRuleError("Trip not found.")
    if trip.status not in (TripStatus.draft, TripStatus.dispatched):
        raise BusinessRuleError("Only draft or dispatched trips can be cancelled.")

    was_dispatched = trip.status == TripStatus.dispatched
    trip.status = TripStatus.cancelled
    trip.cancelled_at = datetime.utcnow()
    session.add(trip)

    if was_dispatched:
        vehicle = session.get(Vehicle, trip.vehicle_id)
        driver = session.get(Driver, trip.driver_id)
        if vehicle:
            vehicle.status = VehicleStatus.available
            session.add(vehicle)
        if driver:
            driver.status = DriverStatus.available
            session.add(driver)

    session.commit()
    session.refresh(trip)
    return trip


# ---------- Maintenance ----------
def create_maintenance(session: Session, data: MaintenanceCreate) -> MaintenanceLog:
    vehicle = session.get(Vehicle, data.vehicle_id)
    if not vehicle:
        raise BusinessRuleError("Select a vehicle.")
    if not data.description.strip():
        raise BusinessRuleError("Description is required.")
    if data.cost < 0:
        raise BusinessRuleError("Cost cannot be negative.")

    log = MaintenanceLog(
        id=next_id("m"), status=MaintenanceStatus.active, odometer_km_at_open=vehicle.odometer_km, **data.model_dump()
    )
    vehicle.status = VehicleStatus.in_shop
    session.add_all([log, vehicle])
    session.commit()
    session.refresh(log)
    return log


def close_maintenance(session: Session, maintenance_id: str) -> MaintenanceLog:
    log = session.get(MaintenanceLog, maintenance_id)
    if not log:
        raise BusinessRuleError("Maintenance log not found.")
    if log.status != MaintenanceStatus.active:
        raise BusinessRuleError("Maintenance log is already closed.")

    log.status = MaintenanceStatus.closed
    log.closed_at = datetime.utcnow()
    session.add(log)

    vehicle = session.get(Vehicle, log.vehicle_id)
    if vehicle and vehicle.status != VehicleStatus.retired:
        vehicle.status = VehicleStatus.available
        session.add(vehicle)

    session.commit()
    session.refresh(log)
    return log


# ---------- Fuel & Expenses ----------
def create_fuel_log(session: Session, data: FuelLogCreate) -> FuelLog:
    if not session.get(Vehicle, data.vehicle_id):
        raise BusinessRuleError("Select a vehicle.")
    if data.liters <= 0:
        raise BusinessRuleError("Liters must be greater than zero.")
    if data.cost < 0:
        raise BusinessRuleError("Cost cannot be negative.")
    log = FuelLog(id=next_id("f"), **data.model_dump())
    session.add(log)
    session.commit()
    session.refresh(log)
    return log


def create_expense(session: Session, data: ExpenseCreate) -> Expense:
    if not session.get(Vehicle, data.vehicle_id):
        raise BusinessRuleError("Select a vehicle.")
    if data.amount <= 0:
        raise BusinessRuleError("Amount must be greater than zero.")
    expense = Expense(id=next_id("e"), **data.model_dump())
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense

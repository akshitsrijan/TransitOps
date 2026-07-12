from datetime import datetime

from sqlmodel import Session, select

from app.models import (
    Driver,
    DriverStatus,
    Expense,
    ExpenseCategory,
    FuelLog,
    MaintenanceLog,
    MaintenanceStatus,
    Role,
    Trip,
    TripStatus,
    User,
    Vehicle,
    VehicleStatus,
)

SEED_USERS = [
    User(id="u1", name="Maria Chen", email="manager@transitops.com", password="password123", role=Role.fleet_manager),
    User(id="u2", name="Alex Rivera", email="driver@transitops.com", password="password123", role=Role.driver),
    User(id="u3", name="Sam Okafor", email="safety@transitops.com", password="password123", role=Role.safety_officer),
    User(id="u4", name="Priya Nair", email="finance@transitops.com", password="password123", role=Role.financial_analyst),
]

SEED_VEHICLES = [
    Vehicle(id="v1", registration_number="VAN-05", model="Ford Transit", type="Van", max_load_capacity_kg=500, odometer_km=42150, acquisition_cost=38000, status=VehicleStatus.available, region="North"),
    Vehicle(id="v2", registration_number="TRK-12", model="Isuzu NPR", type="Truck", max_load_capacity_kg=3500, odometer_km=88320, acquisition_cost=62000, status=VehicleStatus.on_trip, region="South"),
    Vehicle(id="v3", registration_number="VAN-08", model="Mercedes Sprinter", type="Van", max_load_capacity_kg=800, odometer_km=15200, acquisition_cost=45000, status=VehicleStatus.in_shop, region="East"),
    Vehicle(id="v4", registration_number="TRK-03", model="Volvo FL", type="Truck", max_load_capacity_kg=5000, odometer_km=121000, acquisition_cost=89000, status=VehicleStatus.retired, region="West"),
    Vehicle(id="v5", registration_number="VAN-11", model="Ford Transit", type="Van", max_load_capacity_kg=500, odometer_km=9800, acquisition_cost=39500, status=VehicleStatus.available, region="North"),
    Vehicle(id="v6", registration_number="TRK-19", model="Isuzu NPR", type="Truck", max_load_capacity_kg=3500, odometer_km=55400, acquisition_cost=63000, status=VehicleStatus.on_trip, region="South"),
    Vehicle(id="v7", registration_number="CAR-02", model="Toyota Corolla", type="Car", max_load_capacity_kg=150, odometer_km=31000, acquisition_cost=21000, status=VehicleStatus.available, region="East"),
]

SEED_DRIVERS = [
    Driver(id="d1", name="Alex Rivera", license_number="LIC-10023", license_category="C", license_expiry="2027-03-15", contact="555-0101", safety_score=92, status=DriverStatus.available),
    Driver(id="d2", name="Jordan Blake", license_number="LIC-10078", license_category="C+E", license_expiry="2026-11-02", contact="555-0102", safety_score=87, status=DriverStatus.on_trip),
    Driver(id="d3", name="Taylor Reed", license_number="LIC-10099", license_category="B", license_expiry="2026-01-20", contact="555-0103", safety_score=78, status=DriverStatus.off_duty),
    Driver(id="d4", name="Morgan Diaz", license_number="LIC-10112", license_category="C", license_expiry="2025-09-01", contact="555-0104", safety_score=65, status=DriverStatus.suspended),
    Driver(id="d5", name="Casey Kim", license_number="LIC-10145", license_category="C+E", license_expiry="2027-06-30", contact="555-0105", safety_score=95, status=DriverStatus.on_trip),
    Driver(id="d6", name="Riley Santos", license_number="LIC-10201", license_category="B", license_expiry="2026-08-14", contact="555-0106", safety_score=89, status=DriverStatus.available),
]

SEED_TRIPS = [
    Trip(id="t1", source="Warehouse A", destination="Downtown Depot", vehicle_id="v2", driver_id="d2", cargo_weight_kg=2800, planned_distance_km=65, status=TripStatus.dispatched, created_at=datetime.fromisoformat("2026-07-10T08:00:00"), dispatched_at=datetime.fromisoformat("2026-07-10T08:15:00")),
    Trip(id="t2", source="Port Terminal", destination="North Storage", vehicle_id="v6", driver_id="d5", cargo_weight_kg=3100, planned_distance_km=40, status=TripStatus.dispatched, created_at=datetime.fromisoformat("2026-07-11T06:30:00"), dispatched_at=datetime.fromisoformat("2026-07-11T07:00:00")),
    Trip(id="t3", source="Warehouse B", destination="Retail Center", vehicle_id="v1", driver_id="d1", cargo_weight_kg=420, planned_distance_km=22, actual_distance_km=23.5, fuel_consumed_liters=6.1, status=TripStatus.completed, created_at=datetime.fromisoformat("2026-07-08T09:00:00"), dispatched_at=datetime.fromisoformat("2026-07-08T09:20:00"), completed_at=datetime.fromisoformat("2026-07-08T11:05:00")),
    Trip(id="t4", source="Depot 5", destination="Customer Site", vehicle_id="v5", driver_id="d6", cargo_weight_kg=300, planned_distance_km=18, status=TripStatus.draft, created_at=datetime.fromisoformat("2026-07-12T07:00:00")),
]

SEED_MAINTENANCE = [
    MaintenanceLog(id="m1", vehicle_id="v3", description="Brake pad replacement", cost=420, odometer_km_at_open=15100, opened_at=datetime.fromisoformat("2026-07-09T10:00:00"), status=MaintenanceStatus.active),
    MaintenanceLog(id="m2", vehicle_id="v1", description="Oil change", cost=90, odometer_km_at_open=32000, opened_at=datetime.fromisoformat("2026-06-15T10:00:00"), closed_at=datetime.fromisoformat("2026-06-15T14:00:00"), status=MaintenanceStatus.closed),
]

SEED_FUEL_LOGS = [
    FuelLog(id="f1", vehicle_id="v1", liters=40, cost=62, date="2026-07-05"),
    FuelLog(id="f2", vehicle_id="v2", liters=120, cost=186, date="2026-07-08"),
    FuelLog(id="f3", vehicle_id="v6", liters=95, cost=148, date="2026-07-09"),
    FuelLog(id="f4", vehicle_id="v1", liters=38, cost=59, date="2026-06-20"),
]

SEED_EXPENSES = [
    Expense(id="e1", vehicle_id="v2", category=ExpenseCategory.toll, amount=45, date="2026-07-08", notes="Highway toll"),
    Expense(id="e2", vehicle_id="v1", category=ExpenseCategory.insurance, amount=220, date="2026-07-01"),
    Expense(id="e3", vehicle_id="v3", category=ExpenseCategory.maintenance, amount=420, date="2026-07-09", notes="Brake pad replacement"),
]


def seed_if_empty(session: Session) -> None:
    if session.exec(select(User)).first():
        return
    for batch in (SEED_USERS, SEED_VEHICLES, SEED_DRIVERS, SEED_TRIPS, SEED_MAINTENANCE, SEED_FUEL_LOGS, SEED_EXPENSES):
        session.add_all(batch)
    session.commit()

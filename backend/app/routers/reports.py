import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import Driver, Expense, FuelLog, MaintenanceLog, Trip, TripStatus, Vehicle, VehicleStatus
from app.schemas import CamelModel

router = APIRouter(prefix="/api/reports", tags=["reports"])

ASSUMED_REVENUE_PER_KM = 2.5


class DashboardKpis(CamelModel):
    active_vehicles: int
    available_vehicles: int
    vehicles_in_maintenance: int
    active_trips: int
    pending_trips: int
    drivers_on_duty: int
    fleet_utilization_pct: float


class VehicleReportRow(CamelModel):
    vehicle_id: str
    registration_number: str
    trip_count: int
    total_distance_km: float
    total_fuel_liters: float
    fuel_efficiency_km_per_l: float | None
    fuel_cost: float
    maintenance_cost: float
    other_expenses: float
    operational_cost: float
    estimated_revenue: float
    roi_pct: float | None


def _vehicle_report(session: Session) -> list[VehicleReportRow]:
    vehicles = session.exec(select(Vehicle)).all()
    trips = session.exec(select(Trip)).all()
    maintenance_logs = session.exec(select(MaintenanceLog)).all()
    fuel_logs = session.exec(select(FuelLog)).all()
    expenses = session.exec(select(Expense)).all()

    rows: list[VehicleReportRow] = []
    for v in vehicles:
        completed = [t for t in trips if t.vehicle_id == v.id and t.status == TripStatus.completed]
        total_distance = sum(t.actual_distance_km or 0 for t in completed)
        trip_fuel = sum(t.fuel_consumed_liters or 0 for t in completed)
        log_fuel = sum(f.liters for f in fuel_logs if f.vehicle_id == v.id)
        total_fuel = trip_fuel + log_fuel

        fuel_cost = sum(f.cost for f in fuel_logs if f.vehicle_id == v.id)
        maintenance_cost = sum(m.cost for m in maintenance_logs if m.vehicle_id == v.id)
        other_expenses = sum(e.amount for e in expenses if e.vehicle_id == v.id)
        operational_cost = fuel_cost + maintenance_cost + other_expenses

        estimated_revenue = round(total_distance * ASSUMED_REVENUE_PER_KM, 2)
        roi_pct = (
            round(((estimated_revenue - (maintenance_cost + fuel_cost)) / v.acquisition_cost) * 1000, 1) / 10
            if v.acquisition_cost
            else None
        )

        rows.append(
            VehicleReportRow(
                vehicle_id=v.id,
                registration_number=v.registration_number,
                trip_count=len(completed),
                total_distance_km=total_distance,
                total_fuel_liters=total_fuel,
                fuel_efficiency_km_per_l=round(total_distance / total_fuel, 2) if total_fuel > 0 else None,
                fuel_cost=fuel_cost,
                maintenance_cost=maintenance_cost,
                other_expenses=other_expenses,
                operational_cost=operational_cost,
                estimated_revenue=estimated_revenue,
                roi_pct=roi_pct,
            )
        )
    return rows


@router.get("/dashboard", response_model=DashboardKpis)
def dashboard_kpis(session: Session = Depends(get_session), _=Depends(get_current_user)) -> DashboardKpis:
    vehicles = session.exec(select(Vehicle)).all()
    drivers = session.exec(select(Driver)).all()
    trips = session.exec(select(Trip)).all()

    non_retired = [v for v in vehicles if v.status != VehicleStatus.retired]
    on_trip = [v for v in vehicles if v.status == VehicleStatus.on_trip]

    return DashboardKpis(
        active_vehicles=len(non_retired),
        available_vehicles=len([v for v in vehicles if v.status == VehicleStatus.available]),
        vehicles_in_maintenance=len([v for v in vehicles if v.status == VehicleStatus.in_shop]),
        active_trips=len([t for t in trips if t.status == TripStatus.dispatched]),
        pending_trips=len([t for t in trips if t.status == TripStatus.draft]),
        drivers_on_duty=len([d for d in drivers if d.status.value in ("On Trip", "Available")]),
        fleet_utilization_pct=round(len(on_trip) / len(non_retired) * 1000, 1) / 10 if non_retired else 0,
    )


@router.get("/vehicles", response_model=list[VehicleReportRow])
def vehicle_report(session: Session = Depends(get_session), _=Depends(get_current_user)) -> list[VehicleReportRow]:
    return _vehicle_report(session)


@router.get("/vehicles.csv")
def vehicle_report_csv(session: Session = Depends(get_session), _=Depends(get_current_user)) -> StreamingResponse:
    rows = _vehicle_report(session)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["Vehicle", "Trips Completed", "Distance (km)", "Fuel (L)", "Fuel Efficiency (km/L)", "Fuel Cost",
         "Maintenance Cost", "Other Expenses", "Operational Cost", "Estimated Revenue", "ROI (%)"]
    )
    for r in rows:
        writer.writerow(
            [r.registration_number, r.trip_count, r.total_distance_km, r.total_fuel_liters,
             r.fuel_efficiency_km_per_l or "", r.fuel_cost, r.maintenance_cost, r.other_expenses,
             r.operational_cost, r.estimated_revenue, r.roi_pct or ""]
        )
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transitops-fleet-report.csv"},
    )

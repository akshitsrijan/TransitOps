from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app import services
from app.auth import get_current_user, require_role
from app.database import get_session
from app.errors import BusinessRuleError
from app.models import Role, Vehicle
from app.schemas import VehicleCreate, VehicleRead

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])

can_edit = require_role(Role.fleet_manager)


@router.get("", response_model=list[VehicleRead])
def list_vehicles(session: Session = Depends(get_session), _=Depends(get_current_user)) -> list[Vehicle]:
    return session.exec(select(Vehicle)).all()


@router.post("", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleCreate, session: Session = Depends(get_session), _=Depends(can_edit)) -> Vehicle:
    try:
        return services.create_vehicle(session, payload)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.put("/{vehicle_id}", response_model=VehicleRead)
def update_vehicle(
    vehicle_id: str, payload: VehicleCreate, session: Session = Depends(get_session), _=Depends(can_edit)
) -> Vehicle:
    try:
        return services.update_vehicle(session, vehicle_id, payload)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(vehicle_id: str, session: Session = Depends(get_session), _=Depends(can_edit)) -> None:
    try:
        services.delete_vehicle(session, vehicle_id)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc

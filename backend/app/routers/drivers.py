from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app import services
from app.auth import get_current_user, require_role
from app.database import get_session
from app.errors import BusinessRuleError
from app.models import Driver, Role
from app.schemas import DriverCreate, DriverRead

router = APIRouter(prefix="/api/drivers", tags=["drivers"])

can_edit = require_role(Role.fleet_manager, Role.safety_officer)


@router.get("", response_model=list[DriverRead])
def list_drivers(session: Session = Depends(get_session), _=Depends(get_current_user)) -> list[Driver]:
    return session.exec(select(Driver)).all()


@router.post("", response_model=DriverRead, status_code=status.HTTP_201_CREATED)
def create_driver(payload: DriverCreate, session: Session = Depends(get_session), _=Depends(can_edit)) -> Driver:
    try:
        return services.create_driver(session, payload)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.put("/{driver_id}", response_model=DriverRead)
def update_driver(
    driver_id: str, payload: DriverCreate, session: Session = Depends(get_session), _=Depends(can_edit)
) -> Driver:
    try:
        return services.update_driver(session, driver_id, payload)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(driver_id: str, session: Session = Depends(get_session), _=Depends(can_edit)) -> None:
    try:
        services.delete_driver(session, driver_id)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc

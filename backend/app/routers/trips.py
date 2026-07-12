from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import Session, select

from app import services
from app.auth import get_current_user, require_role
from app.database import get_session
from app.errors import BusinessRuleError
from app.models import Role, Trip
from app.rag.checks import queue_trip_check
from app.schemas import TripComplete, TripCreate, TripRead

router = APIRouter(prefix="/api/trips", tags=["trips"])

can_edit = require_role(Role.fleet_manager, Role.driver)


@router.get("", response_model=list[TripRead])
def list_trips(session: Session = Depends(get_session), _=Depends(get_current_user)) -> list[Trip]:
    return session.exec(select(Trip)).all()


@router.post("", response_model=TripRead, status_code=status.HTTP_201_CREATED)
def create_trip(
    payload: TripCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    _=Depends(can_edit),
) -> Trip:
    try:
        trip = services.create_trip(session, payload)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    queue_trip_check(background_tasks, trip.id)
    return trip


@router.post("/{trip_id}/dispatch", response_model=TripRead)
def dispatch_trip(trip_id: str, session: Session = Depends(get_session), _=Depends(can_edit)) -> Trip:
    try:
        return services.dispatch_trip(session, trip_id)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.post("/{trip_id}/complete", response_model=TripRead)
def complete_trip(
    trip_id: str, payload: TripComplete, session: Session = Depends(get_session), _=Depends(can_edit)
) -> Trip:
    try:
        return services.complete_trip(session, trip_id, payload.actual_distance_km, payload.fuel_consumed_liters)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.post("/{trip_id}/cancel", response_model=TripRead)
def cancel_trip(trip_id: str, session: Session = Depends(get_session), _=Depends(can_edit)) -> Trip:
    try:
        return services.cancel_trip(session, trip_id)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc

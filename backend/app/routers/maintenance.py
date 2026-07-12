from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import Session, select

from app import services
from app.auth import get_current_user, require_role
from app.database import get_session
from app.errors import BusinessRuleError
from app.models import MaintenanceLog, Role
from app.rag.checks import queue_maintenance_check
from app.schemas import MaintenanceCreate, MaintenanceRead

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])

can_edit = require_role(Role.fleet_manager)


@router.get("", response_model=list[MaintenanceRead])
def list_maintenance(session: Session = Depends(get_session), _=Depends(get_current_user)) -> list[MaintenanceLog]:
    return session.exec(select(MaintenanceLog)).all()


@router.post("", response_model=MaintenanceRead, status_code=status.HTTP_201_CREATED)
def create_maintenance(
    payload: MaintenanceCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    _=Depends(can_edit),
) -> MaintenanceLog:
    try:
        log = services.create_maintenance(session, payload)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    queue_maintenance_check(background_tasks, log.id)
    return log


@router.post("/{maintenance_id}/close", response_model=MaintenanceRead)
def close_maintenance(maintenance_id: str, session: Session = Depends(get_session), _=Depends(can_edit)) -> MaintenanceLog:
    try:
        return services.close_maintenance(session, maintenance_id)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc

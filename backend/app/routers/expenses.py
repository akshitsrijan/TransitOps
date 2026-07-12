from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app import services
from app.auth import get_current_user, require_role
from app.database import get_session
from app.errors import BusinessRuleError
from app.models import Expense, FuelLog, Role
from app.schemas import ExpenseCreate, ExpenseRead, FuelLogCreate, FuelLogRead

router = APIRouter(prefix="/api", tags=["fuel-and-expenses"])

can_edit = require_role(Role.fleet_manager, Role.financial_analyst)


@router.get("/fuel-logs", response_model=list[FuelLogRead])
def list_fuel_logs(session: Session = Depends(get_session), _=Depends(get_current_user)) -> list[FuelLog]:
    return session.exec(select(FuelLog)).all()


@router.post("/fuel-logs", response_model=FuelLogRead, status_code=status.HTTP_201_CREATED)
def create_fuel_log(payload: FuelLogCreate, session: Session = Depends(get_session), _=Depends(can_edit)) -> FuelLog:
    try:
        return services.create_fuel_log(session, payload)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.get("/expenses", response_model=list[ExpenseRead])
def list_expenses(session: Session = Depends(get_session), _=Depends(get_current_user)) -> list[Expense]:
    return session.exec(select(Expense)).all()


@router.post("/expenses", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseCreate, session: Session = Depends(get_session), _=Depends(can_edit)) -> Expense:
    try:
        return services.create_expense(session, payload)
    except BusinessRuleError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc

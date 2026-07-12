from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.auth import authenticate, get_current_user, issue_token
from app.database import get_session
from app.models import User
from app.schemas import LoginRequest, LoginResponse, UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, session: Session = Depends(get_session)) -> LoginResponse:
    user = authenticate(session, payload.email, payload.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password.")
    token = issue_token(user)
    return LoginResponse(token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(user)

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.auth import authenticate, get_current_user, issue_token
from app.database import get_session
from app.email_utils import send_otp_email, smtp_configured
from app.models import User
from app.schemas import LoginRequest, LoginResponse, SendOtpRequest, SendOtpResponse, UserRead

logger = logging.getLogger("transitops")

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


@router.post("/send-otp", response_model=SendOtpResponse)
def send_otp(payload: SendOtpRequest) -> SendOtpResponse:
    """Deliver a registration OTP to the user's real inbox via SMTP.

    Returns sent=False (instead of an HTTP error) when SMTP is not configured
    or delivery fails, so the frontend can fall back to its sandbox email.
    """
    if not smtp_configured():
        return SendOtpResponse(sent=False, via="disabled", detail="SMTP credentials not configured")
    try:
        send_otp_email(payload.email, payload.code, payload.name)
        return SendOtpResponse(sent=True, via="smtp")
    except Exception as exc:  # noqa: BLE001 - report any delivery failure to the client
        logger.warning("OTP email delivery failed for %s: %s", payload.email, exc)
        return SendOtpResponse(sent=False, via="error", detail=str(exc))

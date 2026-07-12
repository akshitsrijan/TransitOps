import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.database import get_session
from app.models import Role, User

# In-memory opaque token store: {token: user_id}. Mock auth for a demo backend
# with no real session store — resets on restart, same as re-logging in.
_TOKENS: dict[str, str] = {}

_bearer_scheme = HTTPBearer(auto_error=False)


def authenticate(session: Session, email: str, password: str) -> User | None:
    user = session.exec(select(User).where(User.email == email.strip().lower())).first()
    if user and user.password == password:
        return user
    return None


def issue_token(user: User) -> str:
    token = secrets.token_urlsafe(24)
    _TOKENS[token] = user.id
    return token


def revoke_token(token: str) -> None:
    _TOKENS.pop(token, None)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    session: Session = Depends(get_session),
) -> User:
    if credentials is None or credentials.credentials not in _TOKENS:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user_id = _TOKENS[credentials.credentials]
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user


def require_role(*roles: Role):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires one of roles: {', '.join(r.value for r in roles)}")
        return user

    return dependency

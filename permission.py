"""Permission model -> permissions table."""

from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .mixins import TimestampMixin

if TYPE_CHECKING:
    from .role_permission import RolePermission


class Permission(Base, TimestampMixin):
    __tablename__ = "permissions"

    permission_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    permission_code: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    permission_name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # One permission can be granted to many roles (association object pattern).
    role_permissions: Mapped[List["RolePermission"]] = relationship(
        "RolePermission",
        back_populates="permission",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Permission id={self.permission_id} code={self.permission_code!r}>"

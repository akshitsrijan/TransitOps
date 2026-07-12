"""
Reusable column mixins.

TimestampMixin  -> adds created_at / updated_at to any model.
SoftDeleteMixin -> adds deleted_at to "master data" models that support
                   soft deletion (matches `deleted_at` columns in schema.sql).
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """created_at / updated_at, server-side defaults, matches schema.sql."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SoftDeleteMixin:
    """Nullable deleted_at column; NULL means the row is active."""

    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )

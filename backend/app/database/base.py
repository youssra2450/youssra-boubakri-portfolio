"""Declarative base, constraint naming convention and shared column mixins."""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.utils.datetime import utcnow

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

#: Largest value of an ``INTEGER`` primary key (larger identifiers cannot match a row).
MAX_INTEGER_ID = 2_147_483_647

#: Portable JSON column: native JSONB on PostgreSQL, JSON text elsewhere (SQLite in tests).
JSONType = sa.JSON().with_variant(JSONB(), "postgresql")


class Base(DeclarativeBase):
    metadata = sa.MetaData(naming_convention=NAMING_CONVENTION)


class IdMixin:
    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, autoincrement=True, sort_order=-100)


class TimestampMixin:
    """``created_at`` / ``updated_at`` in UTC.

    Python-side defaults keep microsecond precision on every backend; the server defaults cover rows
    inserted outside the ORM.
    """

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=sa.func.now(),
        sort_order=100,
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
        server_default=sa.func.now(),
        sort_order=101,
    )

"""Single-row portfolio profile (identity, about texts and structured highlight lists)."""

from typing import Any

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, IdMixin, JSONType, TimestampMixin


class Profile(IdMixin, TimestampMixin, Base):
    __tablename__ = "profile"

    full_name: Mapped[str] = mapped_column(sa.String(120), nullable=False)
    headline: Mapped[str] = mapped_column(sa.String(200), nullable=False)
    tagline: Mapped[str] = mapped_column(sa.String(200), nullable=False)
    summary: Mapped[str] = mapped_column(sa.Text, nullable=False)
    about_who: Mapped[str] = mapped_column(sa.Text, nullable=False)
    about_what: Mapped[str] = mapped_column(sa.Text, nullable=False)
    about_build: Mapped[str] = mapped_column(sa.Text, nullable=False)
    location: Mapped[str] = mapped_column(sa.String(120), nullable=False)
    mobility: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    email: Mapped[str] = mapped_column(sa.String(254), nullable=False)
    phone: Mapped[str | None] = mapped_column(sa.String(40))
    github_url: Mapped[str | None] = mapped_column(sa.String(500))
    linkedin_url: Mapped[str | None] = mapped_column(sa.String(500))
    photo_url: Mapped[str] = mapped_column(sa.String(500), nullable=False)
    target_roles: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    languages: Mapped[list[dict[str, Any]]] = mapped_column(JSONType, nullable=False, default=list)
    interests: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    snapshot: Mapped[list[dict[str, Any]]] = mapped_column(JSONType, nullable=False, default=list)
    capabilities: Mapped[list[dict[str, Any]]] = mapped_column(JSONType, nullable=False, default=list)

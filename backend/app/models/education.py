"""Degrees and diplomas."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, IdMixin, TimestampMixin


class Education(IdMixin, TimestampMixin, Base):
    __tablename__ = "education"
    __table_args__ = (
        sa.CheckConstraint("status IN ('completed', 'in_progress')", name="status"),
        sa.CheckConstraint("end_year IS NULL OR end_year >= start_year", name="year_range"),
    )

    degree: Mapped[str] = mapped_column(sa.String(200), nullable=False)
    degree_original: Mapped[str | None] = mapped_column(sa.String(255))
    institution: Mapped[str] = mapped_column(sa.String(200), nullable=False)
    location: Mapped[str | None] = mapped_column(sa.String(120))
    start_year: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    end_year: Mapped[int | None] = mapped_column(sa.Integer)
    status: Mapped[str] = mapped_column(
        sa.String(20), nullable=False, default="completed", server_default="completed"
    )
    description: Mapped[str | None] = mapped_column(sa.Text)
    display_order: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, default=0, server_default=sa.text("0"), index=True
    )

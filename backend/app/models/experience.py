"""Professional experiences (internships, jobs)."""

from datetime import date

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, IdMixin, JSONType, TimestampMixin


class Experience(IdMixin, TimestampMixin, Base):
    __tablename__ = "experiences"
    __table_args__ = (sa.CheckConstraint("end_date IS NULL OR end_date >= start_date", name="date_range"),)

    organization: Mapped[str] = mapped_column(sa.String(200), nullable=False)
    location: Mapped[str | None] = mapped_column(sa.String(120))
    employment_type: Mapped[str] = mapped_column(
        sa.String(50), nullable=False, default="Internship", server_default="Internship"
    )
    role: Mapped[str | None] = mapped_column(sa.String(200))
    start_date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(sa.Date)
    project_title: Mapped[str | None] = mapped_column(sa.String(200))
    description: Mapped[str | None] = mapped_column(sa.Text)
    highlights: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    technologies: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    display_order: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, default=0, server_default=sa.text("0"), index=True
    )

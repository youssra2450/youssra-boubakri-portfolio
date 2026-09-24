"""Portfolio projects (case studies) and their technology list.

``domains`` holds the filter taxonomy values (Data Science, AI/ML, NLP, LLM, Computer Vision,
Optimization), ``concepts`` the key technical concepts and ``visual`` the cover identity key.
"""

from typing import Any

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, IdMixin, JSONType, TimestampMixin


class ProjectTechnology(IdMixin, TimestampMixin, Base):
    __tablename__ = "project_technologies"
    __table_args__ = (
        sa.UniqueConstraint("project_id", "name", name="uq_project_technologies_project_id_name"),
    )

    project_id: Mapped[int] = mapped_column(
        sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(sa.String(100), nullable=False, index=True)
    display_order: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, default=0, server_default=sa.text("0")
    )

    project: Mapped["Project"] = relationship(back_populates="technologies")


class Project(IdMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    slug: Mapped[str] = mapped_column(sa.String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(sa.String(200), nullable=False)
    title_original: Mapped[str | None] = mapped_column(sa.String(255))
    category: Mapped[str] = mapped_column(sa.String(120), nullable=False)
    domains: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    concepts: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    visual: Mapped[str | None] = mapped_column(sa.String(40))
    context: Mapped[str | None] = mapped_column(sa.String(120))
    period_label: Mapped[str | None] = mapped_column(sa.String(40))
    start_year: Mapped[int | None] = mapped_column(sa.Integer)
    end_year: Mapped[int | None] = mapped_column(sa.Integer)
    summary: Mapped[str] = mapped_column(sa.Text, nullable=False)
    problem: Mapped[str | None] = mapped_column(sa.Text)
    solution: Mapped[str | None] = mapped_column(sa.Text)
    architecture: Mapped[list[dict[str, Any]]] = mapped_column(JSONType, nullable=False, default=list)
    implementation: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    features: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    results: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    lessons_learned: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    github_url: Mapped[str | None] = mapped_column(sa.String(500))
    demo_url: Mapped[str | None] = mapped_column(sa.String(500))
    featured: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, default=False, server_default=sa.false(), index=True
    )
    is_published: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, default=True, server_default=sa.true(), index=True
    )
    display_order: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, default=0, server_default=sa.text("0"), index=True
    )

    technologies: Mapped[list[ProjectTechnology]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by=lambda: (ProjectTechnology.display_order, ProjectTechnology.id),
        lazy="selectin",
    )

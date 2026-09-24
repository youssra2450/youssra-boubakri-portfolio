"""Skill categories and the skills they group."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, IdMixin, TimestampMixin


class Skill(IdMixin, TimestampMixin, Base):
    __tablename__ = "skills"
    __table_args__ = (
        sa.UniqueConstraint("category_id", "name", name="uq_skills_category_id_name"),
        sa.CheckConstraint(
            "proficiency IS NULL OR proficiency IN ('advanced', 'proficient', 'familiar')",
            name="proficiency",
        ),
    )

    category_id: Mapped[int] = mapped_column(
        sa.ForeignKey("skill_categories.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    proficiency: Mapped[str | None] = mapped_column(sa.String(20))
    is_core: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, default=False, server_default=sa.false()
    )
    display_order: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, default=0, server_default=sa.text("0")
    )

    category: Mapped["SkillCategory"] = relationship(back_populates="skills")


class SkillCategory(IdMixin, TimestampMixin, Base):
    __tablename__ = "skill_categories"

    slug: Mapped[str] = mapped_column(sa.String(80), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(sa.String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(sa.Text)
    icon: Mapped[str | None] = mapped_column(sa.String(50))
    display_order: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, default=0, server_default=sa.text("0"), index=True
    )

    skills: Mapped[list[Skill]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by=lambda: (Skill.display_order, Skill.id),
        lazy="selectin",
    )

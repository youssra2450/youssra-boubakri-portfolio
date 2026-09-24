"""Initial schema: portfolio content and contact messages (docs/SPEC.md §2.2, v2).

Hand-written; there is no users table (the site has no administration area). Every constraint and index
is named explicitly following the metadata naming convention (pk_/uq_/ck_/fk_/ix_), so ``alembic check``
finds no drift.

Revision ID: 0001
Revises:
Create Date: 2026-09-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

#: JSONB on PostgreSQL, JSON elsewhere (mirrors app.database.base.JSONType).
JSON_TYPE = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def _id_column() -> sa.Column:
    return sa.Column("id", sa.Integer(), autoincrement=True, nullable=False)


def _timestamp_columns() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def _display_order_column() -> sa.Column:
    return sa.Column("display_order", sa.Integer(), server_default=sa.text("0"), nullable=False)


def upgrade() -> None:
    op.create_table(
        "profile",
        _id_column(),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("headline", sa.String(length=200), nullable=False),
        sa.Column("tagline", sa.String(length=200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("about_who", sa.Text(), nullable=False),
        sa.Column("about_what", sa.Text(), nullable=False),
        sa.Column("about_build", sa.Text(), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=False),
        sa.Column("mobility", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("github_url", sa.String(length=500), nullable=True),
        sa.Column("linkedin_url", sa.String(length=500), nullable=True),
        sa.Column("photo_url", sa.String(length=500), nullable=False),
        sa.Column("target_roles", JSON_TYPE, nullable=False),
        sa.Column("languages", JSON_TYPE, nullable=False),
        sa.Column("interests", JSON_TYPE, nullable=False),
        sa.Column("snapshot", JSON_TYPE, nullable=False),
        sa.Column("capabilities", JSON_TYPE, nullable=False),
        *_timestamp_columns(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_profile")),
    )

    op.create_table(
        "education",
        _id_column(),
        sa.Column("degree", sa.String(length=200), nullable=False),
        sa.Column("degree_original", sa.String(length=255), nullable=True),
        sa.Column("institution", sa.String(length=200), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("start_year", sa.Integer(), nullable=False),
        sa.Column("end_year", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="completed", nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        _display_order_column(),
        *_timestamp_columns(),
        sa.CheckConstraint("status IN ('completed', 'in_progress')", name=op.f("ck_education_status")),
        sa.CheckConstraint(
            "end_year IS NULL OR end_year >= start_year", name=op.f("ck_education_year_range")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_education")),
    )
    op.create_index(op.f("ix_education_display_order"), "education", ["display_order"], unique=False)

    op.create_table(
        "experiences",
        _id_column(),
        sa.Column("organization", sa.String(length=200), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("employment_type", sa.String(length=50), server_default="Internship", nullable=False),
        sa.Column("role", sa.String(length=200), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("project_title", sa.String(length=200), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("highlights", JSON_TYPE, nullable=False),
        sa.Column("technologies", JSON_TYPE, nullable=False),
        _display_order_column(),
        *_timestamp_columns(),
        sa.CheckConstraint(
            "end_date IS NULL OR end_date >= start_date", name=op.f("ck_experiences_date_range")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_experiences")),
    )
    op.create_index(op.f("ix_experiences_display_order"), "experiences", ["display_order"], unique=False)

    op.create_table(
        "skill_categories",
        _id_column(),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(length=50), nullable=True),
        _display_order_column(),
        *_timestamp_columns(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_skill_categories")),
        sa.UniqueConstraint("slug", name=op.f("uq_skill_categories_slug")),
    )
    op.create_index(
        op.f("ix_skill_categories_display_order"), "skill_categories", ["display_order"], unique=False
    )

    op.create_table(
        "skills",
        _id_column(),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("proficiency", sa.String(length=20), nullable=True),
        sa.Column("is_core", sa.Boolean(), server_default=sa.false(), nullable=False),
        _display_order_column(),
        *_timestamp_columns(),
        sa.CheckConstraint(
            "proficiency IS NULL OR proficiency IN ('advanced', 'proficient', 'familiar')",
            name=op.f("ck_skills_proficiency"),
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["skill_categories.id"],
            name=op.f("fk_skills_category_id_skill_categories"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_skills")),
        sa.UniqueConstraint("category_id", "name", name=op.f("uq_skills_category_id_name")),
    )
    op.create_index(op.f("ix_skills_category_id"), "skills", ["category_id"], unique=False)

    op.create_table(
        "projects",
        _id_column(),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("title_original", sa.String(length=255), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("domains", JSON_TYPE, nullable=False),
        sa.Column("concepts", JSON_TYPE, nullable=False),
        sa.Column("visual", sa.String(length=40), nullable=True),
        sa.Column("context", sa.String(length=120), nullable=True),
        sa.Column("period_label", sa.String(length=40), nullable=True),
        sa.Column("start_year", sa.Integer(), nullable=True),
        sa.Column("end_year", sa.Integer(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("problem", sa.Text(), nullable=True),
        sa.Column("solution", sa.Text(), nullable=True),
        sa.Column("architecture", JSON_TYPE, nullable=False),
        sa.Column("implementation", JSON_TYPE, nullable=False),
        sa.Column("features", JSON_TYPE, nullable=False),
        sa.Column("results", JSON_TYPE, nullable=False),
        sa.Column("lessons_learned", JSON_TYPE, nullable=False),
        sa.Column("github_url", sa.String(length=500), nullable=True),
        sa.Column("demo_url", sa.String(length=500), nullable=True),
        sa.Column("featured", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default=sa.true(), nullable=False),
        _display_order_column(),
        *_timestamp_columns(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_projects")),
        sa.UniqueConstraint("slug", name=op.f("uq_projects_slug")),
    )
    op.create_index(op.f("ix_projects_featured"), "projects", ["featured"], unique=False)
    op.create_index(op.f("ix_projects_is_published"), "projects", ["is_published"], unique=False)
    op.create_index(op.f("ix_projects_display_order"), "projects", ["display_order"], unique=False)

    op.create_table(
        "project_technologies",
        _id_column(),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        _display_order_column(),
        *_timestamp_columns(),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_project_technologies_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_technologies")),
        sa.UniqueConstraint("project_id", "name", name=op.f("uq_project_technologies_project_id_name")),
    )
    op.create_index(
        op.f("ix_project_technologies_project_id"), "project_technologies", ["project_id"], unique=False
    )
    op.create_index(op.f("ix_project_technologies_name"), "project_technologies", ["name"], unique=False)

    op.create_table(
        "contact_messages",
        _id_column(),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("subject", sa.String(length=150), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("ip_hash", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=300), nullable=True),
        sa.Column("is_spam", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("email_forwarded", sa.Boolean(), server_default=sa.false(), nullable=False),
        *_timestamp_columns(),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_contact_messages")),
    )
    op.create_index(op.f("ix_contact_messages_email"), "contact_messages", ["email"], unique=False)
    op.create_index(op.f("ix_contact_messages_created_at"), "contact_messages", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_contact_messages_created_at"), table_name="contact_messages")
    op.drop_index(op.f("ix_contact_messages_email"), table_name="contact_messages")
    op.drop_table("contact_messages")

    op.drop_index(op.f("ix_project_technologies_name"), table_name="project_technologies")
    op.drop_index(op.f("ix_project_technologies_project_id"), table_name="project_technologies")
    op.drop_table("project_technologies")

    op.drop_index(op.f("ix_projects_display_order"), table_name="projects")
    op.drop_index(op.f("ix_projects_is_published"), table_name="projects")
    op.drop_index(op.f("ix_projects_featured"), table_name="projects")
    op.drop_table("projects")

    op.drop_index(op.f("ix_skills_category_id"), table_name="skills")
    op.drop_table("skills")

    op.drop_index(op.f("ix_skill_categories_display_order"), table_name="skill_categories")
    op.drop_table("skill_categories")

    op.drop_index(op.f("ix_experiences_display_order"), table_name="experiences")
    op.drop_table("experiences")

    op.drop_index(op.f("ix_education_display_order"), table_name="education")
    op.drop_table("education")

    op.drop_table("profile")

"""Shape of ``database/seed/portfolio.json``, the single source of the portfolio content.

Unknown keys are rejected (typos surface immediately); keys starting with ``_`` are stripped by the
loader before validation.
"""

from collections.abc import Callable
from datetime import date
from typing import Annotated, Any

from pydantic import EmailStr, Field, StringConstraints, ValidationInfo, field_validator

from app.schemas.common import (
    DisplayOrder,
    InputModel,
    ListItem,
    OptionalLink,
    RequiredLink,
    Tag,
    Year,
    ensure_unique,
    optional_text,
    required_text,
)
from app.schemas.education import EducationStatus
from app.schemas.profile import CapabilityItem, LanguageItem, SnapshotItem
from app.schemas.project import ArchitectureStep
from app.schemas.skill import Proficiency
from app.utils.slug import SLUG_PATTERN

CategorySlug = Annotated[str, StringConstraints(strip_whitespace=True, max_length=80, pattern=SLUG_PATTERN)]
ProjectSlug = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120, pattern=SLUG_PATTERN)]
#: Cover identity key (``multi-agent``, ``uav`` ...): lower-case words separated by hyphens.
VisualKey = Annotated[str, StringConstraints(strip_whitespace=True, max_length=40, pattern=SLUG_PATTERN)]


def _end_not_before_start(start_field: str) -> Callable[[Any, ValidationInfo], Any]:
    """Validator factory: the end of a range (year or date) cannot precede its start."""

    def check(value: Any, info: ValidationInfo) -> Any:
        start = info.data.get(start_field)
        if value is not None and start is not None and value < start:
            raise ValueError(f"{info.field_name} must not be before {start_field}.")
        return value

    return check


class SeedProfile(InputModel):
    full_name: required_text(120)
    headline: required_text(200)
    tagline: required_text(200)
    summary: required_text(5000)
    about_who: required_text(5000)
    about_what: required_text(5000)
    about_build: required_text(5000)
    location: required_text(120)
    mobility: required_text(255)
    email: Annotated[EmailStr, Field(max_length=254)]
    phone: optional_text(40, pattern=r"^\+?[0-9 ().-]{3,40}$") = None
    github_url: OptionalLink = None
    linkedin_url: OptionalLink = None
    photo_url: RequiredLink
    target_roles: list[required_text(80)] = Field(default_factory=list, max_length=30)
    languages: list[LanguageItem] = Field(default_factory=list, max_length=20)
    interests: list[required_text(80)] = Field(default_factory=list, max_length=30)
    snapshot: list[SnapshotItem] = Field(default_factory=list, max_length=12)
    capabilities: list[CapabilityItem] = Field(default_factory=list, max_length=12)

    _unique_lists = field_validator("target_roles", "interests")(ensure_unique)


class SeedEducation(InputModel):
    degree: required_text(200)
    degree_original: optional_text(255) = None
    institution: required_text(200)
    location: optional_text(120) = None
    start_year: Year
    end_year: Year | None = None
    status: EducationStatus = "completed"
    description: optional_text(5000) = None
    display_order: DisplayOrder = 0

    _year_range = field_validator("end_year")(_end_not_before_start("start_year"))


class SeedExperience(InputModel):
    organization: required_text(200)
    location: optional_text(120) = None
    employment_type: required_text(50) = "Internship"
    role: optional_text(200) = None
    start_date: date
    end_date: date | None = None
    project_title: optional_text(200) = None
    description: optional_text(5000) = None
    highlights: list[ListItem] = Field(default_factory=list, max_length=30)
    technologies: list[Tag] = Field(default_factory=list, max_length=40)
    display_order: DisplayOrder = 0

    _unique_technologies = field_validator("technologies")(ensure_unique)
    _date_range = field_validator("end_date")(_end_not_before_start("start_date"))


class SeedSkill(InputModel):
    name: required_text(100)
    proficiency: Proficiency | None = None
    is_core: bool = False


class SeedSkillCategory(InputModel):
    slug: CategorySlug | None = Field(default=None, description="Generated from `name` when omitted.")
    name: required_text(120)
    description: optional_text(2000) = None
    icon: optional_text(50) = None
    display_order: DisplayOrder = 0
    skills: list[SeedSkill] = Field(default_factory=list)


class SeedProject(InputModel):
    slug: ProjectSlug | None = Field(default=None, description="Generated from `title` when omitted.")
    title: required_text(200)
    title_original: optional_text(255) = None
    category: required_text(120)
    domains: list[required_text(60)] = Field(default_factory=list, max_length=20)
    concepts: list[required_text(80)] = Field(default_factory=list, max_length=20)
    visual: VisualKey | None = None
    context: optional_text(120) = None
    period_label: optional_text(40) = None
    start_year: Year | None = None
    end_year: Year | None = None
    summary: required_text(2000)
    problem: optional_text(5000) = None
    solution: optional_text(5000) = None
    architecture: list[ArchitectureStep] = Field(default_factory=list, max_length=20)
    implementation: list[ListItem] = Field(default_factory=list, max_length=30)
    features: list[ListItem] = Field(default_factory=list, max_length=30)
    results: list[ListItem] = Field(default_factory=list, max_length=30)
    lessons_learned: list[ListItem] = Field(default_factory=list, max_length=30)
    technologies: list[Tag] = Field(default_factory=list, max_length=40)
    github_url: OptionalLink = None
    demo_url: OptionalLink = None
    featured: bool = False
    is_published: bool = True
    display_order: DisplayOrder = 0

    _unique_lists = field_validator("domains", "concepts", "technologies")(ensure_unique)
    _year_range = field_validator("end_year")(_end_not_before_start("start_year"))


class SeedData(InputModel):
    profile: SeedProfile
    education: list[SeedEducation] = Field(default_factory=list)
    experiences: list[SeedExperience] = Field(default_factory=list)
    skill_categories: list[SeedSkillCategory] = Field(default_factory=list)
    projects: list[SeedProject] = Field(default_factory=list)

    @field_validator("projects")
    @classmethod
    def _unique_project_slugs(cls, projects: list[SeedProject]) -> list[SeedProject]:
        slugs = [project.slug for project in projects if project.slug]
        ensure_unique(slugs)
        return projects

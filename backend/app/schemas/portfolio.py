"""Aggregate payload used by the home page (one request)."""

from app.schemas.common import ReadModel
from app.schemas.education import EducationRead
from app.schemas.experience import ExperienceRead
from app.schemas.profile import ProfileRead
from app.schemas.project import ProjectSummary
from app.schemas.skill import SkillCategoryRead


class PortfolioRead(ReadModel):
    profile: ProfileRead
    education: list[EducationRead]
    experience: list[ExperienceRead]
    skills: list[SkillCategoryRead]
    projects: list[ProjectSummary]

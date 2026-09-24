"""Home-page aggregate: everything the public site needs in one payload."""

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.schemas.portfolio import PortfolioRead
from app.services.education_service import EducationService
from app.services.experience_service import ExperienceService
from app.services.profile_service import ProfileService
from app.services.project_service import ProjectService
from app.services.skill_service import SkillService


class PortfolioService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.profile = ProfileService(db, settings)
        self.education = EducationService(db)
        self.experience = ExperienceService(db)
        self.skills = SkillService(db)
        self.projects = ProjectService(db)

    def get_portfolio(self) -> PortfolioRead:
        return PortfolioRead(
            profile=self.profile.get_profile(),
            education=self.education.list_education(),
            experience=self.experience.list_experiences(),
            skills=self.skills.list_categories(),
            projects=self.projects.list_published(),
        )

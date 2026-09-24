"""Experience use cases."""

from sqlalchemy.orm import Session

from app.repositories.experience import ExperienceRepository
from app.schemas.experience import ExperienceRead


class ExperienceService:
    def __init__(self, db: Session) -> None:
        self.experiences = ExperienceRepository(db)

    def list_experiences(self) -> list[ExperienceRead]:
        return [ExperienceRead.model_validate(item) for item in self.experiences.list_ordered()]

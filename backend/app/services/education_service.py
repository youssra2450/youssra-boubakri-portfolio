"""Education use cases."""

from sqlalchemy.orm import Session

from app.repositories.education import EducationRepository
from app.schemas.education import EducationRead


class EducationService:
    def __init__(self, db: Session) -> None:
        self.education = EducationRepository(db)

    def list_education(self) -> list[EducationRead]:
        return [EducationRead.model_validate(item) for item in self.education.list_ordered()]

"""Skill use cases."""

from sqlalchemy.orm import Session

from app.repositories.skill import SkillCategoryRepository
from app.schemas.skill import SkillCategoryRead


class SkillService:
    def __init__(self, db: Session) -> None:
        self.categories = SkillCategoryRepository(db)

    def list_categories(self) -> list[SkillCategoryRead]:
        return [SkillCategoryRead.model_validate(category) for category in self.categories.list_with_skills()]

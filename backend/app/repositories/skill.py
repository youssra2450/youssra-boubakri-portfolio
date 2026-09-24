from collections.abc import Sequence

from sqlalchemy import select

from app.models.skill import SkillCategory
from app.repositories.base import Repository


class SkillCategoryRepository(Repository[SkillCategory]):
    model = SkillCategory

    def list_with_skills(self) -> Sequence[SkillCategory]:
        """Categories by ``display_order``; skills are eager-loaded, ordered by the relationship."""
        statement = select(SkillCategory).order_by(SkillCategory.display_order, SkillCategory.id)
        return self.session.scalars(statement).all()

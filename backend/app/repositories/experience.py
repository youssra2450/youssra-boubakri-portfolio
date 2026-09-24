from collections.abc import Sequence

from sqlalchemy import select

from app.models.experience import Experience
from app.repositories.base import Repository


class ExperienceRepository(Repository[Experience]):
    model = Experience

    def list_ordered(self) -> Sequence[Experience]:
        statement = select(Experience).order_by(
            Experience.display_order, Experience.start_date.desc(), Experience.id
        )
        return self.session.scalars(statement).all()

from collections.abc import Sequence

from sqlalchemy import select

from app.models.education import Education
from app.repositories.base import Repository


class EducationRepository(Repository[Education]):
    model = Education

    def list_ordered(self) -> Sequence[Education]:
        statement = select(Education).order_by(
            Education.display_order, Education.start_year.desc(), Education.id
        )
        return self.session.scalars(statement).all()

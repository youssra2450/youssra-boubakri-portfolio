from sqlalchemy import func, select

from app.models.project import Project, ProjectTechnology
from app.repositories.base import Repository


class ProjectRepository(Repository[Project]):
    model = Project

    #: Featured projects first, then the curated ``display_order``.
    _ORDER = (Project.featured.desc(), Project.display_order, Project.id)

    def list_published(
        self,
        *,
        domain: str | None = None,
        technology: str | None = None,
        featured: bool | None = None,
    ) -> list[Project]:
        """Published projects, optionally filtered (all filters are case-insensitive).

        ``domain`` is matched in Python: JSON array containment is not portable between PostgreSQL
        and SQLite, and the table holds a handful of rows.
        """
        statement = select(Project).where(Project.is_published.is_(True)).order_by(*self._ORDER)
        if featured is not None:
            statement = statement.where(Project.featured.is_(featured))
        if technology and technology.strip():
            matching_projects = select(ProjectTechnology.project_id).where(
                func.lower(ProjectTechnology.name) == technology.strip().lower()
            )
            statement = statement.where(Project.id.in_(matching_projects))
        projects = list(self.session.scalars(statement).all())
        if domain and domain.strip():
            wanted = domain.strip().casefold()
            projects = [
                project for project in projects if wanted in {value.casefold() for value in project.domains}
            ]
        return projects

    def get_by_slug(self, slug: str) -> Project | None:
        return self.session.scalar(select(Project).where(Project.slug == slug))

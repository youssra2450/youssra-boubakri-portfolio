"""Project use cases (public catalogue)."""

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.database.base import MAX_INTEGER_ID
from app.repositories.project import ProjectRepository
from app.schemas.project import ProjectDetail, ProjectSummary

PROJECT_NOT_FOUND = "Project not found."


class ProjectService:
    def __init__(self, db: Session) -> None:
        self.projects = ProjectRepository(db)

    def list_published(
        self, *, domain: str | None = None, technology: str | None = None, featured: bool | None = None
    ) -> list[ProjectSummary]:
        projects = self.projects.list_published(domain=domain, technology=technology, featured=featured)
        return [ProjectSummary.model_validate(project) for project in projects]

    def get_published(self, id_or_slug: str) -> ProjectDetail:
        """Resolve a numeric id or a slug; unpublished projects are reported as missing."""
        if id_or_slug.isdecimal():
            project_id = int(id_or_slug)
            project = self.projects.get(project_id) if project_id <= MAX_INTEGER_ID else None
        else:
            project = self.projects.get_by_slug(id_or_slug)
        if project is None or not project.is_published:
            raise NotFoundError(PROJECT_NOT_FOUND)
        return ProjectDetail.model_validate(project)

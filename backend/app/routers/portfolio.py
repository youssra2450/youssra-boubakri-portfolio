"""Public, read-only portfolio content. Every response carries a weak ETag and honours If-None-Match."""

from typing import Annotated

from fastapi import APIRouter, Path, Query, Request
from starlette.responses import Response

from app.routers.dependencies import (
    EducationServiceDep,
    ExperienceServiceDep,
    PortfolioServiceDep,
    ProfileServiceDep,
    ProjectServiceDep,
    SkillServiceDep,
)
from app.routers.responses import NOT_FOUND, NOT_MODIFIED
from app.schemas.education import EducationRead
from app.schemas.experience import ExperienceRead
from app.schemas.portfolio import PortfolioRead
from app.schemas.profile import ProfileRead
from app.schemas.project import PROJECT_DOMAINS, ProjectDetail, ProjectSummary
from app.schemas.skill import SkillCategoryRead
from app.utils.http_cache import cached_json_response

router = APIRouter(tags=["portfolio"], responses=NOT_MODIFIED)

_DOMAIN_LIST = ", ".join(f"`{domain}`" for domain in PROJECT_DOMAINS)


@router.get(
    "/portfolio",
    response_model=PortfolioRead,
    summary="Everything the home page needs",
    description="Profile, education, experience, skills and published projects in a single request.",
    responses=NOT_FOUND,
)
def get_portfolio(request: Request, service: PortfolioServiceDep) -> Response:
    return cached_json_response(request, service.get_portfolio())


@router.get(
    "/profile",
    response_model=ProfileRead,
    summary="Profile",
    description="Identity, about texts, highlights and public links. `contact_form_enabled` tells whether "
    "the contact form can be used (e-mail forwarding configured).",
    responses=NOT_FOUND,
)
def get_profile(request: Request, service: ProfileServiceDep) -> Response:
    return cached_json_response(request, service.get_profile())


@router.get(
    "/education",
    response_model=list[EducationRead],
    summary="Education",
    description="Ordered by `display_order`, then most recent first.",
)
def list_education(request: Request, service: EducationServiceDep) -> Response:
    return cached_json_response(request, service.list_education())


@router.get(
    "/experience",
    response_model=list[ExperienceRead],
    summary="Professional experience",
    description="Ordered by `display_order`, then most recent first.",
)
def list_experience(request: Request, service: ExperienceServiceDep) -> Response:
    return cached_json_response(request, service.list_experiences())


@router.get(
    "/skills",
    response_model=list[SkillCategoryRead],
    summary="Skills by category",
    description="Categories with their nested skills, both ordered by `display_order`.",
)
def list_skills(request: Request, service: SkillServiceDep) -> Response:
    return cached_json_response(request, service.list_categories())


@router.get(
    "/projects",
    response_model=list[ProjectSummary],
    summary="Published projects",
    description="Published projects, featured first, then by `display_order`.\n\n"
    "Optional case-insensitive filters: `domain` (one of the project's domains; the site filters on "
    f"{_DOMAIN_LIST}), `technology` (exact technology name) and `featured`.",
)
def list_projects(
    request: Request,
    service: ProjectServiceDep,
    domain: Annotated[str | None, Query(max_length=60, examples=list(PROJECT_DOMAINS))] = None,
    technology: Annotated[str | None, Query(max_length=100, examples=["Python"])] = None,
    featured: Annotated[bool | None, Query(description="Only featured (`true`) or other projects.")] = None,
) -> Response:
    projects = service.list_published(domain=domain, technology=technology, featured=featured)
    return cached_json_response(request, projects)


@router.get(
    "/projects/{id_or_slug}",
    response_model=ProjectDetail,
    summary="Project case study",
    description="Look a published project up by numeric id or by slug (unpublished projects are `404`).",
    responses=NOT_FOUND,
)
def get_project(
    request: Request,
    service: ProjectServiceDep,
    id_or_slug: Annotated[str, Path(max_length=120, examples=["ai-technology-watch-system"])],
) -> Response:
    return cached_json_response(request, service.get_published(id_or_slug))

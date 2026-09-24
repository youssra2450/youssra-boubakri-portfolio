"""FastAPI dependencies shared by the routers: settings, database sessions, services, rate limits."""

from collections.abc import Callable, Iterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.core.exceptions import RateLimitExceeded
from app.core.rate_limit import RateLimiter, RateLimitRule
from app.services.contact_service import ContactService, ensure_contact_form_enabled
from app.services.education_service import EducationService
from app.services.email import EmailSender, build_email_sender
from app.services.experience_service import ExperienceService
from app.services.health_service import HealthService
from app.services.notification_service import NotificationService
from app.services.portfolio_service import PortfolioService
from app.services.profile_service import ProfileService
from app.services.project_service import ProjectService
from app.services.seo_service import SeoService
from app.services.skill_service import SkillService
from app.utils.network import get_client_ip


def get_app_settings(request: Request) -> Settings:
    """Settings the application was created with (``create_app(settings)``)."""
    settings: Settings = request.app.state.settings
    return settings


def get_session_factory(request: Request) -> sessionmaker[Session]:
    """Session factory bound to the application's engine."""
    factory: sessionmaker[Session] = request.app.state.session_factory
    return factory


def get_rate_limiter(request: Request) -> RateLimiter:
    limiter: RateLimiter = request.app.state.rate_limiter
    return limiter


AppSettings = Annotated[Settings, Depends(get_app_settings)]
SessionFactory = Annotated[sessionmaker[Session], Depends(get_session_factory)]


def get_db(factory: SessionFactory) -> Iterator[Session]:
    """One session per request, always closed."""
    session = factory()
    try:
        yield session
    finally:
        session.close()


DbSession = Annotated[Session, Depends(get_db)]


def client_ip(request: Request, settings: AppSettings) -> str:
    return get_client_ip(request, trust_proxy_headers=settings.trust_proxy_headers)


ClientIp = Annotated[str, Depends(client_ip)]


# Services ---------------------------------------------------------------------------------------------


def get_profile_service(db: DbSession, settings: AppSettings) -> ProfileService:
    return ProfileService(db, settings)


def get_education_service(db: DbSession) -> EducationService:
    return EducationService(db)


def get_experience_service(db: DbSession) -> ExperienceService:
    return ExperienceService(db)


def get_skill_service(db: DbSession) -> SkillService:
    return SkillService(db)


def get_project_service(db: DbSession) -> ProjectService:
    return ProjectService(db)


def get_portfolio_service(db: DbSession, settings: AppSettings) -> PortfolioService:
    return PortfolioService(db, settings)


def get_contact_service(db: DbSession, settings: AppSettings) -> ContactService:
    return ContactService(db, settings)


def get_email_sender(settings: AppSettings) -> EmailSender:
    return build_email_sender(settings)


def get_notification_service(
    settings: AppSettings,
    factory: SessionFactory,
    sender: Annotated[EmailSender, Depends(get_email_sender)],
) -> NotificationService:
    return NotificationService(
        sender, email_from=settings.email_from, email_to=settings.email_to, session_factory=factory
    )


def get_health_service(db: DbSession, settings: AppSettings) -> HealthService:
    return HealthService(db, settings)


def get_seo_service(db: DbSession, settings: AppSettings) -> SeoService:
    return SeoService(db, settings)


ProfileServiceDep = Annotated[ProfileService, Depends(get_profile_service)]
EducationServiceDep = Annotated[EducationService, Depends(get_education_service)]
ExperienceServiceDep = Annotated[ExperienceService, Depends(get_experience_service)]
SkillServiceDep = Annotated[SkillService, Depends(get_skill_service)]
ProjectServiceDep = Annotated[ProjectService, Depends(get_project_service)]
PortfolioServiceDep = Annotated[PortfolioService, Depends(get_portfolio_service)]
ContactServiceDep = Annotated[ContactService, Depends(get_contact_service)]
NotificationServiceDep = Annotated[NotificationService, Depends(get_notification_service)]
HealthServiceDep = Annotated[HealthService, Depends(get_health_service)]
SeoServiceDep = Annotated[SeoService, Depends(get_seo_service)]


# Guards -----------------------------------------------------------------------------------------------


def require_contact_form(settings: AppSettings) -> None:
    """``503 contact_unavailable`` while e-mail forwarding is not configured (checked first)."""
    ensure_contact_form_enabled(settings)


class RateLimit:
    """Dependency enforcing a per-client-IP limit read from settings (e.g. ``RATE_LIMIT_CONTACT``)."""

    def __init__(self, name: str, rule_from_settings: Callable[[Settings], RateLimitRule]) -> None:
        self.name = name
        self.rule_from_settings = rule_from_settings

    def __call__(
        self,
        ip: ClientIp,
        settings: AppSettings,
        limiter: Annotated[RateLimiter, Depends(get_rate_limiter)],
    ) -> None:
        result = limiter.hit(f"{self.name}:{ip}", self.rule_from_settings(settings))
        if not result.allowed:
            raise RateLimitExceeded(retry_after=result.retry_after)


contact_rate_limit = RateLimit("contact", lambda settings: settings.contact_rate_limit)

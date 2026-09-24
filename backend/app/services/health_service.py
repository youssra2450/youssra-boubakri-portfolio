"""Service health."""

import logging

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.repositories.health import DatabaseProbe
from app.schemas.health import HealthResponse
from app.utils.datetime import utcnow

logger = logging.getLogger(__name__)


class HealthService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.probe = DatabaseProbe(db)
        self.settings = settings

    def check(self) -> HealthResponse:
        database_ok = self.probe.ping()
        if not database_ok:
            logger.warning("health.database_unavailable")
        return HealthResponse(
            status="healthy" if database_ok else "degraded",
            service=self.settings.app_name,
            version=self.settings.app_version,
            database="connected" if database_ok else "unavailable",
            timestamp=utcnow(),
        )

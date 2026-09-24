"""Health-check schema."""

from typing import Literal

from pydantic import ConfigDict

from app.schemas.common import ReadModel, UtcDateTime


class HealthResponse(ReadModel):
    status: Literal["healthy", "degraded"]
    service: str
    version: str
    database: Literal["connected", "unavailable"]
    timestamp: UtcDateTime

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "status": "healthy",
                    "service": "portfolio-api",
                    "version": "1.0.0",
                    "database": "connected",
                    "timestamp": "2026-01-01T12:00:00Z",
                }
            ]
        }
    )

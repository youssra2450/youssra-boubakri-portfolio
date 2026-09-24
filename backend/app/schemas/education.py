"""Education schemas."""

from typing import Literal

from pydantic import ConfigDict, Field

from app.schemas.common import ReadModel

EducationStatus = Literal["completed", "in_progress"]


class EducationRead(ReadModel):
    id: int
    degree: str
    degree_original: str | None = Field(description="Original (French) title of the degree.")
    institution: str
    location: str | None
    start_year: int
    end_year: int | None
    status: EducationStatus
    description: str | None
    display_order: int

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "id": 1,
                    "degree": "Master's Degree — Data Science & Intelligent Systems",
                    "degree_original": "Master en Sciences des Données et Systèmes Intelligents",
                    "institution": "Faculté Pluridisciplinaire de Nador",
                    "location": "Nador, Morocco",
                    "start_year": 2024,
                    "end_year": 2026,
                    "status": "completed",
                    "description": "Graduate programme in data science, machine learning and intelligent "
                    "systems (SDSI).",
                    "display_order": 1,
                }
            ]
        }
    )

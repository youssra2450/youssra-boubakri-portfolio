"""Experience schemas."""

from datetime import date

from pydantic import ConfigDict, Field

from app.schemas.common import ReadModel


class ExperienceRead(ReadModel):
    id: int
    organization: str
    location: str | None
    employment_type: str
    role: str | None
    start_date: date
    end_date: date | None = Field(description="`null` means the position is ongoing.")
    project_title: str | None
    description: str | None
    highlights: list[str]
    technologies: list[str]
    display_order: int

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "id": 1,
                    "organization": "CDG",
                    "location": "Rabat, Morocco",
                    "employment_type": "Internship",
                    "role": None,
                    "start_date": "2023-05-01",
                    "end_date": "2023-07-01",
                    "project_title": "IT Incident Management Application",
                    "description": "Designed and developed a centralised application to track and steer "
                    "the Run Factory activity, aligned with ITIL best practices.",
                    "highlights": [],
                    "technologies": [],
                    "display_order": 1,
                }
            ]
        }
    )

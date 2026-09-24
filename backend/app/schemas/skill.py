"""Skill and skill-category schemas."""

from typing import Literal

from pydantic import ConfigDict, Field

from app.schemas.common import ReadModel

Proficiency = Literal["advanced", "proficient", "familiar"]


class SkillRead(ReadModel):
    id: int
    category_id: int
    name: str
    proficiency: Proficiency | None = Field(description="Only set when stated; never a percentage.")
    is_core: bool
    display_order: int


class SkillCategoryRead(ReadModel):
    id: int
    slug: str
    name: str
    description: str | None = Field(description="Domain of use of the skills in this category.")
    icon: str | None
    display_order: int
    skills: list[SkillRead]

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "id": 4,
                    "slug": "big-data",
                    "name": "Big Data",
                    "description": "Distributed storage and processing of large or streaming datasets.",
                    "icon": "server",
                    "display_order": 4,
                    "skills": [
                        {
                            "id": 30,
                            "category_id": 4,
                            "name": "Apache Spark",
                            "proficiency": None,
                            "is_core": True,
                            "display_order": 2,
                        }
                    ],
                }
            ]
        }
    )

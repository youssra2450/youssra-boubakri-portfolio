"""Profile schemas."""

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import ReadModel, UtcDateTime, required_text


class LanguageItem(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: required_text(60)
    level: required_text(120)


class SnapshotItem(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: required_text(80)
    items: list[required_text(80)] = Field(default_factory=list, max_length=20)


class CapabilityItem(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    key: required_text(40)
    title: required_text(80)
    description: required_text(500)
    tools: list[required_text(60)] = Field(default_factory=list, max_length=20)


class ProfileRead(ReadModel):
    full_name: str
    headline: str
    tagline: str
    summary: str
    about_who: str
    about_what: str
    about_build: str
    location: str
    mobility: str
    email: str
    phone: str | None = Field(description="Not published: the public channels are e-mail, LinkedIn, GitHub.")
    github_url: str | None
    linkedin_url: str | None
    photo_url: str
    target_roles: list[str]
    languages: list[LanguageItem]
    interests: list[str]
    snapshot: list[SnapshotItem]
    capabilities: list[CapabilityItem]
    contact_form_enabled: bool = Field(
        default=False,
        description="`true` only when the backend can forward contact-form messages by e-mail; the site "
        "shows the form only in that case.",
    )
    updated_at: UtcDateTime

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "full_name": "Youssra Boubakri",
                    "headline": "Data Scientist | Data Engineer | Data Analyst",
                    "tagline": "Turning complex data into decision-ready intelligence.",
                    "summary": "…",
                    "about_who": "…",
                    "about_what": "…",
                    "about_build": "…",
                    "location": "Morocco",
                    "mobility": "Mobile across Morocco and open to international relocation — "
                    "available to travel for full-time positions and internships.",
                    "email": "youssrabkr2002@gmail.com",
                    "phone": None,
                    "github_url": "https://github.com/youssra2450",
                    "linkedin_url": "https://www.linkedin.com/in/youssra-boubakri-a4390b25b/",
                    "photo_url": "/images/youssra-boubakri-800.webp",
                    "target_roles": ["Data Scientist", "Data Engineer", "Data Analyst"],
                    "languages": [{"name": "Arabic", "level": "Native"}],
                    "interests": ["Travel", "Cooking", "Volunteering & community activities"],
                    "snapshot": [
                        {"title": "Data Science", "items": ["Machine Learning", "Statistics", "AI"]}
                    ],
                    "capabilities": [
                        {
                            "key": "analytics",
                            "title": "Data Analytics",
                            "description": "Dashboards, KPIs, reporting and exploratory data analysis that "
                            "turn raw data into clear answers.",
                            "tools": ["SQL", "Pandas", "NumPy", "Excel", "Statistics"],
                        }
                    ],
                    "contact_form_enabled": False,
                    "updated_at": "2026-09-22T12:00:00Z",
                }
            ]
        }
    )

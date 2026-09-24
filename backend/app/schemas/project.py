"""Project schemas: public summary (cards) and detail (case study)."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import ReadModel, UtcDateTime, required_text

#: Filter taxonomy of the Projects section, in display order (values of ``ProjectSummary.domains``).
PROJECT_DOMAINS = ("Data Science", "AI/ML", "NLP", "LLM", "Computer Vision", "Optimization")

_EXAMPLE_SUMMARY: dict[str, Any] = {
    "id": 5,
    "slug": "tsp-uav-optimization",
    "title": "TSP-UAV Optimization using GWO, Cuckoo Search & Tabu Search",
    "title_original": None,
    "category": "Optimization · Metaheuristics · IoT",
    "domains": ["Optimization"],
    "concepts": [
        "Metaheuristics",
        "UAV trajectory planning",
        "IoT",
        "Algorithm comparison",
        "Data visualization",
    ],
    "visual": "uav",
    "context": None,
    "period_label": None,
    "start_year": None,
    "end_year": None,
    "summary": "Implementation and visualisation of the Travelling Salesman Problem applied to an Unmanned "
    "Aerial Vehicle (UAV) in an IoT context, comparing metaheuristic algorithms to find efficient UAV "
    "trajectories.",
    "technologies": ["Grey Wolf Optimizer", "Cuckoo Search", "Tabu Search"],
    "features": [
        "Grey Wolf Optimizer (GWO)",
        "Cuckoo Search (CS)",
        "Tabu Search (TS)",
        "Random trajectory generation",
        "Algorithm comparison",
        "Trajectory visualisation",
    ],
    "github_url": "https://github.com/farahbanhakeia/TSP-UAV-Optimization-Algorithms-GWO-CS-TS-",
    "demo_url": None,
    "featured": True,
    "display_order": 5,
}


class ArchitectureStep(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    step: required_text(120)
    description: required_text(1000)


class ProjectSummary(ReadModel):
    id: int
    slug: str
    title: str
    title_original: str | None = Field(description="Original (French) title, when there is one.")
    category: str
    domains: list[str] = Field(
        description=f"Filter taxonomy values: {', '.join(PROJECT_DOMAINS)} (unknown values are allowed)."
    )
    concepts: list[str] = Field(description="Key technical concepts.")
    visual: str | None = Field(
        description="Cover identity key (`multi-agent`, `biometric`, `vision`, `medical`, `document`, "
        "`uav`); `null` or unknown values use a neutral cover."
    )
    context: str | None
    period_label: str | None = Field(description="e.g. `2025–2026`; `null` when the period is not stated.")
    start_year: int | None
    end_year: int | None
    summary: str
    technologies: list[str]
    features: list[str]
    github_url: str | None
    demo_url: str | None
    featured: bool
    display_order: int

    model_config = ConfigDict(json_schema_extra={"examples": [_EXAMPLE_SUMMARY]})

    @field_validator("technologies", mode="before")
    @classmethod
    def _technology_names(cls, value: Any) -> Any:
        """Accept ORM ``ProjectTechnology`` rows as well as plain strings."""
        if isinstance(value, list | tuple):
            return [getattr(item, "name", item) for item in value]
        return value


class ProjectDetail(ProjectSummary):
    problem: str | None
    solution: str | None
    architecture: list[ArchitectureStep]
    implementation: list[str]
    results: list[str]
    lessons_learned: list[str]
    updated_at: UtcDateTime

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    **_EXAMPLE_SUMMARY,
                    "problem": "A UAV that has to visit a set of IoT nodes needs an efficient trajectory. "
                    "Choosing the visiting order is a Travelling Salesman Problem, whose number of possible "
                    "tours grows factorially with the number of nodes.",
                    "solution": "Several metaheuristic optimisation algorithms — Grey Wolf Optimizer (GWO), "
                    "Cuckoo Search (CS) and Tabu Search (TS) — are implemented and compared with random "
                    "trajectory generation, and the resulting UAV trajectories are visualised.",
                    "architecture": [
                        {"step": "IoT nodes", "description": "Set of nodes the UAV must visit."},
                        {
                            "step": "Random trajectories",
                            "description": "Random trajectory generation for comparison.",
                        },
                    ],
                    "implementation": [
                        "Grey Wolf Optimizer (GWO).",
                        "Cuckoo Search (CS).",
                        "Tabu Search (TS).",
                    ],
                    "results": [],
                    "lessons_learned": [],
                    "updated_at": "2026-09-22T12:00:00Z",
                }
            ]
        }
    )

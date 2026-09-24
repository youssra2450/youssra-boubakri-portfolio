"""Seed loader: idempotency, --force, defaults, private keys, profile links and the CLI."""

import copy
import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.paths import REPO_SEED_FILE
from app.database import seed as seed_module
from app.database.base import Base
from app.database.seed import (
    SeedReport,
    load_seed_data,
    resolve_seed_file,
    run_seed,
    strip_private_keys,
)
from app.database.session import build_engine, build_session_factory
from app.models import ContactMessage, Education, Experience, Profile, Project, Skill, SkillCategory
from tests.support import make_settings, seed_json

EXPECTED_COUNTS = {
    "profile": 1,
    "education": len(seed_json()["education"]),
    "experiences": len(seed_json()["experiences"]),
    "skill_categories": len(seed_json()["skill_categories"]),
    "skills": sum(len(category["skills"]) for category in seed_json()["skill_categories"]),
    "projects": 8,
}


def row_counts(db: Session) -> dict[str, int]:
    def count(model: type[Base]) -> int:
        return db.scalar(select(func.count()).select_from(model)) or 0

    return {
        "profile": count(Profile),
        "education": count(Education),
        "experiences": count(Experience),
        "skill_categories": count(SkillCategory),
        "skills": count(Skill),
        "projects": count(Project),
    }


def write_seed(tmp_path: Path, data: dict[str, Any]) -> Path:
    path = tmp_path / "portfolio.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


def minimal_seed() -> dict[str, Any]:
    data = copy.deepcopy(seed_json())
    data["education"] = data["education"][:1]
    data["experiences"] = []
    data["skill_categories"] = [
        {"name": "Programming Languages", "skills": [{"name": "Python"}, {"name": "SQL", "is_core": True}]}
    ]
    data["projects"] = [
        {"title": "Élan Vital — Demo", "category": "Test", "summary": "Minimal project.", "domains": ["NLP"]}
    ]
    return data


def test_seed_loads_every_section(seeded: SeedReport, db: Session) -> None:
    assert seeded.inserted == EXPECTED_COUNTS
    assert row_counts(db) == EXPECTED_COUNTS


def test_seed_is_idempotent(seeded: SeedReport, seed: Callable[..., SeedReport], db: Session) -> None:
    second = seed()

    assert second.inserted == {}
    assert second.profile_links == []
    assert row_counts(db) == EXPECTED_COUNTS


def test_force_reloads_content_and_keeps_contact_messages(
    seeded: SeedReport, seed: Callable[..., SeedReport], db: Session
) -> None:
    project = db.scalar(select(Project).where(Project.slug == "tsp-uav-optimization"))
    assert project is not None
    project.title = "Edited by hand"
    db.add(
        ContactMessage(name="Jane", email="jane@example.com", subject="Hello", message="Kept after reload.")
    )
    db.commit()

    report = seed(force=True)

    assert report.inserted == EXPECTED_COUNTS
    db.expire_all()
    assert row_counts(db) == EXPECTED_COUNTS
    titles = set(db.scalars(select(Project.title)))
    assert "Edited by hand" not in titles
    assert db.scalar(select(func.count()).select_from(ContactMessage)) == 1


def test_force_on_an_empty_database_loads_everything(seed: Callable[..., SeedReport], db: Session) -> None:
    assert seed(force=True).inserted == EXPECTED_COUNTS
    assert row_counts(db) == EXPECTED_COUNTS


def test_seed_stores_v2_project_fields(seeded: SeedReport, db: Session) -> None:
    for source in seed_json()["projects"]:
        project = db.scalar(select(Project).where(Project.slug == source["slug"]))
        assert project is not None
        assert project.concepts == source["concepts"]
        assert project.visual == source["visual"]
        assert project.period_label == source["period_label"]
        assert [technology.name for technology in project.technologies] == source["technologies"]
        assert [technology.display_order for technology in project.technologies] == list(
            range(1, len(source["technologies"]) + 1)
        )


def test_missing_optional_fields_get_defaults(session_factory: Any, db: Session, tmp_path: Path) -> None:
    path = write_seed(tmp_path, minimal_seed())

    with session_factory() as session:
        report = run_seed(session, make_settings(), seed_file=path)

    assert report.inserted["projects"] == 1
    project = db.scalar(select(Project))
    assert project is not None
    assert project.slug == "elan-vital-demo"
    assert project.concepts == []
    assert project.visual is None
    assert project.period_label is None
    assert project.featured is False
    assert project.is_published is True
    category = db.scalar(select(SkillCategory))
    assert category is not None
    assert category.slug == "programming-languages"
    assert [
        (skill.name, skill.proficiency, skill.is_core, skill.display_order) for skill in category.skills
    ] == [
        ("Python", None, False, 1),
        ("SQL", None, True, 2),
    ]


def test_private_keys_are_ignored_at_every_level(tmp_path: Path) -> None:
    data = minimal_seed()
    data["_comment"] = "top level"
    data["profile"]["_note"] = "nested"
    data["projects"][0]["_todo"] = "in a list item"
    data["_taxonomy"] = {"project_domains": ["NLP"]}

    loaded = load_seed_data(write_seed(tmp_path, data))

    assert loaded.projects[0].title == "Élan Vital — Demo"


def test_strip_private_keys() -> None:
    raw = {"_a": 1, "b": [{"_c": 2, "d": 3}], "e": {"_f": 4}, "g": "_kept"}

    assert strip_private_keys(raw) == {"b": [{"d": 3}], "e": {}, "g": "_kept"}


@pytest.mark.parametrize(
    "mutate",
    [
        lambda data: data["projects"][0].update(unknown_field=True),
        lambda data: data["projects"][0].update(visual="Not A Key"),
        lambda data: data["projects"][0].update(github_url="javascript:alert(1)"),
        lambda data: data["projects"][0].update(start_year=2025, end_year=2024),
        lambda data: data["projects"][0].update(concepts=["NLP", "nlp"]),
        lambda data: data["education"][0].update(end_year=1990),
    ],
)
def test_invalid_seed_files_are_rejected(tmp_path: Path, mutate: Callable[[dict[str, Any]], None]) -> None:
    data = minimal_seed()
    mutate(data)

    with pytest.raises(ValidationError):
        load_seed_data(write_seed(tmp_path, data))


def test_duplicate_project_slugs_are_rejected(tmp_path: Path) -> None:
    data = minimal_seed()
    project = data["projects"][0]
    data["projects"] = [dict(project, slug="same-slug"), dict(project, slug="same-slug", title="Other")]

    with pytest.raises(ValidationError, match="Duplicate entry"):
        load_seed_data(write_seed(tmp_path, data))


def test_profile_links_come_from_the_environment(
    seeded: SeedReport, seed: Callable[..., SeedReport], db: Session
) -> None:
    settings = make_settings(
        portfolio_github_url="https://github.com/example-account",
        portfolio_linkedin_url="https://www.linkedin.com/in/example-account/",
    )

    first = seed(settings=settings)
    second = seed(settings=settings)

    assert first.profile_links == ["github_url", "linkedin_url"]
    assert second.profile_links == []
    profile = db.scalar(select(Profile))
    assert profile is not None
    assert profile.github_url == "https://github.com/example-account"
    assert profile.linkedin_url == "https://www.linkedin.com/in/example-account/"


def test_unsafe_profile_link_is_refused(seeded: SeedReport, seed: Callable[..., SeedReport]) -> None:
    with pytest.raises(ValueError, match="http"):
        seed(settings=make_settings(portfolio_github_url="javascript:alert(1)"))


def test_resolve_seed_file(tmp_path: Path) -> None:
    custom = write_seed(tmp_path, minimal_seed())

    assert resolve_seed_file(make_settings()) == REPO_SEED_FILE
    assert resolve_seed_file(make_settings(seed_file=custom)) == custom
    with pytest.raises(FileNotFoundError):
        resolve_seed_file(make_settings(seed_file=tmp_path / "missing.json"))


def test_resolve_seed_file_without_any_candidate(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(seed_module, "REPO_SEED_FILE", tmp_path / "none.json")
    monkeypatch.setattr(seed_module, "DOCKER_SEED_FILE", tmp_path / "none-either.json")

    with pytest.raises(FileNotFoundError, match="Seed file not found"):
        resolve_seed_file(make_settings())


# Command line -------------------------------------------------------------------------------------------


@pytest.fixture
def cli_database(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Any:
    """A throw-away SQLite file database used by ``main()`` (never the development database)."""
    url = f"sqlite:///{(tmp_path / 'cli.sqlite').as_posix()}"
    engine = build_engine(url)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(seed_module, "get_settings", lambda: make_settings(database_url=url))
    yield build_session_factory(engine)
    engine.dispose()


def test_cli_seeds_then_reloads(cli_database: Any) -> None:
    assert seed_module.main([]) == 0
    assert seed_module.main([]) == 0
    assert seed_module.main(["--force"]) == 0

    with cli_database() as session:
        assert row_counts(session) == EXPECTED_COUNTS
        assert session.scalar(select(func.min(Project.id))) == 1


def test_cli_reports_invalid_seed_files(
    cli_database: Any, tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    broken = tmp_path / "broken.json"
    broken.write_text("{not json", encoding="utf-8")

    assert seed_module.main(["--seed-file", str(broken)]) == 1
    assert seed_module.main(["--seed-file", str(tmp_path / "missing.json")]) == 1
    assert "seed.failed" in caplog.text
    with cli_database() as session:
        assert row_counts(session)["projects"] == 0

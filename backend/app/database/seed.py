"""Idempotent content seed: ``python -m app.database.seed [--force] [--seed-file PATH]``.

* Loads ``database/seed/portfolio.json`` into each content table **only when that table is empty**;
  ``--force`` wipes the content tables first and reloads them (``contact_messages`` is never touched).
* Applies ``PORTFOLIO_GITHUB_URL`` / ``PORTFOLIO_LINKEDIN_URL`` to the profile when they are set.

Keys starting with ``_`` in the JSON file (``_source``, ``_taxonomy`` ...) are ignored; everything else is
validated strictly (``app.schemas.seed``) before anything is written.
"""

import argparse
import json
import logging
import sys
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from sqlalchemy import delete, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.paths import BUNDLED_SEED_FILE, DOCKER_SEED_FILE, REPO_SEED_FILE
from app.database.base import Base
from app.database.session import build_engine, build_session_factory, session_scope
from app.models import (
    Education,
    Experience,
    Profile,
    Project,
    ProjectTechnology,
    Skill,
    SkillCategory,
)
from app.repositories.education import EducationRepository
from app.repositories.experience import ExperienceRepository
from app.repositories.profile import ProfileRepository
from app.repositories.project import ProjectRepository
from app.repositories.skill import SkillCategoryRepository
from app.schemas.common import validate_link
from app.schemas.seed import SeedData, SeedProject, SeedSkillCategory
from app.utils.slug import slugify

logger = logging.getLogger("app.seed")

#: Content tables in deletion order (children first). Contact messages are deliberately absent.
CONTENT_MODELS: tuple[type[Base], ...] = (
    ProjectTechnology,
    Project,
    Skill,
    SkillCategory,
    Experience,
    Education,
    Profile,
)


@dataclass
class SeedReport:
    inserted: dict[str, int] = field(default_factory=dict)
    profile_links: list[str] = field(default_factory=list)


def resolve_seed_file(settings: Settings) -> Path:
    """``SEED_FILE`` if set, else the repository copy, else the copy bundled by the Vercel build, else the
    copy baked into the Docker image."""
    if settings.seed_file is not None:
        if not settings.seed_file.is_file():
            raise FileNotFoundError(f"SEED_FILE does not exist: {settings.seed_file}")
        return settings.seed_file
    candidates = (REPO_SEED_FILE, BUNDLED_SEED_FILE, DOCKER_SEED_FILE)
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"Seed file not found (looked in {', '.join(map(str, candidates))})")


def load_seed_data(path: Path) -> SeedData:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return SeedData.model_validate(strip_private_keys(raw))


def wipe_content(db: Session) -> None:
    """Empty the content tables. On PostgreSQL identities restart, so reloaded rows keep stable ids."""
    if db.get_bind().dialect.name == "postgresql":
        tables = ", ".join(model.__table__.name for model in CONTENT_MODELS)
        db.execute(text(f"TRUNCATE TABLE {tables} RESTART IDENTITY"))
    else:
        for model in CONTENT_MODELS:
            db.execute(delete(model))
    db.flush()
    logger.info("seed.content_wiped")


def seed_content(db: Session, data: SeedData, *, force: bool = False) -> dict[str, int]:
    """Insert each content section whose table is empty. Returns the number of rows inserted per table."""
    if force:
        wipe_content(db)

    inserted: dict[str, int] = {}
    if ProfileRepository(db).count() == 0:
        db.add(Profile(**data.profile.model_dump()))
        inserted["profile"] = 1
    if EducationRepository(db).count() == 0:
        db.add_all(Education(**item.model_dump()) for item in data.education)
        inserted["education"] = len(data.education)
    if ExperienceRepository(db).count() == 0:
        db.add_all(Experience(**item.model_dump()) for item in data.experiences)
        inserted["experiences"] = len(data.experiences)
    if SkillCategoryRepository(db).count() == 0:
        db.add_all(_build_category(item) for item in data.skill_categories)
        inserted["skill_categories"] = len(data.skill_categories)
        inserted["skills"] = sum(len(item.skills) for item in data.skill_categories)
    if ProjectRepository(db).count() == 0:
        db.add_all(_build_project(item) for item in data.projects)
        inserted["projects"] = len(data.projects)
    db.flush()
    return inserted


def apply_profile_links(db: Session, settings: Settings) -> list[str]:
    """Copy ``PORTFOLIO_GITHUB_URL`` / ``PORTFOLIO_LINKEDIN_URL`` onto the profile when they are set.

    Returns the names of the columns that changed.
    """
    profile = ProfileRepository(db).get_current()
    if profile is None:
        return []
    applied: list[str] = []
    for column, value in (
        ("github_url", settings.portfolio_github_url),
        ("linkedin_url", settings.portfolio_linkedin_url),
    ):
        url = value.strip()
        if url and getattr(profile, column) != url:
            setattr(profile, column, validate_link(url))
            applied.append(column)
    db.flush()
    return applied


def run_seed(
    db: Session, settings: Settings, *, force: bool = False, seed_file: Path | None = None
) -> SeedReport:
    """Validate the seed file, load the content and commit (nothing is written if validation fails)."""
    data = load_seed_data(seed_file or resolve_seed_file(settings))
    report = SeedReport(inserted=seed_content(db, data, force=force))
    report.profile_links = apply_profile_links(db, settings)
    db.commit()
    return report


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.database.seed", description=__doc__.splitlines()[0])
    parser.add_argument("--force", action="store_true", help="wipe the content tables and reload them")
    parser.add_argument(
        "--seed-file", type=Path, help="seed JSON file (default: SEED_FILE or the repository copy)"
    )
    args = parser.parse_args(argv)

    settings = get_settings()
    configure_logging(settings.log_level, settings.log_json)
    engine = build_engine(settings.database_url)
    try:
        with session_scope(build_session_factory(engine)) as db:
            report = run_seed(db, settings, force=args.force, seed_file=args.seed_file)
    except (OSError, ValueError, SQLAlchemyError) as exc:  # ValueError: JSON syntax / schema errors
        logger.error("seed.failed error=%s", exc)
        return 1
    finally:
        engine.dispose()
    logger.info(
        "seed.completed inserted=%s profile_links=%s",
        report.inserted or "nothing (tables already populated)",
        report.profile_links or "unchanged",
    )
    return 0


def strip_private_keys(value: Any) -> Any:
    """Recursively drop mapping keys starting with ``_`` (comments and metadata in the seed file)."""
    if isinstance(value, dict):
        return {key: strip_private_keys(item) for key, item in value.items() if not str(key).startswith("_")}
    if isinstance(value, list):
        return [strip_private_keys(item) for item in value]
    return value


def _build_category(item: SeedSkillCategory) -> SkillCategory:
    category = SkillCategory(
        **item.model_dump(exclude={"slug", "skills"}), slug=item.slug or slugify(item.name, max_length=80)
    )
    category.skills = [
        Skill(name=skill.name, proficiency=skill.proficiency, is_core=skill.is_core, display_order=position)
        for position, skill in enumerate(item.skills, start=1)
    ]
    return category


def _build_project(item: SeedProject) -> Project:
    project = Project(
        **item.model_dump(exclude={"slug", "technologies"}), slug=item.slug or slugify(item.title)
    )
    project.technologies = [
        ProjectTechnology(name=name, display_order=position)
        for position, name in enumerate(item.technologies, start=1)
    ]
    return project


if __name__ == "__main__":
    sys.exit(main())

"""Repositories, the health probe and the Alembic migration."""

from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.orm import Session, sessionmaker

from app.core.paths import BACKEND_DIR
from app.database.base import Base
from app.database.seed import SeedReport
from app.database.session import build_engine, build_session_factory, session_scope
from app.models import ContactMessage, Project
from app.repositories.contact import ContactRepository
from app.repositories.education import EducationRepository
from app.repositories.experience import ExperienceRepository
from app.repositories.health import DatabaseProbe
from app.repositories.profile import ProfileRepository
from app.repositories.project import ProjectRepository
from app.repositories.skill import SkillCategoryRepository

# Repositories -------------------------------------------------------------------------------------------


def test_project_repository_filters(seeded: SeedReport, db: Session) -> None:
    repository = ProjectRepository(db)

    assert len(repository.list_published()) == 8
    assert [p.slug for p in repository.list_published(domain="optimization")] == ["tsp-uav-optimization"]
    assert repository.list_published(domain="   ") == repository.list_published()
    assert repository.list_published(technology="  ") == repository.list_published()
    assert all(project.featured for project in repository.list_published(featured=True))
    assert repository.count() == 8


def test_project_repository_lookups(seeded: SeedReport, db: Session) -> None:
    repository = ProjectRepository(db)

    project = repository.get_by_slug("biometric-face-authentication")
    assert project is not None
    assert repository.get(project.id) is project
    assert repository.get_by_slug("missing") is None
    assert repository.get(10_000) is None


def test_content_repositories_order_their_rows(seeded: SeedReport, db: Session) -> None:
    education = EducationRepository(db).list_ordered()
    experiences = ExperienceRepository(db).list_ordered()
    categories = SkillCategoryRepository(db).list_with_skills()

    assert [item.display_order for item in education] == sorted(item.display_order for item in education)
    assert [item.display_order for item in experiences] == sorted(item.display_order for item in experiences)
    assert [item.display_order for item in categories] == sorted(item.display_order for item in categories)
    profile = ProfileRepository(db).get_current()
    assert profile is not None
    assert profile.phone is None


def test_contact_repository_marks_messages_forwarded(db: Session) -> None:
    repository = ContactRepository(db)
    message = repository.add(
        ContactMessage(name="Jane", email="jane@example.com", subject="Hello", message="A test message body.")
    )
    db.commit()

    assert message.email_forwarded is False
    assert message.is_spam is False
    assert repository.mark_forwarded(message.id) is True
    assert repository.mark_forwarded(message.id + 1000) is False
    db.commit()
    db.refresh(message)
    assert message.email_forwarded is True


def test_project_technologies_are_deleted_with_their_project(seeded: SeedReport, db: Session) -> None:
    project = ProjectRepository(db).get_by_slug("tsp-uav-optimization")
    assert project is not None
    db.delete(project)
    db.commit()

    assert ProjectRepository(db).get_by_slug("tsp-uav-optimization") is None
    assert db.query(Project).count() == 7


def test_database_probe(db: Session, tmp_path: Path) -> None:
    assert DatabaseProbe(db).ping() is True

    broken = build_engine(f"sqlite:///{(tmp_path / 'missing' / 'db.sqlite').as_posix()}")
    with build_session_factory(broken)() as broken_session:
        assert DatabaseProbe(broken_session).ping() is False


def test_session_scope_rolls_back_on_error(session_factory: sessionmaker[Session], db: Session) -> None:
    def add_then_fail() -> None:
        with session_scope(session_factory) as session:
            session.add(
                ContactMessage(name="Jane", email="j@example.com", subject="Hi!", message="Rolled back.")
            )
            session.flush()
            raise RuntimeError("abort")

    with pytest.raises(RuntimeError, match="abort"):
        add_then_fail()

    assert db.query(ContactMessage).count() == 0


# Migration ----------------------------------------------------------------------------------------------


def _alembic_config(url: str) -> Config:
    config = Config()
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.set_main_option("sqlalchemy.url", url)
    return config


def test_migration_matches_the_models_and_downgrades_cleanly(tmp_path: Path) -> None:
    url = f"sqlite:///{(tmp_path / 'migrations.sqlite').as_posix()}"
    config = _alembic_config(url)
    engine = build_engine(url)

    command.upgrade(config, "head")
    tables = set(inspect(engine).get_table_names())
    assert tables == set(Base.metadata.tables) | {"alembic_version"}
    assert "users" not in tables
    project_columns = {column["name"]: column for column in inspect(engine).get_columns("projects")}
    assert project_columns["period_label"]["nullable"] is True
    assert {"concepts", "visual"} <= set(project_columns)
    contact_columns = {column["name"] for column in inspect(engine).get_columns("contact_messages")}
    assert "email_forwarded" in contact_columns
    assert not {"is_read", "read_at"} & contact_columns

    command.check(config)  # raises if the models and the migration drift apart

    command.downgrade(config, "base")
    assert set(inspect(engine).get_table_names()) == {"alembic_version"}
    engine.dispose()

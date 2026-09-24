"""Test helpers shared by the fixtures and the test modules."""

import json
import os
from functools import cache
from typing import Any

from sqlalchemy import Engine, text

from app.core.config import Settings
from app.core.paths import REPO_SEED_FILE
from app.database.base import Base
from app.services.email import OutgoingEmail

TEST_SECRET_KEY = "test-secret-key-0123456789-abcdefghijklmnopqrstuvwxyz"
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "").strip()
SITE_URL = "https://portfolio.test"

#: Settings that make e-mail forwarding (hence the contact form) available.
EMAIL_ENABLED: dict[str, Any] = {
    "email_provider": "smtp",
    "email_from": "Portfolio <no-reply@portfolio.test>",
    "email_to": "owner@portfolio.test",
    "smtp_host": "smtp.portfolio.test",
}


def make_settings(**overrides: Any) -> Settings:
    """Deterministic settings: nothing is read from ``.env`` and explicit values win over the process
    environment. Keyword overrides toggle behaviour (e.g. ``make_settings(**EMAIL_ENABLED)``)."""
    values: dict[str, Any] = {
        "environment": "test",
        "app_name": "portfolio-api",
        "app_version": "1.0.0",
        "database_url": TEST_DATABASE_URL or "sqlite://",
        "secret_key": TEST_SECRET_KEY,
        "cors_origins": "http://localhost:5173",
        "site_url": SITE_URL,
        "seed_file": None,
        "rate_limit_contact": "5/hour",
        "trust_proxy_headers": False,
        "contact_min_submit_seconds": 3,
        "email_provider": "none",
        "email_from": "",
        "email_to": "",
        "smtp_host": "",
        "smtp_username": "",
        "smtp_password": "",
        "resend_api_key": "",
        "portfolio_github_url": "",
        "portfolio_linkedin_url": "",
        "log_level": "WARNING",
        "log_json": False,
        "docs_enabled": True,
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)  # type: ignore[call-arg]


class FakeEmailSender:
    """In-memory ``EmailSender``: records e-mails, or raises when ``fail`` is set."""

    def __init__(self) -> None:
        self.sent: list[OutgoingEmail] = []
        self.fail = False

    def send(self, email: OutgoingEmail) -> bool:
        if self.fail:
            raise ConnectionError("SMTP server unreachable")
        self.sent.append(email)
        return True


def reset_database(engine: Engine) -> None:
    """Empty every table (identities restart on PostgreSQL so ids are predictable)."""
    with engine.begin() as connection:
        if connection.dialect.name == "postgresql":
            tables = ", ".join(table.name for table in Base.metadata.sorted_tables)
            connection.execute(text(f"TRUNCATE TABLE {tables} RESTART IDENTITY CASCADE"))
        else:
            for table in reversed(Base.metadata.sorted_tables):
                connection.execute(table.delete())


@cache
def seed_json() -> dict[str, Any]:
    """The raw seed file (expected values are derived from it, never hard-coded twice)."""
    data: dict[str, Any] = json.loads(REPO_SEED_FILE.read_text(encoding="utf-8"))
    return data


def seed_projects() -> list[dict[str, Any]]:
    return [project for project in seed_json()["projects"] if project.get("is_published", True)]

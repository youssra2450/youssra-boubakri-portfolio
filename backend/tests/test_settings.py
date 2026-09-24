"""Settings validation and derived values."""

import pytest
from pydantic import ValidationError

from tests.support import EMAIL_ENABLED, make_settings

PRODUCTION_SECRET = "Zr8v3kQm0PwLx2NcT6yHb9UdA4sE7fJg1WqRiOeKlMnB"


def test_defaults_are_consistent() -> None:
    settings = make_settings()

    assert settings.is_production is False
    assert settings.contact_form_enabled is False
    assert settings.missing_email_settings == []
    assert settings.contact_rate_limit.limit == 5
    assert settings.contact_rate_limit.window_seconds == 3600


@pytest.mark.parametrize("secret", ["", "short", "x" * 31])
def test_secret_key_must_be_long_enough(secret: str) -> None:
    with pytest.raises(ValidationError, match="SECRET_KEY must be at least 32 characters"):
        make_settings(secret_key=secret)


def test_placeholder_secret_is_refused_in_production() -> None:
    placeholder = "change-me-to-a-long-random-string-of-48-chars"

    with pytest.raises(ValidationError, match="placeholder"):
        make_settings(environment="production", secret_key=placeholder)
    assert make_settings(environment="development", secret_key=placeholder).secret_key


def test_real_secret_is_accepted_in_production() -> None:
    settings = make_settings(environment="PRODUCTION", secret_key=PRODUCTION_SECRET)

    assert settings.is_production is True
    assert PRODUCTION_SECRET not in repr(settings)


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("postgres://u:p@db:5432/app", "postgresql+psycopg://u:p@db:5432/app"),
        ("postgresql://u:p@db:5432/app", "postgresql+psycopg://u:p@db:5432/app"),
        ("postgresql+psycopg://u:p@db/app", "postgresql+psycopg://u:p@db/app"),
        ("sqlite://", "sqlite://"),
    ],
)
def test_database_url_uses_psycopg3(url: str, expected: str) -> None:
    assert make_settings(database_url=url).database_url == expected


@pytest.mark.parametrize("rule", ["5", "five/hour", "0/minute", "5/week"])
def test_invalid_rate_limits_are_rejected(rule: str) -> None:
    with pytest.raises(ValidationError, match="rate limit"):
        make_settings(rate_limit_contact=rule)


def test_cors_origins_and_site_url_are_normalised() -> None:
    settings = make_settings(
        cors_origins=" https://a.example/ , ,http://localhost:5173", site_url=" https://site.example/ "
    )

    assert settings.cors_origin_list == ["https://a.example", "http://localhost:5173"]
    assert settings.site_url == "https://site.example"


def test_case_insensitive_enumerations() -> None:
    settings = make_settings(email_provider=" SMTP ", log_level="debug")

    assert settings.email_provider == "smtp"
    assert settings.log_level == "DEBUG"


def test_contact_form_requires_a_fully_configured_provider() -> None:
    assert make_settings(**EMAIL_ENABLED).contact_form_enabled is True
    assert make_settings(**{**EMAIL_ENABLED, "email_provider": "none"}).contact_form_enabled is False

    incomplete = make_settings(email_provider="smtp", email_to="owner@portfolio.test")
    assert incomplete.contact_form_enabled is False
    assert incomplete.missing_email_settings == ["EMAIL_FROM", "SMTP_HOST"]

    resend = make_settings(email_provider="resend", email_to="owner@portfolio.test", email_from="a@b.test")
    assert resend.missing_email_settings == ["RESEND_API_KEY"]
    assert make_settings(
        email_provider="resend", email_to="o@p.test", email_from="a@b.test", resend_api_key="re_123"
    ).contact_form_enabled


def test_blank_values_are_treated_as_missing() -> None:
    settings = make_settings(**{**EMAIL_ENABLED, "email_to": "   "})

    assert settings.contact_form_enabled is False
    assert settings.missing_email_settings == ["EMAIL_TO"]


def test_environment_variables_are_read(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import Settings

    monkeypatch.setenv("SECRET_KEY", PRODUCTION_SECRET)
    monkeypatch.setenv("EMAIL_PROVIDER", "")  # empty values fall back to defaults
    monkeypatch.setenv("DOCS_ENABLED", "false")

    settings = Settings(_env_file=None)  # type: ignore[call-arg]

    assert settings.email_provider == "none"
    assert settings.docs_enabled is False


_VERCEL_VARIABLES = (
    "VERCEL",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "ENVIRONMENT",
    "SITE_URL",
    "TRUST_PROXY_HEADERS",
)


def _clean_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (*_VERCEL_VARIABLES, "DATABASE_URL", "POSTGRES_URL"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("SECRET_KEY", PRODUCTION_SECRET)


def test_postgres_url_is_a_fallback_for_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import Settings

    _clean_environment(monkeypatch)
    monkeypatch.setenv("POSTGRES_URL", "postgres://user:pw@db.example.test/neondb?sslmode=require")

    settings = Settings(_env_file=None)  # type: ignore[call-arg]

    assert settings.database_url == "postgresql+psycopg://user:pw@db.example.test/neondb?sslmode=require"

    monkeypatch.setenv("DATABASE_URL", "postgresql://app:pw@primary.example.test/app")
    preferred = Settings(_env_file=None)  # type: ignore[call-arg]

    assert preferred.database_url == "postgresql+psycopg://app:pw@primary.example.test/app"


def test_vercel_defaults_to_production_behind_the_proxy(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import Settings

    _clean_environment(monkeypatch)
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("VERCEL_PROJECT_PRODUCTION_URL", "portfolio.example.test")

    settings = Settings(_env_file=None)  # type: ignore[call-arg]

    assert settings.environment == "production"
    assert settings.trust_proxy_headers is True
    assert settings.site_url == "https://portfolio.example.test"


def test_explicit_values_win_over_vercel_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import Settings

    _clean_environment(monkeypatch)
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("VERCEL_PROJECT_PRODUCTION_URL", "portfolio.example.test")
    monkeypatch.setenv("SITE_URL", "https://www.custom-domain.test/")
    monkeypatch.setenv("ENVIRONMENT", "development")

    settings = Settings(_env_file=None)  # type: ignore[call-arg]

    assert settings.site_url == "https://www.custom-domain.test"
    assert settings.environment == "development"


def test_vercel_defaults_are_ignored_elsewhere(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import Settings

    _clean_environment(monkeypatch)
    monkeypatch.setenv("VERCEL_PROJECT_PRODUCTION_URL", "portfolio.example.test")

    settings = Settings(_env_file=None)  # type: ignore[call-arg]

    assert settings.environment == "development"
    assert settings.trust_proxy_headers is False

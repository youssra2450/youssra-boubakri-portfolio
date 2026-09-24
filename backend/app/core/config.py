"""Application settings, read from environment variables and ``.env`` files (see docs/SPEC.md §2.1)."""

import os
import secrets
import tempfile
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from pydantic import AliasChoices, Field, PrivateAttr, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.rate_limit import RateLimitRule

Environment = Literal["development", "test", "production"]
EmailProvider = Literal["none", "smtp", "resend"]
LogLevel = Literal["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"]

MIN_SECRET_KEY_LENGTH = 32

#: SQLite file used by the embedded database (``/tmp`` is the only writable place on Vercel).
EMBEDDED_DATABASE_URL = f"sqlite:///{(Path(tempfile.gettempdir()) / 'portfolio-embedded.sqlite3').as_posix()}"

_DATABASE_URL_KEYS = frozenset({"database_url", "postgres_url"})
_TRUE_VALUES = frozenset({"1", "true", "yes", "on"})

#: Fragments that identify a documentation placeholder rather than a real secret.
_PLACEHOLDER_SECRET_MARKERS = (
    "change-me",
    "change_me",
    "changeme",
    "replace-me",
    "replace_me",
    "placeholder",
    "example",
    "your-secret",
)


class Settings(BaseSettings):
    """Typed configuration. Field names map to upper-case environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        env_ignore_empty=True,
    )

    environment: Environment = "development"
    app_name: str = "portfolio-api"
    app_version: str = "1.0.0"

    # POSTGRES_URL is accepted as a fallback (name used by some Vercel database integrations).
    database_url: str = Field(
        default="postgresql+psycopg://portfolio:portfolio@localhost:5432/portfolio",
        validation_alias=AliasChoices("database_url", "postgres_url"),
    )
    #: Self-contained SQLite database created and filled from the seed file at startup (read-only
    #: content). Default on Vercel when no PostgreSQL is connected, so the site works without setup.
    embedded_database: bool = False
    # When missing, a random per-process value is generated (it only salts visitor IP hashes).
    secret_key: SecretStr | None = Field(
        default=None, description="Salt of the visitor IP hashes (at least 32 characters)."
    )

    cors_origins: str = "http://localhost:5173,http://localhost:4173,http://localhost:8080"
    site_url: str = "http://localhost:8080"

    seed_file: Path | None = None

    rate_limit_contact: str = "5/hour"
    trust_proxy_headers: bool = False
    contact_min_submit_seconds: float = Field(default=3, ge=0)

    email_provider: EmailProvider = "none"
    email_from: str = ""
    email_to: str = ""
    smtp_host: str = ""
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_username: str = ""
    smtp_password: SecretStr = SecretStr("")
    smtp_use_tls: bool = True
    resend_api_key: SecretStr = SecretStr("")

    portfolio_github_url: str = ""
    portfolio_linkedin_url: str = ""

    log_level: LogLevel = "INFO"
    log_json: bool = False
    docs_enabled: bool = True

    _secret_key_generated: bool = PrivateAttr(default=False)

    @model_validator(mode="before")
    @classmethod
    def _platform_defaults(cls, data: Any) -> Any:
        """On Vercel (``VERCEL=1``), default to production behind Vercel's proxy, with the production domain
        as ``SITE_URL``, and to the embedded database while no PostgreSQL is connected. Values set
        explicitly in the environment always win."""
        if not isinstance(data, dict):
            return data
        database_configured = any(key.lower() in _DATABASE_URL_KEYS for key in data)
        defaults: dict[str, Any] = {}
        if os.environ.get("VERCEL") == "1":
            defaults |= {"environment": "production", "trust_proxy_headers": True}
            domain = os.environ.get("VERCEL_PROJECT_PRODUCTION_URL", "").strip()
            if domain:
                defaults["site_url"] = f"https://{domain}"
            if not database_configured:
                defaults["embedded_database"] = True
        merged = {**defaults, **data}
        if not database_configured and str(merged.get("embedded_database", "")).lower() in _TRUE_VALUES:
            merged["database_url"] = EMBEDDED_DATABASE_URL
        return merged

    @field_validator("environment", "email_provider", mode="before")
    @classmethod
    def _lower_case(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("log_level", mode="before")
    @classmethod
    def _upper_case(cls, value: object) -> object:
        return value.strip().upper() if isinstance(value, str) else value

    @field_validator("database_url")
    @classmethod
    def _normalise_database_url(cls, value: str) -> str:
        """Accept ``postgres://`` / ``postgresql://`` URLs and pin the psycopg 3 driver."""
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix) :]
        return value

    @field_validator("site_url")
    @classmethod
    def _strip_trailing_slash(cls, value: str) -> str:
        return value.strip().rstrip("/")

    @field_validator("rate_limit_contact")
    @classmethod
    def _validate_rate_limit(cls, value: str) -> str:
        RateLimitRule.parse(value)
        return value

    @model_validator(mode="after")
    def _validate_secret_key(self) -> "Settings":
        if self.secret_key is None:
            # Not configured: a strong random salt for this process (hashes are then not stable across
            # restarts, which only affects rate limiting). main.py logs a warning.
            self.secret_key = SecretStr(secrets.token_urlsafe(48))
            self._secret_key_generated = True
            return self
        secret = self.secret_key.get_secret_value()
        if len(secret) < MIN_SECRET_KEY_LENGTH:
            raise ValueError(f"SECRET_KEY must be at least {MIN_SECRET_KEY_LENGTH} characters long")
        if self.is_production and any(marker in secret.lower() for marker in _PLACEHOLDER_SECRET_MARKERS):
            raise ValueError(
                "SECRET_KEY still contains the documentation placeholder; generate a random value "
                '(e.g. `python -c "import secrets; print(secrets.token_urlsafe(48))"`)'
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def ip_hash_salt(self) -> str:
        """``SECRET_KEY`` value (always set once validated)."""
        return self.secret_key.get_secret_value() if self.secret_key is not None else ""

    @property
    def secret_key_generated(self) -> bool:
        """``SECRET_KEY`` was not configured and a random value is used instead."""
        return self._secret_key_generated

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def contact_rate_limit(self) -> RateLimitRule:
        return RateLimitRule.parse(self.rate_limit_contact)

    @property
    def missing_email_settings(self) -> list[str]:
        """Variables still required to forward contact messages with the selected ``EMAIL_PROVIDER``."""
        if self.email_provider == "none":
            return []
        required = {"EMAIL_TO": self.email_to, "EMAIL_FROM": self.email_from}
        if self.email_provider == "smtp":
            required["SMTP_HOST"] = self.smtp_host
        else:
            required["RESEND_API_KEY"] = self.resend_api_key.get_secret_value()
        return [name for name, value in required.items() if not value.strip()]

    @property
    def contact_form_enabled(self) -> bool:
        """Messages can be forwarded by e-mail: a provider is selected and fully configured
        (``EMAIL_TO``, ``EMAIL_FROM`` and the provider's host or API key)."""
        return self.email_provider != "none" and not self.missing_email_settings


@lru_cache
def get_settings() -> Settings:
    """Process-wide settings instance (read once)."""
    return Settings()  # type: ignore[call-arg]  # required values come from the environment

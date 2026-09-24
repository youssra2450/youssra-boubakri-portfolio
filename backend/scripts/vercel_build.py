"""Vercel build hook: migrate the database and reload the portfolio content.

Declared in ``pyproject.toml`` (``[tool.vercel.scripts] build``) and run from ``backend/`` while Vercel
builds the ``backend`` service. The whole repository is checked out at that point, so
``database/seed/portfolio.json`` is available: every deployment re-applies it (contact messages are never
touched), which means editing the JSON file and pushing to GitHub is enough to update the live site.

The seed is also copied to ``backend/bundled/`` for the embedded database. Without PostgreSQL
(``DATABASE_URL`` / ``POSTGRES_URL`` not set) the migrations are skipped and the API serves the content from
that embedded database, so the site works straight away; connecting Neon later only adds persistence.
"""

import os
import shutil
import sys

from alembic import command
from alembic.config import Config

from app.core.paths import BACKEND_DIR, BUNDLED_SEED_FILE, REPO_SEED_FILE

#: Direct (non-pooled) connection strings exposed by the Neon integration — preferred for migrations.
_UNPOOLED_URL_VARIABLES = ("DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING")


def _log(message: str) -> None:
    sys.stdout.write(f"vercel-build: {message}\n")
    sys.stdout.flush()


def bundle_seed_file() -> None:
    """Copy the seed next to the backend: the function bundle only contains ``backend/``, and the embedded
    database (used while no PostgreSQL is connected) reads the content from this copy at startup."""
    if REPO_SEED_FILE.is_file():
        BUNDLED_SEED_FILE.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(REPO_SEED_FILE, BUNDLED_SEED_FILE)
        _log(f"bundled {REPO_SEED_FILE.name} for the embedded database")
    else:
        _log(f"warning: {REPO_SEED_FILE} not found — the embedded database will have no content")


def main() -> int:
    bundle_seed_file()
    if not (os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")):
        _log("no DATABASE_URL — the API will use the embedded database (connect Neon to keep messages).")
        return 0

    for name in _UNPOOLED_URL_VARIABLES:
        if os.environ.get(name):
            os.environ["DATABASE_URL"] = os.environ[name]  # this build process only
            break

    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    _log("applying migrations")
    command.upgrade(config, "head")

    from app.database.seed import main as seed  # imported late: settings are read from the environment

    _log("reloading portfolio content from database/seed/portfolio.json")
    return seed(["--force"])


if __name__ == "__main__":
    raise SystemExit(main())

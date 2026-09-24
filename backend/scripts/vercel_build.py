"""Vercel build hook: migrate the database and reload the portfolio content.

Declared in ``pyproject.toml`` (``[tool.vercel.scripts] build``) and run from ``backend/`` while Vercel
builds the ``backend`` service. The whole repository is checked out at that point, so
``database/seed/portfolio.json`` is available: every deployment re-applies it (contact messages are never
touched), which means editing the JSON file and pushing to GitHub is enough to update the live site.

Without a database (``DATABASE_URL`` / ``POSTGRES_URL`` not set yet) the step is skipped so the deployment
still succeeds; connect a Neon database to the Vercel project and redeploy.
"""

import os
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config

BACKEND_DIR = Path(__file__).resolve().parents[1]

#: Direct (non-pooled) connection strings exposed by the Neon integration — preferred for migrations.
_UNPOOLED_URL_VARIABLES = ("DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING")


def _log(message: str) -> None:
    sys.stdout.write(f"vercel-build: {message}\n")
    sys.stdout.flush()


def main() -> int:
    if not (os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")):
        _log("no DATABASE_URL — skipping migrations and content (connect a Neon database, then redeploy).")
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

"""Filesystem locations resolved from the package location (independent of the working directory)."""

from pathlib import Path

#: ``backend/`` directory (``/app`` inside the Docker image).
BACKEND_DIR = Path(__file__).resolve().parents[2]

#: Repository root when running from a source checkout.
REPO_ROOT = BACKEND_DIR.parent

#: Seed file inside the repository (local development, CI).
REPO_SEED_FILE = REPO_ROOT / "database" / "seed" / "portfolio.json"

#: Seed file copied into the Docker image.
DOCKER_SEED_FILE = Path("/app/seed/portfolio.json")

#: Seed file copied next to the backend by the Vercel build hook (the function bundle only contains
#: ``backend/``); read by the embedded database when no PostgreSQL is configured.
BUNDLED_SEED_FILE = BACKEND_DIR / "bundled" / "portfolio.json"

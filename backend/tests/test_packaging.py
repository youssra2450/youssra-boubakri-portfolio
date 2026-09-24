"""Deployment metadata: pyproject.toml (read by Vercel) and requirements.txt (pip, Docker, launcher) agree."""

import re
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _requirements() -> list[str]:
    lines = (BACKEND_DIR / "requirements.txt").read_text(encoding="utf-8").splitlines()
    return sorted(line.strip() for line in lines if line.strip() and not line.lstrip().startswith("#"))


def _pyproject_dependencies() -> list[str]:
    # Minimal parsing (tomllib is Python 3.11+ and the backend supports 3.10).
    text = (BACKEND_DIR / "pyproject.toml").read_text(encoding="utf-8")
    block = re.search(r"^dependencies = \[(.*?)^\]", text, flags=re.MULTILINE | re.DOTALL)
    assert block, "pyproject.toml has no [project] dependencies list"
    return sorted(re.findall(r'"([^"]+)"', block.group(1)))


def test_pyproject_dependencies_match_requirements() -> None:
    assert _pyproject_dependencies() == _requirements()


def test_vercel_entrypoint_and_build_hook_are_declared() -> None:
    text = (BACKEND_DIR / "pyproject.toml").read_text(encoding="utf-8")

    assert 'entrypoint = "app.main:app"' in text
    assert 'build = "python -m scripts.vercel_build"' in text
    assert (BACKEND_DIR / "scripts" / "vercel_build.py").is_file()

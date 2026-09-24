"""Embedded PostgreSQL for local development — no system install, no Docker, no admin rights.

The PostgreSQL 16 binaries come from the ``pgserver`` wheel (``backend/requirements-local.txt``). This
script only drives them (``initdb`` / ``pg_ctl`` / ``psql``); the application connects to the server
like to any other PostgreSQL through ``DATABASE_URL``.

    python backend/scripts/local_db.py start    # initialise once, start, create role + database, print URL
    python backend/scripts/local_db.py stop     # fast shutdown
    python backend/scripts/local_db.py status   # exit code 0 when running, 3 when stopped
    python backend/scripts/local_db.py url      # print the SQLAlchemy URL

Configuration (command-line option > environment variable > repository ``.env`` > default):

* ``--port`` / ``LOCAL_DB_PORT`` (default ``5433``, so it never clashes with a system PostgreSQL on 5432)
* ``--local-dir`` / ``PORTFOLIO_LOCAL_DIR`` (default ``<repo>/.local``): holds ``pgdata/``,
  ``postgres.log`` and ``pg-superuser.txt`` (generated superuser password)
* ``POSTGRES_USER`` / ``POSTGRES_PASSWORD`` / ``POSTGRES_DB`` (default ``portfolio`` for all three):
  application role and database, created idempotently

Only diagnostics go to stderr; ``start`` and ``url`` print the URL alone on stdout so that scripts can
capture it.
"""

from __future__ import annotations

import argparse
import os
import secrets
import socket
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PORT = 5433
DEFAULT_CREDENTIAL = "portfolio"
SUPERUSER = "postgres"
IS_WINDOWS = os.name == "nt"
EXE_SUFFIX = ".exe" if IS_WINDOWS else ""

EXIT_OK = 0
EXIT_ERROR = 1
EXIT_NOT_RUNNING = 3  # same convention as ``pg_ctl status``

#: ``CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW``. The server gets its own hidden console and process
#: group: it survives the launcher window being closed and no console window pops up. (``DETACHED_PROCESS``
#: is not used on purpose: ``pg_ctl`` would then spawn ``cmd.exe`` in a new, visible console.)
WINDOWS_BACKGROUND_FLAGS = 0x00000200 | 0x08000000
#: ``CREATE_NO_WINDOW`` for short-lived helpers (``initdb``, ``psql``, ``pg_isready``).
WINDOWS_HELPER_FLAGS = 0x08000000

ROLE_AND_DATABASE_SQL = r"""
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'app_user', :'app_password') \gexec
SELECT format('CREATE DATABASE %I OWNER %I ENCODING %L TEMPLATE template0', :'app_db', :'app_user', 'UTF8')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'app_db') \gexec
"""


class LocalDbError(RuntimeError):
    """A problem the user can act on; reported without a traceback."""


@dataclass(frozen=True)
class Config:
    local_dir: Path
    port: int
    user: str
    password: str
    database: str

    @property
    def data_dir(self) -> Path:
        return self.local_dir / "pgdata"

    @property
    def log_file(self) -> Path:
        return self.local_dir / "postgres.log"

    @property
    def superuser_password_file(self) -> Path:
        return self.local_dir / "pg-superuser.txt"

    def url(self, port: int | None = None) -> str:
        return (
            f"postgresql+psycopg://{quote(self.user, safe='')}:{quote(self.password, safe='')}"
            f"@localhost:{port or self.port}/{quote(self.database, safe='')}"
        )


# --------------------------------------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------------------------------------


def read_dotenv(path: Path) -> dict[str, str]:
    """Minimal ``.env`` reader (``KEY=value`` lines, optional quotes, ``#`` comments)."""
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip().removeprefix("export ").strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        values[key] = value
    return values


def build_config(args: argparse.Namespace) -> Config:
    dotenv = read_dotenv(REPO_ROOT / ".env")

    def setting(name: str, default: str) -> str:
        return (os.environ.get(name) or dotenv.get(name) or default).strip()

    local_dir = Path(args.local_dir or setting("PORTFOLIO_LOCAL_DIR", str(REPO_ROOT / ".local")))
    port_text = str(args.port) if args.port else setting("LOCAL_DB_PORT", str(DEFAULT_PORT))
    try:
        port = int(port_text)
    except ValueError as exc:
        raise LocalDbError(f"invalid port: {port_text!r}") from exc
    if not 1 <= port <= 65535:
        raise LocalDbError(f"invalid port: {port}")
    return Config(
        local_dir=local_dir.expanduser().resolve(),
        port=port,
        user=setting("POSTGRES_USER", DEFAULT_CREDENTIAL),
        password=setting("POSTGRES_PASSWORD", DEFAULT_CREDENTIAL),
        database=setting("POSTGRES_DB", DEFAULT_CREDENTIAL),
    )


# --------------------------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------------------------


def log(message: str) -> None:
    sys.stderr.write(f"[local-db] {message}\n")
    sys.stderr.flush()


def emit(value: str) -> None:
    sys.stdout.write(f"{value}\n")
    sys.stdout.flush()


def binaries_dir() -> Path:
    try:
        import pgserver  # optional dependency (requirements-local.txt): imported only when needed
    except ImportError as exc:
        raise LocalDbError(
            "the 'pgserver' package is missing. Install it in the backend virtual environment: "
            "pip install -r backend/requirements-local.txt (Python 3.10, 3.11 or 3.12)"
        ) from exc
    directory = Path(pgserver.__file__).resolve().parent / "pginstall" / "bin"
    if not (directory / f"pg_ctl{EXE_SUFFIX}").is_file():
        raise LocalDbError(f"PostgreSQL binaries not found in {directory}")
    return directory


def tool(name: str) -> str:
    return str(binaries_dir() / f"{name}{EXE_SUFFIX}")


def run_helper(command: list[str], *, input_text: str | None = None, timeout: float = 120) -> str:
    """Run a short-lived PostgreSQL tool and return its combined output (raises on failure)."""
    env = os.environ.copy()
    env.setdefault("PGCLIENTENCODING", "UTF8")
    try:
        completed = subprocess.run(  # noqa: S603  (fixed executable from the pgserver wheel, list args)
            command,
            input=input_text.encode("utf-8") if input_text is not None else None,
            stdin=None if input_text is not None else subprocess.DEVNULL,
            capture_output=True,
            timeout=timeout,
            env=env,
            check=False,
            creationflags=WINDOWS_HELPER_FLAGS if IS_WINDOWS else 0,
        )
    except subprocess.TimeoutExpired as exc:
        raise LocalDbError(f"{Path(command[0]).name} timed out after {timeout:.0f}s") from exc
    output = (completed.stdout + completed.stderr).decode("utf-8", errors="replace").strip()
    if completed.returncode != 0:
        raise LocalDbError(f"{Path(command[0]).name} failed (exit {completed.returncode}): {output}")
    return output


def port_in_use(port: int) -> bool:
    for family, host in ((socket.AF_INET, "127.0.0.1"), (socket.AF_INET6, "::1")):
        try:
            with socket.socket(family, socket.SOCK_STREAM) as probe:
                probe.settimeout(0.5)
                if probe.connect_ex((host, port)) == 0:
                    return True
        except OSError:
            continue
    return False


def read_postmaster_pid(config: Config) -> tuple[int, int] | None:
    """``(pid, port)`` from ``postmaster.pid`` when the file exists and is readable."""
    pid_file = config.data_dir / "postmaster.pid"
    try:
        lines = pid_file.read_text(encoding="utf-8", errors="replace").splitlines()
        return int(lines[0].strip()), int(lines[3].strip())
    except (OSError, IndexError, ValueError):
        return None


def process_is_postgres(pid: int) -> bool:
    try:
        import psutil  # installed with pgserver
    except ImportError:  # pragma: no cover - psutil ships with pgserver
        return True
    try:
        return psutil.Process(pid).name().lower().startswith("postgres")
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        return False


def is_ready(port: int) -> bool:
    try:
        run_helper([tool("pg_isready"), "-h", "localhost", "-p", str(port), "-t", "3", "-q"], timeout=15)
    except LocalDbError:
        return False
    return True


def running_port(config: Config) -> int | None:
    """Port of *this* data directory's server when it is running and accepting connections."""
    pid_and_port = read_postmaster_pid(config)
    if pid_and_port is None:
        return None
    pid, port = pid_and_port
    if process_is_postgres(pid) and is_ready(port):
        return port
    return None


# --------------------------------------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------------------------------------


def is_initialised(config: Config) -> bool:
    return (config.data_dir / "PG_VERSION").is_file()


def ensure_initialised(config: Config) -> None:
    if is_initialised(config):
        return
    if config.data_dir.exists() and any(config.data_dir.iterdir()):
        raise LocalDbError(
            f"{config.data_dir} exists but is not a PostgreSQL data directory; move it away and retry"
        )
    config.local_dir.mkdir(parents=True, exist_ok=True)
    if not config.superuser_password_file.is_file():
        config.superuser_password_file.write_text(secrets.token_urlsafe(24) + "\n", encoding="utf-8")
    log(f"initialising a new PostgreSQL cluster in {config.data_dir} (one-time step)")
    output = run_helper(
        [
            tool("initdb"),
            "-D",
            str(config.data_dir),
            "-U",
            SUPERUSER,
            f"--pwfile={config.superuser_password_file}",
            "--auth=scram-sha-256",
            "--encoding=UTF8",
            "--locale=C",
        ],
        timeout=300,
    )
    (config.local_dir / "initdb.log").write_text(output + "\n", encoding="utf-8")
    with (config.data_dir / "postgresql.conf").open("a", encoding="utf-8") as conf:
        conf.write(
            "\n# --- portfolio local development (backend/scripts/local_db.py) ---\n"
            "listen_addresses = 'localhost'\n"
            "unix_socket_directories = ''\n"
            "max_connections = 50\n"
            "shared_buffers = 64MB\n"
        )


def remove_stale_pid_file(config: Config) -> None:
    pid_and_port = read_postmaster_pid(config)
    if pid_and_port is None:
        return
    pid, _port = pid_and_port
    if process_is_postgres(pid):
        return
    log("removing a stale postmaster.pid left by an unclean shutdown")
    (config.data_dir / "postmaster.pid").unlink(missing_ok=True)


def launch_server(config: Config) -> None:
    command = [
        tool("pg_ctl"),
        "start",
        "-D",
        str(config.data_dir),
        "-l",
        str(config.log_file),
        "-o",
        f"-p {config.port}",
        "-w",
        "-t",
        "60",
    ]
    # stdin/stdout/stderr MUST NOT be pipes: the server inherits them and never closes them, which would
    # make this call hang forever (notably on Windows).
    try:
        completed = subprocess.run(  # noqa: S603  (fixed executable from the pgserver wheel, list args)
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            close_fds=True,
            timeout=120,
            check=False,
            creationflags=WINDOWS_BACKGROUND_FLAGS if IS_WINDOWS else 0,
            start_new_session=not IS_WINDOWS,
        )
    except subprocess.TimeoutExpired as exc:
        raise LocalDbError(f"PostgreSQL did not start in time; see {config.log_file}") from exc
    if completed.returncode != 0:
        raise LocalDbError(
            f"PostgreSQL failed to start (pg_ctl exit {completed.returncode}); see {config.log_file}"
        )


def ensure_role_and_database(config: Config, port: int) -> None:
    try:
        superuser_password = config.superuser_password_file.read_text(encoding="utf-8").strip()
    except OSError as exc:
        raise LocalDbError(f"cannot read {config.superuser_password_file}") from exc
    previous = os.environ.get("PGPASSWORD")
    os.environ["PGPASSWORD"] = superuser_password
    try:
        run_helper(
            [
                tool("psql"),
                "-X",
                "-q",
                "-h",
                "localhost",
                "-p",
                str(port),
                "-U",
                SUPERUSER,
                "-d",
                "postgres",
                "-v",
                "ON_ERROR_STOP=1",
                "-v",
                f"app_user={config.user}",
                "-v",
                f"app_password={config.password}",
                "-v",
                f"app_db={config.database}",
            ],
            input_text=ROLE_AND_DATABASE_SQL,
            timeout=60,
        )
    finally:
        if previous is None:
            os.environ.pop("PGPASSWORD", None)
        else:
            os.environ["PGPASSWORD"] = previous


def command_start(config: Config) -> int:
    port = running_port(config) if is_initialised(config) else None
    if port is not None:
        log(f"already running on port {port} (data: {config.data_dir})")
        if port != config.port:
            log(f"note: requested port {config.port}, but the running server uses {port}; keeping {port}")
    else:
        remove_stale_pid_file(config)
        if port_in_use(config.port):
            raise LocalDbError(
                f"port {config.port} is already used by another program. "
                f"Choose another one (--port / LOCAL_DB_PORT / start.bat -DbPort <port>)"
            )
        ensure_initialised(config)
        log(f"starting PostgreSQL on port {config.port} (log: {config.log_file})")
        launch_server(config)
        port = config.port
        deadline = time.monotonic() + 30
        while not is_ready(port):
            if time.monotonic() > deadline:
                raise LocalDbError(f"PostgreSQL is not accepting connections; see {config.log_file}")
            time.sleep(0.5)
    ensure_role_and_database(config, port)
    log(f"ready: database '{config.database}' owned by '{config.user}' on localhost:{port}")
    emit(config.url(port))
    return EXIT_OK


def command_stop(config: Config) -> int:
    if not is_initialised(config):
        log(f"nothing to stop: no cluster in {config.data_dir}")
        return EXIT_OK
    pid_and_port = read_postmaster_pid(config)
    if pid_and_port is None or not process_is_postgres(pid_and_port[0]):
        remove_stale_pid_file(config)
        log("not running")
        return EXIT_OK
    log(f"stopping PostgreSQL (port {pid_and_port[1]})")
    run_helper(
        [tool("pg_ctl"), "stop", "-D", str(config.data_dir), "-m", "fast", "-w", "-t", "60"], timeout=90
    )
    log("stopped")
    return EXIT_OK


def command_status(config: Config) -> int:
    port = running_port(config) if is_initialised(config) else None
    if port is None:
        emit(f"stopped (data: {config.data_dir})")
        return EXIT_NOT_RUNNING
    emit(f"running on port {port} (data: {config.data_dir})")
    return EXIT_OK


def command_url(config: Config) -> int:
    port = running_port(config) if is_initialised(config) else None
    emit(config.url(port))
    return EXIT_OK


COMMANDS = {"start": command_start, "stop": command_stop, "status": command_status, "url": command_url}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="local_db.py", description="Embedded PostgreSQL 16 for local development (pgserver binaries)."
    )
    parser.add_argument("command", choices=sorted(COMMANDS), help="action to perform")
    parser.add_argument("--port", type=int, help=f"TCP port (default: LOCAL_DB_PORT or {DEFAULT_PORT})")
    parser.add_argument("--local-dir", help="state directory (default: PORTFOLIO_LOCAL_DIR or <repo>/.local)")
    args = parser.parse_args(argv)
    try:
        return COMMANDS[args.command](build_config(args))
    except LocalDbError as exc:
        log(f"error: {exc}")
        return EXIT_ERROR


if __name__ == "__main__":
    sys.exit(main())

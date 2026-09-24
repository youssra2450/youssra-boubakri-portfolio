#!/usr/bin/env bash
# One-command local start for macOS and Linux: embedded PostgreSQL + FastAPI API + React/Vite site.
# Needs only Python 3.10-3.12 and Node.js 20.19+/22.12+ (no Docker, no PostgreSQL installation).
# Idempotent: running it again is fast and reuses what is already installed or running.
#
#   scripts/start.sh [--api-port 8000] [--web-port 5173] [--db-port 5433]
#                    [--data-dir .local] [--venv-dir backend/.venv] [--no-browser]
#   scripts/stop.sh  (same --api-port/--web-port/--db-port/--data-dir/--venv-dir options)
#
# The API and the site run in the background; logs in <data-dir>/logs, PIDs in <data-dir>/*.pid.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
API_PORT=8000
WEB_PORT=5173
DB_PORT=5433
DATA_DIR=".local"
VENV_DIR="backend/.venv"
OPEN_BROWSER=1

usage() { sed -n '2,11p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --api-port) API_PORT="$2"; shift 2 ;;
    --web-port) WEB_PORT="$2"; shift 2 ;;
    --db-port) DB_PORT="$2"; shift 2 ;;
    --data-dir) DATA_DIR="$2"; shift 2 ;;
    --venv-dir) VENV_DIR="$2"; shift 2 ;;
    --no-browser) OPEN_BROWSER=0; shift ;;
    -h | --help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$DATA_DIR" in /*) ;; *) DATA_DIR="$ROOT/$DATA_DIR" ;; esac
case "$VENV_DIR" in /*) ;; *) VENV_DIR="$ROOT/$VENV_DIR" ;; esac
LOG_DIR="$DATA_DIR/logs"
STAMP_DIR="$DATA_DIR/stamps"
mkdir -p "$DATA_DIR" "$LOG_DIR" "$STAMP_DIR"

if [ -t 1 ]; then
  BOLD=$'\033[1m'; CYAN=$'\033[36m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  BOLD=""; CYAN=""; GREEN=""; YELLOW=""; RED=""; DIM=""; RESET=""
fi
step() { printf '\n%s[%s/6] %s%s\n' "$CYAN" "$1" "$2" "$RESET"; }
ok() { printf '      %sOK%s %s\n' "$GREEN" "$RESET" "$1"; }
info() { printf '      %s..%s %s\n' "$DIM" "$RESET" "$1"; }
warn() { printf '      %s!!%s %s\n' "$YELLOW" "$RESET" "$1"; }
die() {
  printf '\n  %sERROR:%s %s\n' "$RED" "$RESET" "$1" >&2
  shift
  for hint in "$@"; do printf '    -> %s\n' "$hint" >&2; done
  printf '\n' >&2
  exit 1
}

if [ "$API_PORT" = "$WEB_PORT" ] || [ "$API_PORT" = "$DB_PORT" ] || [ "$WEB_PORT" = "$DB_PORT" ]; then
  die "The API ($API_PORT), website ($WEB_PORT) and database ($DB_PORT) ports must be different."
fi

venv_python() {
  if [ -x "$VENV_DIR/bin/python" ]; then echo "$VENV_DIR/bin/python"
  elif [ -x "$VENV_DIR/Scripts/python.exe" ]; then echo "$VENV_DIR/Scripts/python.exe"
  fi
}
supported_python() { "$1" -c 'import sys; sys.exit(0 if (3, 10) <= sys.version_info[:2] <= (3, 12) else 1)' >/dev/null 2>&1; }
python_version() { "$1" -c 'import sys; print("%d.%d.%d" % sys.version_info[:3])'; }
hash_files() { "$PY" -c 'import hashlib, sys; h = hashlib.sha256(); [h.update(open(f, "rb").read()) for f in sys.argv[1:]]; print(h.hexdigest())' "$@"; }
read_stamp() { if [ -f "$1" ]; then cat "$1"; fi; }
http_body() { curl -sS --max-time 4 "$1" 2>/dev/null || true; }
port_in_use() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1 && return 0
  (exec 3<>"/dev/tcp/::1/$1") >/dev/null 2>&1 && return 0
  return 1
}
is_portfolio_api() { http_body "http://127.0.0.1:$1/api/health" | grep -q '"service"[[:space:]]*:[[:space:]]*"portfolio-api"'; }
is_portfolio_site() { http_body "http://localhost:$1/" | grep -q 'og:site_name'; }
wait_for() { # wait_for <seconds> <pid or empty> <command...>
  local timeout="$1" pid="$2" waited=0
  shift 2
  while [ "$waited" -lt "$((timeout * 2))" ]; do
    if "$@"; then return 0; fi
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then return 1; fi
    sleep 0.5
    waited=$((waited + 1))
  done
  return 1
}

printf '\n  %sPortfolio — Youssra Boubakri · local start%s\n  %s%s%s\n' "$BOLD" "$RESET" "$DIM" "$ROOT" "$RESET"

# ---------------------------------------------------------------------------------------------------------
step 1 "Checking prerequisites"
command -v curl >/dev/null 2>&1 || die "curl is required." "Install curl with your package manager."
PY="$(venv_python)"
BASE_PY=""
if [ -n "$PY" ] && supported_python "$PY"; then
  ok "Python $(python_version "$PY") (existing environment)"
else
  for candidate in python3.12 python3.11 python3.10 python3 python; do
    if command -v "$candidate" >/dev/null 2>&1 && supported_python "$(command -v "$candidate")"; then
      BASE_PY="$(command -v "$candidate")"
      break
    fi
  done
  [ -n "$BASE_PY" ] || die "Python 3.10, 3.11 or 3.12 was not found (the embedded database needs one of them)." \
    "macOS: brew install python@3.12    Debian/Ubuntu: sudo apt install python3.12 python3.12-venv" \
    "Or download it from https://www.python.org/downloads/"
  ok "Python $(python_version "$BASE_PY") found"
  if [ -e "$VENV_DIR" ]; then
    # Only ever delete a folder that really is a virtual environment.
    [ -f "$VENV_DIR/pyvenv.cfg" ] || die "$VENV_DIR exists but is not a Python virtual environment." \
      "Move it away or choose another folder with --venv-dir."
    warn "The environment $VENV_DIR is unusable or uses another Python: it will be recreated"
    rm -rf "$VENV_DIR"
  fi
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  die "Node.js was not found." "Install the LTS version from https://nodejs.org/ (or: brew install node)."
fi
NODE_VERSION="$(node -p 'process.versions.node')"
NODE_MAJOR="${NODE_VERSION%%.*}"
NODE_MINOR="${NODE_VERSION#*.}"; NODE_MINOR="${NODE_MINOR%%.*}"
if ! { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -ge 19 ]; } && ! { [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -ge 12 ]; } && [ "$NODE_MAJOR" -lt 23 ]; then
  die "Node.js $NODE_VERSION is too old (20.19+ or 22.12+ required)." "Install the LTS version from https://nodejs.org/"
fi
ok "Node.js $NODE_VERSION"

REUSE_API=0
REUSE_SITE=0
if port_in_use "$API_PORT"; then
  is_portfolio_api "$API_PORT" || die "Port $API_PORT (API) is already used by another program." "Close it or use --api-port <port>."
  REUSE_API=1; ok "The API is already running on port $API_PORT: reusing it"
fi
if port_in_use "$WEB_PORT"; then
  is_portfolio_site "$WEB_PORT" || die "Port $WEB_PORT (website) is already used by another program." "Close it or use --web-port <port>."
  REUSE_SITE=1; ok "The website is already running on port $WEB_PORT: reusing it"
fi

# ---------------------------------------------------------------------------------------------------------
step 2 "Preparing the backend"
CREATED_VENV=0
if [ -z "$(venv_python)" ]; then
  info "Creating the Python virtual environment ($VENV_DIR)"
  "$BASE_PY" -m venv "$VENV_DIR" || die "Could not create the virtual environment." \
    "Debian/Ubuntu: sudo apt install python3-venv (matching your Python version)"
  CREATED_VENV=1
fi
PY="$(venv_python)"
PY_STAMP_FILE="$STAMP_DIR/python-packages.sha256"
PY_STAMP="$(hash_files "$BACKEND/requirements.txt" "$BACKEND/requirements-local.txt") $PY"
if [ "$CREATED_VENV" = 1 ] || [ "$(read_stamp "$PY_STAMP_FILE")" != "$PY_STAMP" ] \
  || ! "$PY" -c 'import fastapi, uvicorn, sqlalchemy, alembic, psycopg, pgserver' >/dev/null 2>&1; then
  info "Installing Python packages (first time: 1-5 minutes)"
  "$PY" -m pip install --disable-pip-version-check --no-input --quiet \
    -r "$BACKEND/requirements.txt" -r "$BACKEND/requirements-local.txt" \
    || die "Installing the Python packages failed." "Check the Internet connection and run the script again." \
      "The embedded database (pgserver) has wheels for Windows x64, macOS and Linux x86_64 only."
  printf '%s' "$PY_STAMP" >"$PY_STAMP_FILE"
  ok "Python packages installed"
else
  ok "Python packages up to date"
fi

if [ ! -f "$ROOT/.env" ]; then
  [ -f "$ROOT/.env.example" ] || die ".env.example is missing."
  "$PY" - "$ROOT/.env.example" "$ROOT/.env" <<'PYEOF'
import re, secrets, sys
source, target = sys.argv[1], sys.argv[2]
text = open(source, encoding="utf-8").read()
text = re.sub(r"(?m)^SECRET_KEY=.*$", "SECRET_KEY=" + secrets.token_urlsafe(48), text)
open(target, "w", encoding="utf-8", newline="\n").write(text)
PYEOF
  ok ".env created with a random SECRET_KEY"
else
  ok ".env found"
fi

export PYTHONUTF8=1
export SITE_URL="http://localhost:$WEB_PORT"
export VITE_SITE_URL="http://localhost:$WEB_PORT"
export VITE_DEV_API_TARGET="http://127.0.0.1:$API_PORT"
export PORTFOLIO_LOCAL_DIR="$DATA_DIR"

# ---------------------------------------------------------------------------------------------------------
step 3 "Starting the database"
[ -f "$DATA_DIR/pgdata/PG_VERSION" ] || info "First-time PostgreSQL setup (about 30 seconds)"
DATABASE_URL="$("$PY" "$BACKEND/scripts/local_db.py" start --port "$DB_PORT" --local-dir "$DATA_DIR" | tail -n 1)" \
  || die "PostgreSQL did not start (see the message above)." "Log: $DATA_DIR/postgres.log" "Port busy? Try --db-port $((DB_PORT + 1))"
case "$DATABASE_URL" in postgresql*) ;; *) die "The database URL was not returned." ;; esac
export DATABASE_URL
ok "PostgreSQL ready"

# ---------------------------------------------------------------------------------------------------------
step 4 "Migrating and seeding the database"
(cd "$BACKEND" && "$PY" -m alembic upgrade head) || die "Database migration failed."
ok "Schema up to date"
(cd "$BACKEND" && "$PY" -m app.database.seed) || die "Loading the content failed (see the message above)." \
  "Check database/seed/portfolio.json (commas, quotes)."
ok "Content loaded (database/seed/portfolio.json)"

# ---------------------------------------------------------------------------------------------------------
step 5 "Preparing the website"
NPM_STAMP_FILE="$STAMP_DIR/npm-packages.sha256"
NPM_STAMP="$(hash_files "$FRONTEND/package-lock.json" "$FRONTEND/package.json")"
NEED_NPM=0
if [ ! -f "$FRONTEND/node_modules/vite/bin/vite.js" ]; then
  NEED_NPM=1
elif [ "$(read_stamp "$NPM_STAMP_FILE")" != "$NPM_STAMP" ]; then
  if [ -n "$(read_stamp "$NPM_STAMP_FILE")" ] || [ ! -f "$FRONTEND/node_modules/.package-lock.json" ] \
    || [ "$FRONTEND/package-lock.json" -nt "$FRONTEND/node_modules/.package-lock.json" ]; then
    NEED_NPM=1
  fi
fi
if [ "$NEED_NPM" = 1 ]; then
  info "Installing website packages (first time: 1-3 minutes)"
  (cd "$FRONTEND" && npm install --no-audit --no-fund --loglevel=error) \
    || die "Installing the website packages failed." "Check the Internet connection and run the script again."
  ok "Website packages installed"
else
  ok "Website packages up to date"
fi
printf '%s' "$NPM_STAMP" >"$NPM_STAMP_FILE"

# ---------------------------------------------------------------------------------------------------------
step 6 "Starting the API and the website"
if [ "$REUSE_API" = 0 ]; then
  (cd "$BACKEND" && exec nohup "$PY" -m uvicorn app.main:app --host 127.0.0.1 --port "$API_PORT" \
    >"$LOG_DIR/api.out.log" 2>"$LOG_DIR/api.err.log" </dev/null) &
  echo "$!" >"$DATA_DIR/api.pid"
  info "API starting (port $API_PORT)"
  wait_for 90 "$(cat "$DATA_DIR/api.pid")" is_portfolio_api "$API_PORT" \
    || die "The API did not start." "Log: $LOG_DIR/api.err.log" "$(tail -n 5 "$LOG_DIR/api.err.log" 2>/dev/null || true)"
fi
ok "API ready: http://localhost:$API_PORT/api/docs"

if [ "$REUSE_SITE" = 0 ]; then
  (cd "$FRONTEND" && exec nohup node "$FRONTEND/node_modules/vite/bin/vite.js" --port "$WEB_PORT" --strictPort \
    >"$LOG_DIR/site.out.log" 2>"$LOG_DIR/site.err.log" </dev/null) &
  echo "$!" >"$DATA_DIR/site.pid"
  info "Website starting (port $WEB_PORT)"
  wait_for 120 "$(cat "$DATA_DIR/site.pid")" is_portfolio_site "$WEB_PORT" \
    || die "The website did not start." "Log: $LOG_DIR/site.out.log"
fi
if http_body "http://localhost:$WEB_PORT/api/health" | grep -q '"status"[[:space:]]*:[[:space:]]*"healthy"'; then
  ok "Website ready and connected to the API"
else
  warn "The website answers but cannot reach the API on port $API_PORT"
fi

printf '\n  %sThe portfolio is ready%s\n\n' "$GREEN" "$RESET"
printf '    Site        http://localhost:%s\n' "$WEB_PORT"
printf '    API docs    http://localhost:%s/api/docs\n' "$API_PORT"
printf '    Database    embedded PostgreSQL on port %s (%s)\n\n' "$DB_PORT" "$DATA_DIR"
printf '  %sLogs: %s — stop everything with scripts/stop.sh%s\n\n' "$DIM" "$LOG_DIR" "$RESET"

if [ "$OPEN_BROWSER" = 1 ]; then
  if command -v open >/dev/null 2>&1; then open "http://localhost:$WEB_PORT/" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "http://localhost:$WEB_PORT/" >/dev/null 2>&1 || true
  fi
fi

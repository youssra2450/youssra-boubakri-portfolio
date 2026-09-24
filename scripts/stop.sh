#!/usr/bin/env bash
# Stops what scripts/start.sh started (macOS / Linux): the API, the website and the embedded PostgreSQL.
# Only the processes recorded in <data-dir>/api.pid and <data-dir>/site.pid are stopped; other programs using
# the same ports are never touched.
#
#   scripts/stop.sh [--data-dir .local] [--venv-dir backend/.venv] [--keep-database]
#                   [--api-port 8000] [--web-port 5173] [--db-port 5433]   (only used to report port state)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT=8000
WEB_PORT=5173
DB_PORT=5433
DATA_DIR=".local"
VENV_DIR="backend/.venv"
KEEP_DATABASE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --api-port) API_PORT="$2"; shift 2 ;;
    --web-port) WEB_PORT="$2"; shift 2 ;;
    --db-port) DB_PORT="$2"; shift 2 ;;
    --data-dir) DATA_DIR="$2"; shift 2 ;;
    --venv-dir) VENV_DIR="$2"; shift 2 ;;
    --keep-database) KEEP_DATABASE=1; shift ;;
    -h | --help) sed -n '2,7p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done
case "$DATA_DIR" in /*) ;; *) DATA_DIR="$ROOT/$DATA_DIR" ;; esac
case "$VENV_DIR" in /*) ;; *) VENV_DIR="$ROOT/$VENV_DIR" ;; esac

if [ -t 1 ]; then GREEN=$'\033[32m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; RESET=$'\033[0m'; else GREEN=""; YELLOW=""; DIM=""; RESET=""; fi
ok() { printf '      %sOK%s %s\n' "$GREEN" "$RESET" "$1"; }
info() { printf '      %s..%s %s\n' "$DIM" "$RESET" "$1"; }
warn() { printf '      %s!!%s %s\n' "$YELLOW" "$RESET" "$1"; }
port_in_use() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1 && return 0
  (exec 3<>"/dev/tcp/::1/$1") >/dev/null 2>&1 && return 0
  return 1
}

# stop_recorded <name> <expected command fragment>
stop_recorded() {
  local name="$1" expected="$2" pid_file="$DATA_DIR/$1.pid" pid command
  if [ ! -f "$pid_file" ]; then info "$name: nothing recorded"; return 0; fi
  pid="$(cat "$pid_file")"
  command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  if [ -z "$command" ]; then
    info "$name already stopped"
  elif [[ "$command" != *"$expected"* ]]; then
    warn "$name: PID $pid now belongs to another program; left untouched"
  else
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
    kill -KILL "$pid" 2>/dev/null || true
    ok "$name stopped"
  fi
  rm -f "$pid_file"
}

printf '\n[1/2] Stopping the website and the API\n'
stop_recorded site "vite"
stop_recorded api "uvicorn"

printf '\n[2/2] Stopping the database\n'
if [ "$KEEP_DATABASE" = 1 ]; then
  info "Database left running (--keep-database)"
elif [ ! -f "$DATA_DIR/pgdata/PG_VERSION" ]; then
  info "No local database"
else
  PY=""
  if [ -x "$VENV_DIR/bin/python" ]; then PY="$VENV_DIR/bin/python"; elif [ -x "$VENV_DIR/Scripts/python.exe" ]; then PY="$VENV_DIR/Scripts/python.exe"; fi
  if [ -z "$PY" ]; then
    warn "Python environment not found ($VENV_DIR): database not stopped"
  elif "$PY" "$ROOT/backend/scripts/local_db.py" stop --local-dir "$DATA_DIR"; then
    ok "Database stopped"
  else
    warn "The database could not be stopped (see above)"
  fi
fi

printf '\n'
for port in "$API_PORT" "$WEB_PORT" "$DB_PORT"; do
  if [ "$KEEP_DATABASE" = 1 ] && [ "$port" = "$DB_PORT" ]; then continue; fi
  if port_in_use "$port"; then warn "Port $port is still used by a program not started by start.sh (left untouched)"; fi
done
printf '  %sEverything is stopped.%s\n\n' "$GREEN" "$RESET"

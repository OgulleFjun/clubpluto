#!/bin/bash
# Lokal PostgreSQL-backup för clubpluto (custom-format, 14 dagars retention).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/backend/.env"
BACKUP_DIR="$REPO_ROOT/backups/postgres"
RETENTION_DAYS=14

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Saknar $ENV_FILE" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump saknas. Installera postgresql-client." >&2
  exit 1
fi

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="clubpluto"
DB_USER=""
DB_PASSWORD=""

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%#*}"
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  [[ -z "$line" ]] && continue
  case "$line" in
    DB_HOST=*) DB_HOST="${line#DB_HOST=}" ;;
    DB_PORT=*) DB_PORT="${line#DB_PORT=}" ;;
    DB_NAME=*) DB_NAME="${line#DB_NAME=}" ;;
    DB_USER=*) DB_USER="${line#DB_USER=}" ;;
    DB_PASSWORD=*) DB_PASSWORD="${line#DB_PASSWORD=}" ;;
  esac
done < "$ENV_FILE"

strip_quotes() {
  local v="$1"
  if [[ "${#v}" -ge 2 ]]; then
    local first="${v:0:1}"
    local last="${v: -1}"
    if [[ ( "$first" == '"' && "$last" == '"' ) || ( "$first" == "'" && "$last" == "'" ) ]]; then
      v="${v:1:${#v}-2}"
    fi
  fi
  printf '%s' "$v"
}

DB_HOST="$(strip_quotes "$DB_HOST")"
DB_PORT="$(strip_quotes "$DB_PORT")"
DB_NAME="$(strip_quotes "$DB_NAME")"
DB_USER="$(strip_quotes "$DB_USER")"
DB_PASSWORD="$(strip_quotes "$DB_PASSWORD")"

if [[ -z "$DB_USER" ]]; then
  echo "DB_USER saknas i $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$BACKUP_DIR/${DB_NAME}-${STAMP}.dump"

export PGPASSWORD="$DB_PASSWORD"
pg_dump -Fc -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$OUT_FILE"
unset PGPASSWORD

SIZE="$(du -h "$OUT_FILE" | awk '{print $1}')"
echo "Backup klar: $OUT_FILE ($SIZE)"

find "$BACKUP_DIR" -type f -name '*.dump' -mtime +"$RETENTION_DAYS" -print -delete || true
exit 0

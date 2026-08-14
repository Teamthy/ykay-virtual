#!/usr/bin/env bash
# NUVORA — restore a custom-format backup into a database.
# Usage:  bash scripts/restore.sh [--yes] <dumpfile> [DATABASE_URL]
#   --yes   skip the interactive confirmation (used by scripts/dr-drill.sh
#           and CI; never pass it against production by hand).
# ⚠️ This REPLACES the target database. Run it only during maintenance.
set -euo pipefail

YES=0
if [ "${1:-}" = "--yes" ] || [ "${1:-}" = "-y" ]; then
  YES=1
  shift
fi

cd "$(cd "$(dirname "$0")/.." && pwd)"
DUMP="${1:?usage: restore.sh [--yes] <dumpfile> [DATABASE_URL]}"
if [ -f .env.production ]; then
  set -a; source .env.production; set +a
fi
DBURL="${2:-${DATABASE_URL:?set DATABASE_URL}}"

[ -f "$DUMP" ] || { echo "✗ dump not found: $DUMP"; exit 1; }

echo "⚠️  Restoring $DUMP into $DBURL — this replaces existing data."
if [ "$YES" != "1" ]; then
  read -rp "Type RESTORE to continue: " confirm
  [ "$confirm" = "RESTORE" ] || { echo "Aborted."; exit 1; }
fi

# Drop + recreate for a clean restore (custom format restores into existing DBs).
psql "$DBURL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
# -d takes the full connection string; a positional dbname plus -d is an error.
pg_restore -d "$DBURL" --clean --if-exists "$DUMP" || pg_restore -d "$DBURL" "$DUMP"

echo "✅ Restore complete — run migrations (make migrate) if the backup predates newer ones."

#!/usr/bin/env bash
# NUVORA — restore a custom-format backup into a database.
# Usage:  bash scripts/restore.sh <dumpfile> [DATABASE_URL]
# ⚠️ This REPLACES the target database. Run it only during maintenance.
set -euo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"
DUMP="${1:?usage: restore.sh <dumpfile> [DATABASE_URL]}"
if [ -f .env.production ]; then
  set -a; source .env.production; set +a
fi
DBURL="${2:-${DATABASE_URL:?set DATABASE_URL}}"

[ -f "$DUMP" ] || { echo "✗ dump not found: $DUMP"; exit 1; }

echo "⚠️  Restoring $DUMP into $DBURL — this replaces existing data."
read -rp "Type RESTORE to continue: " confirm
[ "$confirm" = "RESTORE" ] || { echo "Aborted."; exit 1; }

# Drop + recreate for a clean restore (custom format restores into existing DBs).
psql "$DBURL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pg_restore "$DBURL" -d "$DBURL" --clean --if-exists "$DUMP" || pg_restore "$DBURL" -d "$DBURL" "$DUMP"

echo "✅ Restore complete — run migrations (make migrate) if the backup predates newer ones."

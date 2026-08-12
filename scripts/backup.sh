#!/usr/bin/env bash
# NUVORA — database backup (custom-format pg_dump) with retention.
# Usage:  bash scripts/backup.sh [target-dir]   (default ./backups)
# Restore: bash scripts/restore.sh <dumpfile>
set -euo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"
if [ -f .env.production ]; then
  set -a; source .env.production; set +a
fi

DIR="${1:-backups}"
mkdir -p "$DIR"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="$DIR/nuvora-$TS.dump"

: "${DATABASE_URL:?set DATABASE_URL (postgres://user:pass@host:5432/db)}"

echo "== Dumping $DATABASE_URL → $OUT =="
pg_dump "$DATABASE_URL" -Fc -f "$OUT"

echo "== Pruning older than ${BACKUP_RETENTION_DAYS:-14} days =="
find "$DIR" -name "nuvora-*.dump" -mtime +"${BACKUP_RETENTION_DAYS:-14}" -delete

ls -lh "$OUT"
echo "✅ Backup complete: $OUT"

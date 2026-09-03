#!/usr/bin/env bash
# YK-Virtual — database backup (custom-format pg_dump) with retention.
# Usage:  bash scripts/backup.sh [target-dir]   (default ./backups)
# Restore: bash scripts/restore.sh <dumpfile>
#
# Observability (G3.3): when BACKUP_METRICS_DIR is set, this script writes
# Prometheus textfile metrics there (scraped by node-exporter):
#   ykv_backup.prom       ← success heartbeat + size in bytes
#   ykv_backup.prom.fail  ← failure heartbeat (deleted on success)
# YK-VirtualBackupStale in deploy/prometheus/alerts.yml fires on a stale heartbeat.
set -euo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"
if [ -f .env.production ]; then
  set -a; source .env.production; set +a
fi

DIR="${1:-backups}"
mkdir -p "$DIR"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="$DIR/yk-virtual-$TS.dump"

: "${DATABASE_URL:?set DATABASE_URL (postgres://user:pass@host:5432/db)}"

fail_metric() {
  if [ -n "${BACKUP_METRICS_DIR:-}" ]; then
    mkdir -p "$BACKUP_METRICS_DIR"
    printf "ykv_backup_last_failure_timestamp %s\n" "$(date +%s)" > "$BACKUP_METRICS_DIR/ykv_backup.prom.fail"
  fi
}
trap fail_metric ERR

echo "== Dumping $DATABASE_URL → $OUT =="
pg_dump "$DATABASE_URL" -Fc -f "$OUT"

echo "== Pruning older than ${BACKUP_RETENTION_DAYS:-14} days =="
find "$DIR" -name "yk-virtual-*.dump" -mtime +"${BACKUP_RETENTION_DAYS:-14}" -delete

if [ -n "${BACKUP_METRICS_DIR:-}" ]; then
  mkdir -p "$BACKUP_METRICS_DIR"
  printf "ykv_backup_last_success_timestamp %s\nykv_backup_size_bytes %s\n" \
    "$(date +%s)" "$(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT")" > "$BACKUP_METRICS_DIR/ykv_backup.prom"
  rm -f "$BACKUP_METRICS_DIR/ykv_backup.prom.fail"
  echo "== Heartbeat written to $BACKUP_METRICS_DIR =="
fi

ls -lh "$OUT"
echo "✅ Backup complete: $OUT"

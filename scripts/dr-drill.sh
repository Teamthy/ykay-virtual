#!/usr/bin/env bash
# NUVORA — automated backup/restore drill (G3.4, remediation plan).
#
# Proves restores actually work: takes the newest backup, restores it into a
# throwaway database on the same server, verifies that EVERY public table's
# row count matches the source (plus content checksums with --deep), then
# drops the scratch database. Weekly drill required — see docs/DR_RUNBOOK.md.
#
# Usage:  bash scripts/dr-drill.sh [--deep] [--keep] [--dump <file>]
#   --deep      additionally md5-checksum core tables (users/orders/payments/…)
#   --keep      leave the scratch database behind for inspection
#   --dump file drill a specific dump instead of the newest one
#
# Env: DATABASE_URL (source), BACKUP_DIR (default ./backups),
#      BACKUP_MAX_AGE_HOURS (default 26), BACKUP_METRICS_DIR (optional —
#      writes nuvora_dr_drill.prom heartbeat for Prometheus alerting).
set -euo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"
if [ -f .env.production ]; then
  set -a; source .env.production; set +a
fi

DEEP=0
KEEP=0
DUMP=""
while [ $# -gt 0 ]; do
  case "$1" in
    --deep) DEEP=1 ;;
    --keep) KEEP=1 ;;
    --dump) DUMP="${2:?--dump needs a file}"; shift ;;
    *) echo "unknown flag: $1"; exit 2 ;;
  esac
  shift
done

SOURCE="${DATABASE_URL:?set DATABASE_URL}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-26}"

# ── 1. Pick the newest backup and check freshness ──────────────────────────
if [ -z "$DUMP" ]; then
  DUMP=$(ls -t "$BACKUP_DIR"/nuvora-*.dump 2>/dev/null | head -1 || true)
fi
[ -n "$DUMP" ] || { echo "✗ no backup found in $BACKUP_DIR — run scripts/backup.sh first"; exit 1; }
[ -f "$DUMP" ] || { echo "✗ dump not found: $DUMP"; exit 1; }

if find "$DUMP" -mmin "+$((MAX_AGE_HOURS * 60))" | grep -q .; then
  echo "✗ backup older than $MAX_AGE_HOURS h: $DUMP (run scripts/backup.sh)"
  exit 1
fi
echo "== Drill target: $DUMP ($(du -h "$DUMP" | cut -f1), $(find "$DUMP" -mmin -60 | grep -q . && echo fresh)) =="

# ── 2. Create a scratch database on the same server ────────────────────────
DRILL="nuvora_drill_$(date -u +%Y%m%dT%H%M%SZ | tr -d 'T:' | tr '[:upper:]' '[:lower:]')"
DRILL_URL=$(printf '%s' "$SOURCE" | sed -E 's#^(postgres://[^/]+/)[^/?]*#\1'"$DRILL"'#')

echo "== Creating scratch database $DRILL =="
psql "$SOURCE" -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DRILL" >/dev/null
if [ "$KEEP" != "1" ]; then
  trap 'psql "$SOURCE" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $DRILL" >/dev/null' EXIT
fi

# ── 3. Restore the backup into the scratch database ────────────────────────
echo "== Restoring into $DRILL =="
pg_restore -d "$DRILL_URL" --no-owner --no-privileges "$DUMP"

# ── 4. Verify: every public table row count matches the source ─────────────
echo "== Verifying row counts (source vs restored) =="
FAIL=0
TABLES=$(psql "$SOURCE" -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
printf "%-34s %12s %12s  %s\n" "table" "source" "restored" "status"
for t in $TABLES; do
  src=$(psql "$SOURCE" -tAc "SELECT count(*) FROM \"$t\"" 2>/dev/null || echo "ERR")
  dst=$(psql "$DRILL_URL" -tAc "SELECT count(*) FROM \"$t\"" 2>/dev/null || echo "ERR")
  if [ "$src" = "$dst" ] && [ "$src" != "ERR" ]; then
    status="ok"
  else
    status="MISMATCH"
    FAIL=1
  fi
  printf "%-34s %12s %12s  %s\n" "$t" "$src" "$dst" "$status"
done

# ── 5. Deep checksum of core tables (optional) ─────────────────────────────
if [ "$DEEP" = "1" ]; then
  echo "== Deep checksums (md5 of ordered rows) =="
  for t in users tutor_profiles student_profiles orders payments escrow_holds; do
    if psql "$SOURCE" -tAc "SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='$t'" | grep -q 1; then
      src=$(psql "$SOURCE" -tAc "SELECT COALESCE(md5(string_agg(x::text, E'\n' ORDER BY x::text)), '') FROM (SELECT * FROM \"$t\") x")
      dst=$(psql "$DRILL_URL" -tAc "SELECT COALESCE(md5(string_agg(x::text, E'\n' ORDER BY x::text)), '') FROM (SELECT * FROM \"$t\") x")
      if [ "$src" = "$dst" ]; then
        printf "%-22s %s  ok\n" "$t" "${src:0:16}…"
      else
        printf "%-22s %s  %s  MISMATCH\n" "$t" "${src:0:16}…" "${dst:0:16}…"
        FAIL=1
      fi
    fi
  done
fi

# ── 6. Schema version parity ───────────────────────────────────────────────
if psql "$SOURCE" -tAc "SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='schema_migrations'" | grep -q 1; then
  SRC_V=$(psql "$SOURCE" -tAc "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1")
  DST_V=$(psql "$DRILL_URL" -tAc "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1")
  echo "== Migration head: source=$SRC_V restored=$DST_V =="
  [ "$SRC_V" = "$DST_V" ] || FAIL=1
fi

# ── 7. Heartbeat for alerting (NuvoraDrillOverdue) ─────────────────────────
if [ "$FAIL" = "0" ] && [ -n "${BACKUP_METRICS_DIR:-}" ]; then
  mkdir -p "$BACKUP_METRICS_DIR"
  printf "nuvora_dr_drill_last_success_timestamp %s\n" "$(date +%s)" > "$BACKUP_METRICS_DIR/nuvora_dr_drill.prom"
  echo "== Drill heartbeat written to $BACKUP_METRICS_DIR =="
fi

if [ "$FAIL" = "0" ]; then
  echo "✅ DR DRILL PASSED — restore of $DUMP verified table-by-table ($(echo "$TABLES" | wc -w) tables)."
  exit 0
else
  echo "✗ DR DRILL FAILED — restore does not match the source. Investigate before the next backup cycle."
  exit 1
fi

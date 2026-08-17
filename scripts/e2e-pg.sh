#!/usr/bin/env bash
# NUVORA — E2E against REAL PostgreSQL (phase 41).
# Resets the target database (schema recreate), applies migrations, seeds
# the reference rows the suite hardcodes, then runs scripts/e2e.sh against
# an API booted in postgres mode.
#
# Usage:  bash scripts/e2e-pg.sh [PORT]   (default 8099; must differ from a
#                                          running dev API on 8080)
# ⚠️ Destructive: drops ALL data in the target database.
set -euo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"
PORT="${1:-8099}"
GO="${GO:-go}"

: "${DATABASE_URL:?set DATABASE_URL (postgres://user:pass@host:5432/db)}"

echo "== 1/3 Resetting database =="
DBURL="$DATABASE_URL"
psql "$DBURL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null

# Deterministic runs: clear shared Redis caches/limiters left by other
# suites (memory-mode runs would otherwise poison the PG catalogue cache).
if command -v redis-cli >/dev/null 2>&1; then
  redis-cli -u "${REDIS_URL:-redis://localhost:6379/0}" flushdb >/dev/null 2>&1 || true
fi

echo "== 2/3 Migrations + reference seeds =="
"$GO" run ./cmd/migrate --cmd=up
psql "$DBURL" -f scripts/seed-refs.sql
# 000042 disables admin@nuvora.com. Seed a disposable admin on this throwaway DB.
psql "$DBURL" -f scripts/seed-e2e-admin.sql

echo "== 3/3 Booting API on :$PORT (postgres mode) =="
rm -f .e2e-api && "$GO" build -o .e2e-api ./cmd/api
PORT="$PORT" SEED_DEMO_DATA=false DATABASE_URL="$DBURL" AUTH_RATE_LIMIT_PER_MINUTE=1000000 RATE_LIMIT_PER_MINUTE=1000000 ./.e2e-api > /tmp/e2e-api.log 2>&1 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT
for i in $(seq 1 30); do
  curl -sf -m 1 "http://localhost:${PORT}/health" >/dev/null 2>&1 && break
  sleep 0.5
done
curl -sf -m 1 "http://localhost:${PORT}/health" >/dev/null || { echo "API failed to start"; tail -5 /tmp/e2e-api.log; exit 1; }

echo "== 4/4 E2E against postgres =="
# Do not let e2e.sh kill this process and fall back to memory + demo admin.
E2E_KEEP_SERVER=1 \
E2E_ADMIN_EMAIL=e2e-admin@test.invalid \
E2E_ADMIN_PASSWORD=password123 \
bash scripts/e2e.sh "$PORT"

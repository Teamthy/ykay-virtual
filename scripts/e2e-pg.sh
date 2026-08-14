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

echo "== 2/3 Migrations + reference seeds =="
"$GO" run ./cmd/migrate --cmd=up
psql "$DBURL" -f scripts/seed-refs.sql

echo "== 3/3 Booting API on :$PORT (postgres mode) =="
"$GO" build -o .e2e-api ./cmd/api
PORT="$PORT" SEED_DEMO_DATA=false DATABASE_URL="$DBURL" ./.e2e-api > /tmp/e2e-api.log 2>&1 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT
for i in $(seq 1 30); do
  curl -sf -m 1 "http://localhost:${PORT}/health" >/dev/null 2>&1 && break
  sleep 0.5
done
curl -sf -m 1 "http://localhost:${PORT}/health" >/dev/null || { echo "API failed to start"; tail -5 /tmp/e2e-api.log; exit 1; }

echo "== 4/4 E2E against postgres =="
bash scripts/e2e.sh "$PORT"

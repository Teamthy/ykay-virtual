#!/usr/bin/env bash
# NUVORA — one-command production deploy (Phase 40).
# Usage:  bash scripts/deploy.sh [--skip-migrate]
# Prereqs: docker + docker compose on the host; .env.production present.
set -euo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f .env.production ]; then
  echo "✗ .env.production missing — copy .env.production.example and fill it in."
  exit 1
fi
set -a; source .env.production; set +a

echo "== 1/5 Building images =="
docker compose -f docker-compose.prod.yml build api web

if [ "${1:-}" != "--skip-migrate" ]; then
  echo "== 2/5 Running migrations =="
  docker compose -f docker-compose.prod.yml run --rm migrate
fi

echo "== 3/5 Rolling out =="
docker compose -f docker-compose.prod.yml up -d --no-deps api web

echo "== 4/5 Health checks =="
for i in $(seq 1 30); do
  api_ok=$(docker compose -f docker-compose.prod.yml ps api --format json 2>/dev/null | grep -c '"Health":"healthy"' || true)
  web_ok=$(docker compose -f docker-compose.prod.yml ps web --format json 2>/dev/null | grep -c '"Health":"healthy"' || true)
  [ "$api_ok" -ge 1 ] && [ "$web_ok" -ge 1 ] && break
  sleep 5
done
docker compose -f docker-compose.prod.yml ps api web

echo "== 5/5 Smoke test =="
BASE="${SITE_URL:-http://localhost:3000}"
curl -sf "$BASE/api/v1/health" >/dev/null && echo "✔ /api/v1/health" || { echo "✗ health failed"; exit 1; }
curl -sf "$BASE/" >/dev/null && echo "✔ web home" || { echo "✗ web home failed"; exit 1; }
echo "✅ Deploy complete."

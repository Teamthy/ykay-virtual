#!/usr/bin/env bash
# NUVORA — G6 browser E2E orchestration (Playwright + axe).
#
# Boots, in ONE script (CI kills children between steps otherwise):
#   1. a local payment-gateway sandbox (initiate links only; settlement
#      happens via the signed webhook the test posts),
#   2. the API (real Postgres when DATABASE_URL reaches one — migrations +
#      seed-refs applied; otherwise in-memory demo mode),
#   3. the Next.js standalone server (API_PROXY_TARGET rewrite),
#   4. npx playwright test.
#
# Usage:  WEBHOOK_SECRET=... bash scripts/e2e-web.sh
# Exit 0 when every browser scenario passes; 1 otherwise.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Deterministic runs: clear shared Redis caches/limiters left by other
# suites (memory-mode runs would otherwise poison the PG catalogue cache).
if command -v redis-cli >/dev/null 2>&1; then
  redis-cli -u "${REDIS_URL:-redis://localhost:6379/0}" flushdb >/dev/null 2>&1 || true
fi

# ── 0. Web build FIRST — Next 15's build is memory-hungry; running it
# before Postgres/API/gateway reduces peak RAM on constrained machines
# (bus-error/OOM otherwise). CI needs the lockfile-exact install; local
# reruns reuse node_modules (E2E_WEB_NPM_CI=1 forces the strict path).
if [ "${E2E_WEB_NPM_CI:-}" = "1" ] || [ ! -x client/node_modules/.bin/next ]; then
  (cd client && npm ci --no-audit --no-fund >/dev/null)
fi
(cd client && TMPDIR=/var/tmp rm -rf .next && TMPDIR=/var/tmp npm run build >/tmp/e2e-web-build.log 2>&1)

API_PORT=8080
WEB_PORT=3000
GW_PORT=9990
export WEBHOOK_SECRET="${WEBHOOK_SECRET:-e2e-browser-secret}"
export API_BASE_URL="http://localhost:${API_PORT}/api/v1"
export WEB_BASE_URL="http://localhost:${WEB_PORT}"

cleanup() {
  [ -n "${WEB_PID:-}" ] && kill "$WEB_PID" 2>/dev/null || true
  [ -n "${API_PID:-}" ] && kill "$API_PID" 2>/dev/null || true
  [ -n "${GW_PID:-}" ] && kill "$GW_PID" 2>/dev/null || true
}
trap cleanup EXIT

# ── 1. Gateway sandbox (same mock as scripts/staging-evidence.sh) ──────────
python3 - "$GW_PORT" >/tmp/e2e-web-gateway.log 2>&1 <<'PYEOF' &
import sys, json
from http.server import BaseHTTPRequestHandler, HTTPServer
class H(BaseHTTPRequestHandler):
    def _send(self, body):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
    def do_GET(self):
        if self.path == "/health": self._send({"ok": True})
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        req = json.loads(self.rfile.read(n) or b"{}")
        if self.path == "/transaction/initialize":
            self._send({"status": True, "message": "Authorization URL created",
                        "data": {"authorization_url": "https://checkout.mock/1",
                                 "access_code": "mock_acc",
                                 "reference": req.get("reference", "")}})
        elif self.path == "/payments":
            self._send({"status": "success", "message": "Hosted link",
                        "data": {"link": "https://checkout.mock/2"}})
        else:
            self.send_response(404); self.end_headers()
    def log_message(self, *a): pass
HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
PYEOF
GW_PID=$!
for i in $(seq 1 20); do curl -sf -m 1 "http://localhost:$GW_PORT/health" >/dev/null 2>&1 && break; sleep 0.3; done

# ── 2. API (PG when reachable, else memory + demo seed) ────────────────────
# Kill stale API squatters on the port (a previous run's binary would serve
# stale code/state and poison the run — same guard as next-server below).
if curl -sf -m 2 "http://localhost:${API_PORT}/health" >/dev/null 2>&1; then
  echo "e2e-web: stale API on :${API_PORT} — killing for a fresh boot"
  pkill -f "[.]e2e-api" 2>/dev/null || true
  sleep 1
fi
rm -f .e2e-api && "${GO:-go}" build -o .e2e-api ./cmd/api
# Raise the rate limits for browser E2E: the auth-journey spec runs many
# auth steps in a burst and would otherwise trip the 40/min auth limiter.
API_ENV=(PORT="$API_PORT" SEED_DEMO_DATA=true
  PAYSTACK_SECRET="$WEBHOOK_SECRET" FLUTTERWAVE_SECRET="$WEBHOOK_SECRET"
  PAYSTACK_BASE_URL="http://localhost:$GW_PORT" FLUTTERWAVE_BASE_URL="http://localhost:$GW_PORT"
  AUTH_RATE_LIMIT_PER_MINUTE=100000 RATE_LIMIT_PER_MINUTE=100000
  DATABASE_URL="${DATABASE_URL:-postgres://bad:bad@localhost:5999/none?sslmode=disable}")
if [ -n "${DATABASE_URL:-}" ] && psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
  API_ENV=(PORT="$API_PORT" SEED_DEMO_DATA=false
    PAYSTACK_SECRET="$WEBHOOK_SECRET" FLUTTERWAVE_SECRET="$WEBHOOK_SECRET"
    PAYSTACK_BASE_URL="http://localhost:$GW_PORT" FLUTTERWAVE_BASE_URL="http://localhost:$GW_PORT"
    AUTH_RATE_LIMIT_PER_MINUTE=100000 RATE_LIMIT_PER_MINUTE=100000
    DATABASE_URL="$DATABASE_URL")
  psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null
  "${GO:-go}" run ./cmd/migrate --cmd=up
  psql "$DATABASE_URL" -f scripts/seed-refs.sql
  psql "$DATABASE_URL" -f scripts/seed-e2e-admin.sql
  echo "e2e-web: API in PostgreSQL mode"
else
  echo "e2e-web: API in memory demo mode"
fi
env "${API_ENV[@]}" ./.e2e-api >/tmp/e2e-web-api.log 2>&1 &
API_PID=$!
for i in $(seq 1 30); do curl -sf -m 1 "http://localhost:$API_PORT/health" >/dev/null 2>&1 && break; sleep 0.5; done
curl -sf -m 1 "http://localhost:$API_PORT/health" >/dev/null || { echo "API failed"; tail -20 /tmp/e2e-web-api.log; exit 1; }

# ── 3. Web standalone ──────────────────────────────────────────────────────
# Kill stale servers squatting on the ports (Next renames its process title
# to "next-server" — generic pgreps miss them and poison the run with a
# stale build). CI ports are clean; this protects local reruns.
pkill -f "next-server" 2>/dev/null || true
pkill -f "standalone.*server" 2>/dev/null || true
sleep 1
# outputFileTracingRoot spans the monorepo → Next nests the server under
# standalone/client/; be tolerant of both layouts, and copy the static
# assets (they are not traced into standalone).
SERVER_JS=client/.next/standalone/server.js
[ -f "$SERVER_JS" ] || SERVER_JS=client/.next/standalone/client/server.js
STANDALONE_DIR="$(dirname "$SERVER_JS")"
mkdir -p "$STANDALONE_DIR/.next"
cp -r client/.next/static "$STANDALONE_DIR/.next/static"
if [ -d client/public ]; then mkdir -p "$STANDALONE_DIR/public"; cp -r client/public/. "$STANDALONE_DIR/public/"; fi
API_PROXY_TARGET="http://localhost:$API_PORT" PORT="$WEB_PORT" HOSTNAME=0.0.0.0 \
  node "$SERVER_JS" >/tmp/e2e-web-server.log 2>&1 &
WEB_PID=$!
sleep 1
if ! kill -0 "$WEB_PID" 2>/dev/null; then
  echo "web server exited at boot — port $WEB_PORT likely occupied by a stale process"
  tail -20 /tmp/e2e-web-server.log
  exit 1
fi
for i in $(seq 1 30); do curl -sf -m 1 "http://localhost:$WEB_PORT/" >/dev/null 2>&1 && break; sleep 0.5; done
curl -sf -m 1 "http://localhost:$WEB_PORT/" >/dev/null || { echo "web failed"; tail -20 /tmp/e2e-web-server.log; exit 1; }

# ── 4. Playwright ──────────────────────────────────────────────────────────
(cd client && npx playwright test)

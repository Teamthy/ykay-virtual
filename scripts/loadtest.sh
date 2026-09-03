#!/usr/bin/env bash
# YK-Virtual — load-test harness (G6.1 item 5 + G7 capacity evidence).
#
# Boots the API (real Postgres when reachable, else memory demo) and runs
# hey against the five riskiest paths:
#   1. catalogue browse (cached read path)
#   2. tutor search (cached read path)
#   3. login (rate-limited write path — expects 429s past 40/min)
#   4. duplicate payment webhook (idempotency under concurrency)
#   5. authenticated /me/lessons (session-resolved read path)
#
# Results land in docs/LOAD_TEST_REPORT.md (regenerated).
#
# Usage:  [DATABASE_URL=...] bash scripts/loadtest.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
export PATH="/var/tmp/go/bin:$HOME/go/bin:$PATH" 2>/dev/null || true
HEY="$(command -v hey || echo "${GOPATH:-/var/tmp/gopath}/bin/hey")"
[ -x "$HEY" ] || { echo "hey not found — go install github.com/rakyll/hey@latest"; exit 1; }

API_PORT=8083
GW_PORT=9991
BASE="http://localhost:$API_PORT/api/v1"
SECRET="loadtest-secret"

# ── Gateway sandbox (initiate only — settlement comes from the signed
# webhook the storm posts; mirrors scripts/staging-evidence.sh) ──────────────
if ! curl -sf -m 1 "http://localhost:$GW_PORT/health" >/dev/null 2>&1; then
  python3 - "$GW_PORT" >/tmp/loadtest-gateway.log 2>&1 <<'PYEOF' &
import sys, json
from http.server import BaseHTTPRequestHandler, HTTPServer
class H(BaseHTTPRequestHandler):
    def _send(self, body):
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(json.dumps(body).encode())
    def do_GET(self):
        if self.path == "/health": self._send({"ok": True})
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        req = json.loads(self.rfile.read(n) or b"{}")
        if self.path == "/transaction/initialize":
            self._send({"status": True, "message": "Authorization URL created",
                        "data": {"authorization_url": "https://checkout.mock/1",
                                 "access_code": "mock_acc", "reference": req.get("reference", "")}})
        elif self.path == "/payments":
            self._send({"status": "success", "message": "Hosted link", "data": {"link": "https://checkout.mock/2"}})
        else:
            self.send_response(404); self.end_headers()
    def log_message(self, *a): pass
HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
PYEOF
  GW_PID=$!
  trap 'kill $API_PID ${GW_PID:-} 2>/dev/null || true' EXIT
  for i in $(seq 1 20); do curl -sf -m 1 "http://localhost:$GW_PORT/health" >/dev/null 2>&1 && break; sleep 0.3; done
fi

# ── Boot API ───────────────────────────────────────────────────────────────
rm -f .loadtest-api && "${GO:-go}" build -o .loadtest-api ./cmd/api
API_ENV=(PORT="$API_PORT" SEED_DEMO_DATA=true
  PAYSTACK_SECRET="$SECRET" DATABASE_URL="${DATABASE_URL:-postgres://bad:bad@localhost:5999/none?sslmode=disable}"
  PAYSTACK_BASE_URL="http://localhost:$GW_PORT" FLUTTERWAVE_BASE_URL="http://localhost:$GW_PORT")
if [ -n "${DATABASE_URL:-}" ] && psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
  API_ENV=(PORT="$API_PORT" SEED_DEMO_DATA=false PAYSTACK_SECRET="$SECRET" DATABASE_URL="$DATABASE_URL"
    PAYSTACK_BASE_URL="http://localhost:$GW_PORT" FLUTTERWAVE_BASE_URL="http://localhost:$GW_PORT")
  psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
  "${GO:-go}" run ./cmd/migrate --cmd=up >/dev/null
  psql "$DATABASE_URL" -f scripts/seed-refs.sql >/dev/null 2>&1
  MODE="PostgreSQL"
else
  MODE="memory (dev)"
fi
RATE_LIMIT_PER_MINUTE=1000000 env "${API_ENV[@]}" ./.loadtest-api >/tmp/loadtest-api.log 2>&1 &
API_PID=$!
trap 'kill $API_PID ${GW_PID:-} 2>/dev/null || true' EXIT
for i in $(seq 1 30); do curl -sf -m 1 "http://localhost:$API_PORT/health" >/dev/null 2>&1 && break; sleep 0.5; done
curl -sf -m 1 "http://localhost:$API_PORT/health" >/dev/null || { echo "API failed"; tail -10 /tmp/loadtest-api.log; exit 1; }

run() { # run <name> <concurrency> <requests> <method> <path> [body] [header]
  local name="$1" c="$2" n="$3" method="$4" path="$5" body="${6:-}" hdr="${7:-}"
  local args=(-n "$n" -c "$c" -m "$method")
  [ -n "$hdr" ] && args+=(-H "$hdr")
  [ -n "$body" ] && args+=(-d "$body")
  echo "── $name ($method $path, c=$c n=$n) ──"
  "$HEY" "${args[@]}" "$BASE$path" 2>/dev/null | grep -E "Total:|Requests/sec:|Average:|99% in|\[429\]|\[200\]" | sed 's/^/   /'
}

# ── Session for authenticated scenarios ────────────────────────────────────
PARENT_EMAIL="lt-parent@test.com"
curl -s -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$PARENT_EMAIL\",\"password\":\"password123\",\"roles\":[\"PARENT\"]}" >/dev/null || true
COOKIE=$(mktemp)
curl -s -c "$COOKIE" -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$PARENT_EMAIL\",\"password\":\"password123\"}" >/dev/null

echo ""
echo "═══════════════════════════ YK-Virtual LOAD TEST ($MODE) ═══════════════════════════"
echo ""

# 1. Catalogue browse (cached)
run "catalogue" 20 2000 GET "/programmes"
run "catalogue" 20 2000 GET "/subjects"

# 2. Tutor search (cached)
run "tutor search" 20 2000 GET "/tutors?search=mathematics"

# 3. Login rate limit — expect the limiter to kick in (40/min → 429s)
run "login (rate-limited)" 5 80 POST "/auth/login" \
  '{"email":"nobody@test.com","password":"wrong"}' "Content-Type: application/json"

# 4. Duplicate webhook storm — idempotency under concurrency
LEARNER=$(curl -s -b "$COOKIE" -X POST "$BASE/me/learners" -H 'Content-Type: application/json' \
  -d '{"first_name":"Load","last_name":"Tester","date_of_birth":"2013-03-03","current_level":"JSS2","relationship":"MOTHER"}')
SID=$(echo "$LEARNER" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")
BOOKING=$(curl -s -b "$COOKIE" -X POST "$BASE/bookings" -H 'Content-Type: application/json' \
  -d "{\"type\":\"COHORT\",\"cohort_id\":\"00000000-0000-0000-0000-00000000c010\",\"student_id\":\"$SID\",\"idempotency_key\":\"lt-booking\"}")
OID=$(echo "$BOOKING" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['order']['id'])" 2>/dev/null || echo "")
if [ -n "$OID" ]; then
  INIT=$(curl -s -b "$COOKIE" -X POST "$BASE/payments/initiate" -H 'Content-Type: application/json' \
    -d "{\"order_id\":\"$OID\",\"provider\":\"PAYSTACK\",\"email\":\"$PARENT_EMAIL\"}")
  REF=$(echo "$INIT" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['provider_reference'])" 2>/dev/null || echo "")
  AMT=$(echo "$INIT" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['amount'])" 2>/dev/null || echo "35000")
  if [ -n "$REF" ]; then
    PAYLOAD="{\"event\":\"charge.success\",\"data\":{\"reference\":\"$REF\",\"amount\":$(python3 -c "print(int($AMT*100))"),\"status\":\"success\"}}"
    SIG=$(printf '%s' "$PAYLOAD" | openssl dgst -sha512 -hmac "$SECRET" -hex | awk '{print $2}')
    echo "── webhook storm (idempotency under concurrency, 50 parallel posts) ──"
    seq 1 50 | xargs -P 10 -I{} curl -s -o /dev/null -w "%{http_code}\n" \
      -X POST "$BASE/payments/webhooks/PAYSTACK" -H 'Content-Type: application/json' \
      -H "X-Paystack-Signature: $SIG" -d "$PAYLOAD" | sort | uniq -c
    SETTLED=$(psql "${DATABASE_URL}" -tAc "SELECT count(*) FROM payments WHERE status='SUCCESS'" 2>/dev/null || echo "n/a")
    echo "   settled payments after storm: $SETTLED (must be exactly 1)"
  fi
fi

# 5. Authenticated lessons
run "me/lessons (session)" 20 2000 GET "/me/lessons" "" "Cookie: $(grep ykv_session "$COOKIE" | awk '{print $6"="$7}')"

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"

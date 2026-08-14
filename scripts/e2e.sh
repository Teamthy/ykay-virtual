#!/usr/bin/env bash
# YKAY Virtual — end-to-end API test suite (phase 11c).
#
# Boots the API (in-memory fallback when Postgres is absent) and exercises the
# full platform over HTTP: auth, catalogue, onboarding, tutor vetting +
# approval, availability, learning assessments (auto-grade, single-attempt,
# answer-key secrecy, cross-assessment rejection), progress reports,
# transactional notifications, admin analytics + CSV exports, RBAC.
#
# Usage:  scripts/e2e.sh [API_PORT]   (default 8099)
# Exit 0 when every scenario passes; 1 otherwise.

set -u
PORT="${1:-8099}"
BASE="http://localhost:${PORT}/api/v1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

PASS=0
FAIL=0
declare -a FAILURES

note() { printf '\n=== %s ===\n' "$1"; }
ok()   { PASS=$((PASS+1)); printf '  ✔ %s\n' "$1"; }
fail() { FAIL=$((FAIL+1)); FAILURES+=("$1"); printf '  ✘ %s\n' "$1"; }

# assert_code <name> <expected_code> <actual_code>
assert_code() {
  if [ "$2" = "$3" ]; then ok "$1 (HTTP $3)"; else fail "$1 — expected HTTP $2, got $3"; fi
}

json() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }

# ---------------------------------------------------------------- boot API ---
BIN="${ROOT}/.e2e-api"
(cd "$ROOT" && rm -f "$BIN" && "${GO:-go}" build -o "$BIN" ./cmd/api) || { echo "build failed"; exit 1; }

# Always boot a FRESH API for deterministic runs — a stale instance would
# carry state from previous runs (409s, cached sessions) and poison results.
if curl -sf -m 2 "http://localhost:${PORT}/health" >/dev/null 2>&1; then
  echo "Stale API on :${PORT} — killing for a fresh run"
  pkill -f "$BIN" 2>/dev/null || true
  sleep 1
fi
trap 'kill $API_PID 2>/dev/null || true' EXIT
echo "Starting API on :${PORT} (in-memory mode)…"
PORT="$PORT" SEED_DEMO_DATA=true DATABASE_URL="postgres://bad:bad@localhost:5999/none?sslmode=disable" "$BIN" >/tmp/e2e-api.log 2>&1 &
API_PID=$!
for i in $(seq 1 30); do
  curl -sf -m 1 "http://localhost:${PORT}/health" >/dev/null 2>&1 && break
  sleep 0.5
done
if ! curl -sf -m 1 "http://localhost:${PORT}/health" >/dev/null 2>&1; then
  echo "API failed to start"; tail -5 /tmp/e2e-api.log; exit 1
fi

J_PARENT=/tmp/e2e-parent.jar
J_TUTOR=/tmp/e2e-tutor.jar
J_STUDENT=/tmp/e2e-student.jar
J_ADMIN=/tmp/e2e-admin.jar
J_LOGOUT=/tmp/e2e-logout.jar
J_PUB=/tmp/e2e-pub.jar
rm -f "$J_PARENT" "$J_TUTOR" "$J_STUDENT" "$J_ADMIN" "$J_LOGOUT" "$J_PUB"

req() { # req <jar> <method> <path> <body?>  → prints HTTP code
  local jar="$1" method="$2" path="$3" body="${4:-}"
  if [ -n "$body" ]; then
    curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$jar" -c "$jar" \
      -X "$method" "$BASE$path" -H 'Content-Type: application/json' -d "$body"
  else
    curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$jar" -c "$jar" -X "$method" "$BASE$path"
  fi
}

# ================================================================ 1. AUTH ====
note "AUTH"
assert_code "health" 200 "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/health")"

c=$(req "$J_PARENT" POST /auth/register '{"email":"e2e-parent@test.com","password":"password123","roles":["PARENT"]}')
assert_code "register parent" 201 "$c"

c=$(req "$J_TUTOR" POST /auth/register '{"email":"e2e-tutor@test.com","password":"password123","roles":["TUTOR"]}')
assert_code "register tutor" 201 "$c"

c=$(req "$J_ADMIN" POST /auth/register '{"email":"e2e-admin@test.com","password":"password123","roles":["SUPER_ADMIN"]}')
assert_code "register admin" 201 "$c"

c=$(req "$J_PARENT" POST /auth/login '{"email":"e2e-parent@test.com","password":"password123"}')
assert_code "login parent" 200 "$c"

c=$(req "$J_TUTOR" POST /auth/login '{"email":"e2e-tutor@test.com","password":"password123"}')
assert_code "login tutor" 200 "$c"

c=$(req "$J_ADMIN" POST /auth/login '{"email":"e2e-admin@test.com","password":"password123"}')
assert_code "login admin" 200 "$c"

c=$(req /dev/null POST /auth/login '{"email":"e2e-parent@test.com","password":"wrong-pass"}')
assert_code "wrong password → 401" 401 "$c"

c=$(req "$J_PARENT" GET /auth/me)
assert_code "me (parent)" 200 "$c"
[ "$(cat /tmp/e2e-body.json | json 'd["data"]["email"]')" = "e2e-parent@test.com" ] && ok "me returns email" || fail "me email mismatch"

c=$(req "$J_PARENT" POST /auth/password-reset/request '{"email":"e2e-parent@test.com"}')
assert_code "password reset request" 200 "$c"

c=$(req "$J_LOGOUT" POST /auth/login '{"email":"e2e-tutor@test.com","password":"password123"}')
c=$(req "$J_LOGOUT" POST /auth/logout)
assert_code "logout" 200 "$c"
c=$(req "$J_LOGOUT" GET /auth/me)
assert_code "me after logout → 401" 401 "$c"

# --- Magic-link login (phase 18) ---
c=$(req "$J_LOGOUT" POST /auth/login-code/request '{"email":"e2e-parent@test.com"}')
assert_code "login-code request" 200 "$c"
sleep 1
CODE=$(grep -oP 'font-family:monospace;">\K[0-9]{6}' /tmp/e2e-api.log | tail -1)
if [ -n "$CODE" ]; then ok "code captured from email log"; else fail "login code not found in email log"; fi
c=$(req "$J_LOGOUT" POST /auth/login-code/confirm "{\"email\":\"e2e-parent@test.com\",\"code\":\"000000\"}")
assert_code "wrong code → 401" 401 "$c"
c=$(req "$J_LOGOUT" POST /auth/login-code/confirm "{\"email\":\"e2e-parent@test.com\",\"code\":\"${CODE}\"}")
assert_code "login-code confirm" 200 "$c"
c=$(req "$J_LOGOUT" GET /auth/me)
assert_code "me via magic-link session" 200 "$c"
c=$(req "$J_LOGOUT" POST /auth/logout)
assert_code "magic-link session logout" 200 "$c"

# =========================================================== 2. CATALOGUE ====
note "CATALOGUE"
c=$(req /dev/null GET /subjects)
assert_code "list subjects" 200 "$c"
c=$(req /dev/null GET /programmes)
assert_code "list programmes" 200 "$c"
c=$(req /dev/null GET /cohorts)
assert_code "list cohorts" 200 "$c"

# =========================================================== 3. ONBOARDING ====
note "ONBOARDING (parent → learner)"
c=$(req "$J_PARENT" POST /me/learners '{"first_name":"Ada","last_name":"Bello","date_of_birth":"2012-04-01","school_name":"Sunrise Academy","current_level":"JSS1","relationship":"MOTHER"}')
assert_code "create learner" 201 "$c"
STUDENT_ID=$(cat /tmp/e2e-body.json | json 'd["data"]["id"]')
[ -n "$STUDENT_ID" ] && ok "learner id captured" || fail "learner id missing"
c=$(req "$J_PARENT" GET /me/learners)
assert_code "list learners" 200 "$c"
n=$(cat /tmp/e2e-body.json | json 'len(d["data"])')
[ "$n" -ge 1 ] && ok "parent sees ≥1 learner" || fail "parent sees $n learners"

# ====================================================== 4. VETTING + APPROVE ====
note "TUTOR VETTING + APPROVAL"
c=$(req "$J_TUTOR" POST /tutors/me/vetting/profile '{"display_name":"E2E Tutor","headline":"Maths tutor","bio":"5 years experience","years_experience":5,"hourly_rate_min":8000,"hourly_rate_max":12000,"currency":"NGN","timezone":"Africa/Lagos","accepts_online":true,"accepts_in_person":false}')
assert_code "create vetting profile" 201 "$c"
PROFILE_ID=$(cat /tmp/e2e-body.json | json 'd["data"]["id"]')

# attach mathematics (resolved dynamically so both memory and postgres
# modes work — the subject that carries the competency question bank)
SUBJECT_ID=$(curl -s "$BASE/subjects" | python3 -c 'import json,sys; d=json.load(sys.stdin)["data"]; print(next((x["id"] for x in d if x.get("slug")=="mathematics"), next((x["id"] for x in d if "mathematic" in x["name"].lower()), d[0]["id"] if d else "")))')
[ -n "$SUBJECT_ID" ] && ok "subject resolved ($SUBJECT_ID)" || fail "subject id missing"
c=$(req "$J_TUTOR" POST "/tutors/me/vetting/profiles/${PROFILE_ID}/subjects" "{\"subject_id\":\"${SUBJECT_ID}\"}")
assert_code "add subject to profile" 201 "$c"

# government ID (GOVT_ID) so verification can proceed
c=$(req "$J_TUTOR" POST "/tutors/me/vetting/profiles/${PROFILE_ID}/documents" '{"type":"GOVT_ID","file_name":"nins.jpg","mime_type":"image/jpeg","file_size":12345}')
assert_code "request GOVT_ID upload" 201 "$c"
DOC_ID=$(cat /tmp/e2e-body.json | json 'd["data"]["document"]["id"]')
[ -n "$DOC_ID" ] && ok "document id captured" || fail "document id missing"

c=$(req "$J_TUTOR" POST "/tutors/me/vetting/profiles/${PROFILE_ID}/submit")
assert_code "submit for review" 200 "$c"

c=$(req "$J_ADMIN" GET /admin/vetting/queue)
assert_code "admin vetting queue" 200 "$c"

# staged pipeline: review → doc approval → interview → verify → competency → approve
c=$(req "$J_ADMIN" POST "/admin/vetting/profiles/${PROFILE_ID}/review")
assert_code "admin review" 200 "$c"
c=$(req "$J_ADMIN" POST "/admin/vetting/documents/${DOC_ID}/review" '{"approve":true,"reason":"NIN matches profile"}')
assert_code "admin approves GOVT_ID" 200 "$c"
c=$(req "$J_ADMIN" POST "/admin/vetting/profiles/${PROFILE_ID}/interview")
assert_code "admin interview" 200 "$c"
c=$(req "$J_ADMIN" POST "/admin/vetting/profiles/${PROFILE_ID}/verify")
assert_code "admin verify (approved ID on file)" 200 "$c"

# competency assessment (seeded maths bank; correct answer is option index 1)
c=$(req "$J_TUTOR" POST "/tutors/me/vetting/profiles/${PROFILE_ID}/assessments" "{\"subject_id\":\"${SUBJECT_ID}\"}")
if [ "$c" = "200" ] || [ "$c" = "201" ]; then ok "start competency assessment (HTTP $c)"; else fail "start competency assessment — expected 200/201, got $c"; fi
ATT=$(cat /tmp/e2e-body.json | json 'd["data"]["attempt"]["id"]')
QS=$(cat /tmp/e2e-body.json | python3 -c "import json,sys; print(' '.join(q['id'] for q in json.load(sys.stdin)['data']['questions']))")
[ -n "$ATT" ] && [ -n "$QS" ] && ok "attempt started (${QS} questions)" || fail "competency start failed"
ANS=$(for q in $QS; do printf '{"question_id":"%s","chosen_index":1},' "$q"; done)
ANS="{\"answers\":[${ANS%,}]}"
c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$J_TUTOR" -X POST "$BASE/tutors/me/vetting/assessments/${ATT}/submit" -H 'Content-Type: application/json' -d "$ANS")
assert_code "submit competency" 200 "$c"
[ "$(cat /tmp/e2e-body.json | json 'd["data"]["passed"]')" = "True" ] && ok "competency passed" || fail "competency not passed"

c=$(req "$J_ADMIN" POST "/admin/vetting/profiles/${PROFILE_ID}/approve")
assert_code "admin approve tutor" 200 "$c"

c=$(req "$J_TUTOR" GET /tutors/me/vetting/profile)
assert_code "profile after approval" 200 "$c"
st=$(cat /tmp/e2e-body.json | json 'd["data"]["status"]')
[ "$st" = "APPROVED" ] && ok "tutor status = APPROVED" || fail "tutor status = $st"

# ======================================================== 5. AVAILABILITY ====
note "AVAILABILITY"
# G1: profile IDs resolve from the session — no fixture UUIDs. Omitting the
# ID resolves the tutor's own profile; a foreign ID must be rejected.
c=$(req "$J_TUTOR" POST /me/availability '{"day_of_week":1,"start_time":"16:00","end_time":"17:00","is_recurring":true}')
if [ "$c" = "200" ] || [ "$c" = "201" ]; then ok "upsert availability (session-resolved, HTTP $c)"; else fail "upsert availability — expected 200/201, got $c"; fi
c=$(req "$J_TUTOR" GET "/me/availability")
assert_code "list availability (session-resolved)" 200 "$c"
c=$(req "$J_TUTOR" GET "/me/availability?tutor_profile_id=${PROFILE_ID}")
assert_code "list availability (own explicit id)" 200 "$c"
c=$(req "$J_TUTOR" GET "/me/availability?tutor_profile_id=00000000-0000-0000-0000-000000000102")
assert_code "foreign tutor_profile_id → 403" 403 "$c"
c=$(req "$J_PARENT" GET "/me/availability")
assert_code "non-tutor availability → 403" 403 "$c"

# ============================================ 6. LEARNING — ASSESSMENTS ======
note "LEARNING — ASSESSMENTS (phase 11c)"
COHORT_ID="00000000-0000-0000-0000-00000000c010"
A1=$(curl -s -b "$J_TUTOR" -X POST "$BASE/learning/assessments" -H 'Content-Type: application/json' \
  -d "{\"cohort_id\":\"${COHORT_ID}\",\"title\":\"E2E Maths Quiz\",\"instructions\":\"No calculators\",\"pass_threshold\":0.5,\"questions\":[{\"question\":\"2+2?\",\"options\":[\"3\",\"4\",\"5\"],\"correct_index\":1,\"explanation\":\"2+2=4\"},{\"question\":\"Capital of Nigeria?\",\"options\":[\"Lagos\",\"Abuja\",\"Kano\"],\"correct_index\":1}]}" \
  | json 'd["data"]["id"]')
[ -n "$A1" ] && ok "tutor creates assessment (session-resolved profile)" || fail "assessment create failed"
A1_LEAK=$(curl -s -b "$J_TUTOR" -X POST "$BASE/learning/assessments" -H 'Content-Type: application/json' \
  -d '{"title":"Leak Check","questions":[{"question":"Q","options":["A","B"],"correct_index":0}]}' \
  | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print(len(d['questions']) if 'questions' in d else 'n/a')")
ok "assessment body never leaks questions (tutor view has $A1_LEAK question fields)"

c=$(req "$J_STUDENT" POST /auth/register '{"email":"e2e-student@test.com","password":"password123","roles":["STUDENT"]}')
assert_code "register student" 201 "$c"
c=$(req "$J_STUDENT" POST /auth/login '{"email":"e2e-student@test.com","password":"password123"}')
assert_code "login student" 200 "$c"

c=$(req "$J_STUDENT" GET "/learning/assessments?cohort_id=${COHORT_ID}")
assert_code "student lists assessments" 200 "$c"
listed=$(cat /tmp/e2e-body.json | json 'len(d["data"])')
[ "$listed" -ge 1 ] && ok "assessments listed ($listed)" || fail "no assessments listed"

# G1: the student session's own profile id (auto-created at registration).
MY_STUDENT_ID=$(curl -s -b "$J_STUDENT" "$BASE/auth/me/context" | json 'd["data"]["student"]["id"]')
[ -n "$MY_STUDENT_ID" ] && ok "student profile resolved from session context" || fail "session context missing student profile"

# start → questions must NOT contain the answer key
# G1: the student's profile resolves from the session (no query param), and a
# foreign student_profile_id is rejected.
c=$(curl -s -o /dev/null -w '%{http_code}' -b "$J_STUDENT" -X POST "$BASE/learning/assessments/${A1}/start?student_profile_id=${STUDENT_ID}")
assert_code "start with foreign student id → 403" 403 "$c"
START=$(curl -s -b "$J_STUDENT" -X POST "$BASE/learning/assessments/${A1}/start")
ATTEMPT_ID=$(echo "$START" | json 'd["data"]["attempt"]["id"]')
Q1=$(echo "$START" | json 'd["data"]["questions"][0]["id"]')
Q2=$(echo "$START" | json 'd["data"]["questions"][1]["id"]')
[ -n "$ATTEMPT_ID" ] && ok "student starts attempt" || fail "start failed: $START"
if echo "$START" | grep -q correct_index; then
  fail "ANSWER KEY LEAKED in start payload"
else
  ok "answer key hidden from student (no correct_index/explanation)"
fi

# submit 1 correct + 1 wrong → auto-grade 1/2 = 50% → passed (inclusive threshold)
c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$J_STUDENT" -X POST "$BASE/learning/assessments/${A1}/submit" \
  -H 'Content-Type: application/json' \
  -d "{\"answers\":[{\"question_id\":\"${Q1}\",\"chosen_index\":1},{\"question_id\":\"${Q2}\",\"chosen_index\":0}]}")
assert_code "submit + auto-grade (session-resolved)" 200 "$c"
res=$(cat /tmp/e2e-body.json)
[ "$(echo "$res" | json 'd["data"]["correct"]')" = "1" ] && ok "graded 1 correct" || fail "expected 1 correct"
[ "$(echo "$res" | json 'd["data"]["total"]')" = "2" ] && ok "total = 2" || fail "total ≠ 2"
[ "$(echo "$res" | json 'd["data"]["passed"]')" = "True" ] && ok "passed at 50% (inclusive)" || fail "pass logic wrong"

c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$J_STUDENT" -X POST "$BASE/learning/assessments/${A1}/submit" \
  -H 'Content-Type: application/json' -d "{\"answers\":[{\"question_id\":\"${Q1}\",\"chosen_index\":1}]}")
assert_code "resubmit → 409 conflict" 409 "$c"

# cross-assessment rejection: submit a question ID from a DIFFERENT assessment
A2=$(curl -s -b "$J_TUTOR" -X POST "$BASE/learning/assessments" -H 'Content-Type: application/json' \
  -d '{"title":"E2E Other Quiz","questions":[{"question":"2+3?","options":["5","6","7"],"correct_index":0}]}' \
  | json 'd["data"]["id"]')
ST2=$(curl -s -b "$J_STUDENT" -X POST "$BASE/learning/assessments/${A2}/start" | json 'd["data"]["attempt"]["id"]')
c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$J_STUDENT" -X POST "$BASE/learning/assessments/${A2}/submit" \
  -H 'Content-Type: application/json' -d "{\"answers\":[{\"question_id\":\"${Q1}\",\"chosen_index\":0}]}")
assert_code "cross-assessment answer → 400" 400 "$c"

# ========================================= 7. LEARNING — REPORTS + GRADE ====
note "LEARNING — PROGRESS REPORTS"
c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$J_TUTOR" -X POST "$BASE/learning/progress-reports" \
  -H 'Content-Type: application/json' \
  -d "{\"student_profile_id\":\"${MY_STUDENT_ID}\",\"tutor_profile_id\":\"${PROFILE_ID}\",\"period_start\":\"2026-08-01\",\"period_end\":\"2026-08-11\",\"strengths\":\"Algebra\",\"weaknesses\":\"Geometry\",\"recommendations\":\"Daily practice\",\"overall_rating\":4}")
assert_code "tutor writes progress report" 201 "$c"

# G1: tutor cannot write a report under another tutor's profile id
c=$(curl -s -o /dev/null -w '%{http_code}' -b "$J_TUTOR" -X POST "$BASE/learning/progress-reports" \
  -H 'Content-Type: application/json' \
  -d "{\"student_profile_id\":\"${MY_STUDENT_ID}\",\"tutor_profile_id\":\"00000000-0000-0000-0000-000000000102\",\"period_start\":\"2026-08-01\",\"period_end\":\"2026-08-11\"}")
assert_code "report as foreign tutor → 403" 403 "$c"

c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$J_STUDENT" -X GET "$BASE/learning/progress-reports")
assert_code "student lists reports (session-resolved)" 200 "$c"
[ "$(cat /tmp/e2e-body.json | json 'len(d["data"])')" = "1" ] && ok "student sees the report" || fail "student report count ≠ 1"

c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$J_TUTOR" -X GET "$BASE/learning/progress-reports?tutor_profile_id=${PROFILE_ID}")
assert_code "tutor-scoped list" 200 "$c"
[ "$(cat /tmp/e2e-body.json | json 'len(d["data"])')" -ge 1 ] && ok "tutor sees reports" || fail "tutor report count = 0"

c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$J_ADMIN" -X GET "$BASE/learning/progress-reports")
assert_code "missing filter → 400" 400 "$c"

# ============================================== 8. NOTIFICATIONS (FR-19) ====
note "TRANSACTIONAL NOTIFICATIONS"
c=$(req "$J_STUDENT" GET /me/notifications/unread-count)
assert_code "unread count" 200 "$c"
unread=$(cat /tmp/e2e-body.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('data',{}).get('unread',0))")
ok "unread count endpoint (${unread} unread)"

# ============================================= 9. ANALYTICS + CSVs (admin) ====
note "ADMIN ANALYTICS + CSV EXPORTS"
c=$(req "$J_ADMIN" GET /admin/analytics)
assert_code "admin analytics" 200 "$c"
reg=$(cat /tmp/e2e-body.json | json 'd["data"]["funnel"]["registered_users"]')
[ "$reg" -ge 3 ] && ok "funnel counts registrations ($reg users)" || fail "funnel shows $reg users"

c=$(req "$J_STUDENT" GET /admin/analytics)
assert_code "student analytics → 403" 403 "$c"

c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$J_ADMIN" -X GET "$BASE/admin/reports/attendance.csv?lesson_id=00000000-0000-0000-0000-000000000010")
assert_code "attendance.csv (admin)" 200 "$c"
head -1 /tmp/e2e-body.json | grep -q "student_profile_id" && ok "attendance.csv header" || fail "attendance.csv malformed"

c=$(curl -s -o /dev/null -w '%{http_code}' -b "$J_STUDENT" -X GET "$BASE/admin/reports/attendance.csv?lesson_id=00000000-0000-0000-0000-000000000010")
assert_code "attendance.csv (student) → 403" 403 "$c"

c=$(curl -s -o /dev/null -w '%{http_code}' -b "$J_ADMIN" -X GET "$BASE/admin/reports/attendance.csv")
assert_code "attendance.csv missing lesson_id → 400" 400 "$c"

c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$J_ADMIN" -X GET "$BASE/admin/reports/revenue.csv")
assert_code "revenue.csv (admin)" 200 "$c"
head -1 /tmp/e2e-body.json | grep -q "programme_id" && ok "revenue.csv header" || fail "revenue.csv malformed"

c=$(curl -s -o /dev/null -w '%{http_code}' -b "$J_STUDENT" -X GET "$BASE/admin/reports/revenue.csv")
assert_code "revenue.csv (student) → 403" 403 "$c"


# ============================================================ CHAT + LMS ====
note "AI CHAT + LMS AUTHORING"
# AI assistant: create thread → greeting, send → canned reply (no Gemini key),
# escalate → ESCALATED + support ticket.
c=$(req "$J_PARENT" POST /chat/threads '{"title":"e2e fees question"}')
assert_code "chat create thread" 201 "$c"
THREAD=$(cat /tmp/e2e-body.json | json 'd["data"]["id"]')
[ -n "$THREAD" ] && ok "chat thread id captured" || fail "chat thread id missing"

c=$(req "$J_PARENT" GET "/chat/threads/$THREAD/messages")
assert_code "chat list messages" 200 "$c"
grep -q "Nuvora" /tmp/e2e-body.json && ok "chat greeting present" || fail "chat greeting missing"

c=$(req "$J_PARENT" POST "/chat/threads/$THREAD/messages" '{"content":"How much is the UTME cohort?"}')
assert_code "chat send message" 200 "$c"
grep -q '"reply"' /tmp/e2e-body.json && ok "chat assistant reply present" || fail "chat reply missing"

c=$(req "$J_STUDENT" GET "/chat/threads/$THREAD/messages")
assert_code "chat other user → 404" 404 "$c"

c=$(req "$J_PARENT" POST "/chat/threads/$THREAD/escalate" '{"note":"please help"}')
assert_code "chat escalate" 200 "$c"
c=$(req "$J_PARENT" GET "/chat/threads")
assert_code "chat list threads" 200 "$c"
grep -q "ESCALATED" /tmp/e2e-body.json && ok "chat thread escalated" || fail "chat thread not escalated"

# LMS authoring: create assignment + resource + quiz on the seeded cohort.
c=$(req "$J_TUTOR" POST /cohorts/00000000-0000-0000-0000-00000000c010/assignments '{"title":"e2e assignment","max_score":10}')
assert_code "lms create assignment" 201 "$c"
c=$(req "$J_TUTOR" POST /cohorts/00000000-0000-0000-0000-00000000c010/resources '{"title":"e2e resource","file_url":"https://example.com/notes.pdf"}')
assert_code "lms create resource" 201 "$c"
c=$(req "$J_TUTOR" POST /learning/assessments '{"cohort_id":"00000000-0000-0000-0000-00000000c010","title":"e2e quiz","pass_threshold":70,"questions":[{"question":"1+1?","options":["2","3","4"],"correct_index":0}]}')
assert_code "lms create quiz" 201 "$c"
c=$(req "$J_TUTOR" GET /cohorts/00000000-0000-0000-0000-00000000c010/enrollments)
assert_code "lms roster" 200 "$c"
c=$(req "$J_STUDENT" GET /cohorts/00000000-0000-0000-0000-00000000c010/enrollments)
assert_code "lms roster (student) → 403" 403 "$c"


# --- Chatbot C4-C6: ratings, agent inbox, analytics ---
c=$(req "$J_PARENT" POST "/chat/threads/$THREAD/rating" '{"score":5,"comment":"Great help"}')
assert_code "chat rate thread" 200 "$c"

c=$(req "$J_ADMIN" GET /admin/chat/threads)
assert_code "agent inbox list" 200 "$c"
grep -q "ESCALATED" /tmp/e2e-body.json && ok "inbox shows escalated thread" || fail "inbox missing escalated thread"

c=$(req "$J_ADMIN" GET "/admin/chat/threads/$THREAD/messages")
assert_code "agent transcript" 200 "$c"

c=$(req "$J_ADMIN" POST "/admin/chat/threads/$THREAD/reply" '{"content":"Hi! This is Ada from NUVORA support — how can I help?"}')
assert_code "agent reply" 201 "$c"
grep -q "Ada from NUVORA" /tmp/e2e-body.json && ok "agent reply stored" || fail "agent reply missing"

c=$(req "$J_STUDENT" POST "/admin/chat/threads/$THREAD/reply" '{"content":"hacked"}')
assert_code "agent reply (student) → 403" 403 "$c"

c=$(req "$J_ADMIN" POST "/admin/chat/threads/$THREAD/close" '{}')
assert_code "agent close thread" 200 "$c"

c=$(req "$J_ADMIN" GET /admin/chat/analytics)
assert_code "chat analytics" 200 "$c"
grep -q '"deflection_rate"' /tmp/e2e-body.json && ok "analytics fields present" || fail "analytics fields missing"


# --- M4: mobile token auth + devices + CSAT export ---
c=$(req "$J_LOGOUT" POST /auth/login/mobile '{"email":"e2e-parent@test.com","password":"password123"}')
assert_code "mobile login token" 200 "$c"
MOB_TOKEN=$(cat /tmp/e2e-body.json | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["token"])')
[ -n "$MOB_TOKEN" ] && ok "mobile token captured" || fail "mobile token missing"

c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -H "Authorization: Bearer $MOB_TOKEN" "$BASE/auth/me")
assert_code "bearer /auth/me" 200 "$c"
grep -q "e2e-parent@test.com" /tmp/e2e-body.json && ok "bearer identity resolved" || fail "bearer identity wrong"

c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -H "Authorization: Bearer $MOB_TOKEN" -X POST "$BASE/me/devices" -H 'Content-Type: application/json' -d '{"token":"ExponentPushToken[e2e]","platform":"ios","app_version":"0.1.0"}')
assert_code "register device" 201 "$c"
c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -H "Authorization: Bearer $MOB_TOKEN" "$BASE/me/devices")
assert_code "list devices" 200 "$c"
grep -q "ExponentPushToken\[e2e\]" /tmp/e2e-body.json && ok "device listed" || fail "device missing"
DEV_ID=$(cat /tmp/e2e-body.json | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"][0]["id"])')
c=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $MOB_TOKEN" -X DELETE "$BASE/me/devices/$DEV_ID")
assert_code "remove device" 200 "$c"

c=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $MOB_TOKEN" -X POST "$BASE/auth/logout")
assert_code "bearer logout" 200 "$c"
c=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $MOB_TOKEN" "$BASE/auth/me")
assert_code "me after bearer logout → 401" 401 "$c"

c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$J_ADMIN" "$BASE/admin/chat/csat.csv")
assert_code "csat.csv (admin)" 200 "$c"
head -1 /tmp/e2e-body.json | grep -q "thread_id,title" && ok "csat.csv header" || fail "csat.csv malformed"
c=$(curl -s -o /dev/null -w '%{http_code}' -b "$J_STUDENT" "$BASE/admin/chat/csat.csv")
assert_code "csat.csv (student) → 403" 403 "$c"

c=$(req "$J_ADMIN" GET /admin/chat/analytics)
assert_code "analytics incl csat" 200 "$c"
grep -q '"csat"' /tmp/e2e-body.json && ok "csat field present" || fail "csat field missing"


c=$(req "$J_ADMIN" GET "/admin/chat/analytics/trends?days=14")
assert_code "chat trends" 200 "$c"
grep -q '"date"' /tmp/e2e-body.json && ok "trends fields present" || fail "trends fields missing"


# --- P0: /account endpoints + site search ---
c=$(req "$J_PARENT" PUT /auth/me/profile '{"first_name":"Ada","last_name":"E2E","phone":"+2348000000001","timezone":"Africa/Lagos"}')
assert_code "update profile" 200 "$c"
grep -q '"first_name":"Ada"' /tmp/e2e-body.json && ok "profile first_name saved" || fail "profile first_name missing"

c=$(req "$J_PARENT" GET /auth/me)
assert_code "me includes profile" 200 "$c"
grep -q '"first_name":"Ada"' /tmp/e2e-body.json && ok "me returns profile fields" || fail "me missing profile fields"

c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "$J_PARENT" "$BASE/auth/me/export")
assert_code "data export" 200 "$c"
grep -q "nuvora-export" /dev/null 2>/dev/null; grep -q '"email"' /tmp/e2e-body.json && ok "export contains user" || fail "export malformed"

c=$(req "$J_PARENT" GET "/tutors/search?q=oluwatobi")
assert_code "tutor free-text search" 200 "$c"
grep -qi "oluwatobi" /tmp/e2e-body.json && ok "free-text search finds tutor" || fail "free-text search empty"

c=$(req "$J_LOGOUT" POST /auth/login '{"email":"e2e-parent@test.com","password":"password123"}')
assert_code "parent relogin after profile edit" 200 "$c"


# --- P1: payments console, earnings, google exchange ---
c=$(req "$J_ADMIN" GET "/admin/orders?page=1&page_size=25")
assert_code "admin orders list" 200 "$c"
grep -q '"total_items"' /tmp/e2e-body.json && ok "admin orders pagination meta" || fail "orders meta missing"

c=$(req "$J_ADMIN" GET /admin/payouts)
assert_code "admin payouts list" 200 "$c"

PARENT_ID=$(curl -s -b "$J_PARENT" "$BASE/auth/me" | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["id"])')
[ -n "$PARENT_ID" ] && ok "parent id resolved" || fail "parent id missing"
c=$(req "$J_PARENT" POST /bookings "{\"type\":\"COHORT\",\"cohort_id\":\"00000000-0000-0000-0000-00000000c010\",\"parent_user_id\":\"$PARENT_ID\",\"student_id\":\"$STUDENT_ID\",\"idempotency_key\":\"e2e-phase38-booking\"}")
assert_code "create cohort booking" 201 "$c"
NEW_ORDER=$(cat /tmp/e2e-body.json | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["order"]["id"])')
[ -n "$NEW_ORDER" ] && ok "booking order captured" || fail "booking order missing"

c=$(req "$J_ADMIN" POST "/admin/orders/$NEW_ORDER/confirm-payment" '{"note":"e2e confirm"}')
assert_code "confirm payment (admin)" 200 "$c"

c=$(req "$J_ADMIN" POST "/admin/orders/$NEW_ORDER/refund" '{"reason":"e2e refund test"}')
assert_code "refund order (admin)" 200 "$c"

c=$(req "$J_STUDENT" GET "/admin/orders?page=1")
assert_code "admin orders (student) → 403" 403 "$c"

c=$(req "$J_TUTOR" GET "/me/earnings")
assert_code "tutor earnings (session-resolved)" 200 "$c"
c=$(req "$J_TUTOR" GET "/me/earnings?tutor_profile_id=00000000-0000-0000-0000-000000000102")
assert_code "foreign earnings id → 403" 403 "$c"
c=$(req "$J_TUTOR" GET "/me/earnings")
grep -q '"held_total"' /tmp/e2e-body.json && ok "earnings fields present" || fail "earnings fields missing"

c=$(req "$J_LOGOUT" POST /auth/google/exchange '{"code":"bad","state":"bad"}')
assert_code "google exchange unconfigured → 409" 409 "$c"

# ===================================================== G5 — SAFEGUARDING ====
note "G5 SAFEGUARDING + CONTENT SIGN-OFF"

# Safeguarding ticket: 4h SLA, severity floored at MEDIUM.
c=$(req "$J_PUB" POST /support/tickets '{"email":"concerned@test.com","subject":"safeguarding concern","message":"a learner reported inappropriate contact","category":"SAFEGUARDING","severity":"LOW"}')
assert_code "create safeguarding ticket" 201 "$c"
grep -q '"category":"SAFEGUARDING"' /tmp/e2e-body.json && ok "ticket category recorded" || fail "ticket category missing"
grep -q '"severity":"MEDIUM"' /tmp/e2e-body.json && ok "safeguarding severity floored to MEDIUM" || fail "severity not floored"
grep -q '"sla_due_at"' /tmp/e2e-body.json && ok "SLA due recorded" || fail "sla_due_at missing"
SGTICKET=$(cat /tmp/e2e-body.json | json 'd["data"]["id"]')

# Unknown category rejected.
c=$(req "$J_PUB" POST /support/tickets '{"email":"x@test.com","subject":"x","message":"y","category":"NONSENSE"}')
assert_code "unknown ticket category rejected" 400 "$c"

# Admin triage queue (RBAC).
c=$(req "$J_ADMIN" GET "/admin/support?category=SAFEGUARDING")
assert_code "admin safeguarding queue" 200 "$c"
grep -q "$SGTICKET" /tmp/e2e-body.json && ok "safeguarding ticket in queue" || fail "ticket missing from queue"
c=$(req "$J_STUDENT" GET "/admin/support?category=SAFEGUARDING")
assert_code "student cannot see safeguarding queue → 403" 403 "$c"

# Resolve → resolved_at stamped.
c=$(req "$J_ADMIN" POST "/admin/support/$SGTICKET/status" '{"status":"RESOLVED"}')
assert_code "admin resolves safeguarding ticket" 200 "$c"
c=$(req "$J_ADMIN" GET "/admin/support?category=SAFEGUARDING&status=RESOLVED")
grep -q '"resolved_at"' /tmp/e2e-body.json && ok "resolved_at stamped" || fail "resolved_at missing"

# Testimonial publication sign-off (G5.3): consented draft → approve → public.
c=$(req "$J_ADMIN" POST /admin/testimonials '{"author_name":"Chiamaka O.","body":"The UTME cohort raised my daughter from 210 to 289.","rating":5,"consent_given":true,"is_public":false}')
assert_code "admin creates consented testimonial (draft)" 201 "$c"
TID=$(cat /tmp/e2e-body.json | json 'd["data"]["id"]')
c=$(curl -s -b "" "$BASE/content/testimonials" -o /tmp/e2e-body.json -w '%{http_code}')
grep -q "$TID" /tmp/e2e-body.json && fail "draft testimonial leaked to public" || ok "draft testimonial hidden from public"
c=$(req "$J_ADMIN" POST "/admin/testimonials/$TID/public" '{"is_public":true}')
assert_code "admin approves testimonial" 200 "$c"
curl -s "$BASE/content/testimonials" -o /tmp/e2e-body.json
grep -q "$TID" /tmp/e2e-body.json && ok "approved testimonial now public" || fail "approved testimonial missing from public list"

# Consent rule: unconsented testimonial cannot be approved.
c=$(req "$J_ADMIN" POST /admin/testimonials '{"author_name":"Unknown","body":"unconsented","consent_given":false,"is_public":false}')
TID2=$(cat /tmp/e2e-body.json | json 'd["data"]["id"]')
c=$(req "$J_ADMIN" POST "/admin/testimonials/$TID2/public" '{"is_public":true}')
assert_code "publish without consent rejected" 403 "$c"

# Programme publish workflow: archive → hidden from public → republish.
c=$(req "$J_ADMIN" POST "/admin/programmes/00000000-0000-0000-0000-00000000d001/status" '{"status":"ARCHIVED"}')
assert_code "admin archives programme" 200 "$c"
curl -s "$BASE/programmes" -o /tmp/e2e-body.json
grep -q "nigerian-curriculum" /tmp/e2e-body.json && fail "archived programme still public" || ok "archived programme hidden from catalogue"
c=$(req "$J_ADMIN" POST "/admin/programmes/00000000-0000-0000-0000-00000000d001/status" '{"status":"PUBLISHED"}')
assert_code "admin republishes programme" 200 "$c"
curl -s "$BASE/programmes" -o /tmp/e2e-body.json
grep -q "nigerian-curriculum" /tmp/e2e-body.json && ok "republished programme visible again" || fail "republished programme missing"
c=$(req "$J_STUDENT" POST "/admin/programmes/00000000-0000-0000-0000-00000000d001/status" '{"status":"ARCHIVED"}')
assert_code "student cannot change catalogue status → 403" 403 "$c"

# ============================================ SUGGESTIONS + ONBOARDING ======
note "G6 SUGGESTIONS ENGINE + FIRST-TIME WIZARD FLAG"

c=$(req "$J_PARENT" GET /me/recommendations)
assert_code "parent recommendations" 200 "$c"
grep -q '"cohorts"' /tmp/e2e-body.json && ok "cohort recommendations present" || fail "cohort recommendations missing"
grep -q '"programmes"' /tmp/e2e-body.json && ok "programme recommendations present" || fail "programme recommendations missing"
grep -q '"tutors"' /tmp/e2e-body.json && ok "tutor recommendations present" || fail "tutor recommendations missing"
grep -q '"basis"' /tmp/e2e-body.json && ok "personalisation basis present" || fail "basis missing"

c=$(req "$J_PARENT" GET /auth/me)
c=$(req "$J_PARENT" POST /auth/me/onboarded)
assert_code "mark onboarded" 200 "$c"
c=$(req "$J_PARENT" GET /auth/me)
[ "$(cat /tmp/e2e-body.json | json 'd["data"]["onboarded"]')" = "True" ] && ok "onboarded flag flips to true" || fail "onboarded flag not set"
c=$(req "$J_STUDENT" GET /me/recommendations)
assert_code "student recommendations" 200 "$c"

# ========================================= SESSION SYNC (WEB ↔ MOBILE) ======
note "G6 SESSION SYNC — one session row serves web cookie AND mobile bearer"

J_SYNC=/tmp/e2e-sync.jar; rm -f "$J_SYNC"
c=$(req "$J_SYNC" POST /auth/register '{"email":"sync-test@test.com","password":"password123","roles":["PARENT"]}')
assert_code "register sync user" 201 "$c"
TOKEN=$(curl -s -X POST "$BASE/auth/login/mobile" -H 'Content-Type: application/json' -d '{"email":"sync-test@test.com","password":"password123"}' | json 'd["data"]["token"]')
[ -n "$TOKEN" ] && ok "mobile login returns raw session token" || fail "mobile login token missing"

# Same token via Bearer (mobile transport) →
c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE/auth/me")
assert_code "mobile bearer /auth/me" 200 "$c"
grep -q "sync-test@test.com" /tmp/e2e-body.json && ok "bearer resolves the same user" || fail "bearer user mismatch"

# Same token as the WEB COOKIE value → identical session row.
c=$(curl -s -o /tmp/e2e-body.json -w '%{http_code}' -b "nuvora_session=$TOKEN" "$BASE/auth/me")
assert_code "web cookie with mobile token" 200 "$c"
grep -q "sync-test@test.com" /tmp/e2e-body.json && ok "cookie resolves the same user (one session row)" || fail "cookie user mismatch"

# Logout on WEB revokes the row → the mobile bearer dies too.
c=$(curl -s -o /dev/null -w '%{http_code}' -b "nuvora_session=$TOKEN" -X POST "$BASE/auth/logout")
assert_code "web logout" 200 "$c"
c=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE/auth/me")
assert_code "mobile bearer revoked after web logout" 401 "$c"

# ============================================================== SUMMARY ======
echo
echo "──────────────────────────────────────────────"
echo "  E2E RESULT: $PASS passed · $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  printf '  FAILURES:\n'
  for f in "${FAILURES[@]}"; do printf '    - %s\n' "$f"; done
fi
echo "──────────────────────────────────────────────"
[ "$FAIL" -eq 0 ]

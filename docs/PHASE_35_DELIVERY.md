# PHASE 35 — Mobile M3 (LMS screens) + M4 (token auth + push) + C5/C6 extras (prompt evals + CSAT) — DELIVERY

Branch: `feature/phase-35-mobile-m4-evals`
Base: `main` @ `4f2af2f` (phase 34)
Delivery method: git bundle `ykay-virtual-phase-35.bundle`

---

## M3 — Mobile LMS screens (`mobile/`)

- **`app/lms.tsx`** — "My Learning": courses via `GET /me/lessons`
  (Bearer), lesson counts + next lesson per cohort.
- **`app/lms/[cohortId].tsx`** — course workspace: lessons with join info,
  resources, assignments with inline submit, attendance summary.
- Home quick links now route to the in-app LMS.

## M4 — Token auth + push (backend + app)

### Token auth

- **`POST /auth/login/mobile`** — email+password → raw session token in the
  body (native apps store it in SecureStore; no cookie needed).
- **`POST /auth/login-code/mobile/confirm`** — 6-digit code variant.
- **Bearer support in `SessionAuth`**: `Authorization: Bearer <raw>` resolves
  the same hashed session — `/auth/me`, logout, devices and every protected
  route work with the header. Same 401 hardening; no bypass.
- Logout revokes cookie and/or bearer session.

### Device registry + push

- New domain `identity.Device` + repository (memory + postgres,
  migration `000022_devices`), unique per (user, token).
- **`POST /me/devices`** (upsert + last-seen), **`GET /me/devices`**,
  **`DELETE /me/devices/{id}`** — session or bearer.
- **`PushService`** + **`ExpoPushSender`** (exp.host v2 API, optional
  `EXPO_ACCESS_TOKEN`), **`LogPushSender`** for tests.
- **Agent chat replies now push** to the user's devices ("YK-Virtual support
  replied 💬") — best-effort, never blocking.
- App side: `registerDevice()` in `src/lib/api.ts` (expo-notifications →
  push token → `/me/devices`), wired after login and onboarding code-verify.
- **Postgres chat repo** now implemented (migration `000021_chat`) — fixes a
  latent nil-repo panic in the postgres branch (chat was memory-only).

## C5/C6 extras — prompt evals + CSAT

### Prompt evals (`internal/service/chat_evals.go` + tests)

- Eval harness: 6 rubric cases (grounded pricing, **no invented prices**,
  defer unknown to team, grounded tutor list, payment refusal → human,
  concise warm identity) with `Want`/`Forbid` assertions.
- `TestChatPromptEvals_CI` — deterministic fake provider, **fails CI on any
  regression**. `TestChatPromptEvals_Live` — runs the same rubric against
  real Gemini when `GEMINI_API_KEY` is set (skips otherwise) and logs the
  pass rate.
- Run live: `GEMINI_API_KEY=… go test ./internal/service/ -run Live -v`

### CSAT reporting

- `ChatAnalytics` extended: **`csat`** (% of rated threads ≥ 4★ among
  escalated/closed), `csat_responded`, `csat_total`.
- **`GET /admin/chat/csat.csv`** — thread_id, title, status, rating,
  comment, rated_at, user_id (admin only).
- `/admin/chat` shows a **CSAT % card + CSV export link** and rating
  comments on threads.

## Tests

- `TestPushService_DeviceLifecycle` (upsert, notify tokens, remove).
- `TestChatService_AgentReplyPushes` (agent reply → push to owner's devices).
- `TestChatPromptEvals_CI` (6/6 rubric).
- E2E grew **102 → 117**: mobile login token, bearer `/auth/me`,
  register/list/remove device, bearer logout → 401, csat.csv (admin 200 /
  student 403), analytics csat field.

## Verification

```text
gofmt / go build / go vet     PASS
go test ./...                 PASS (push + evals + chat suites)
tsc --noEmit                  PASS
next build                    PASS
scripts/e2e.sh                117 passed · 0 failed
Live: /auth/login/mobile → token → Bearer /auth/me ✓ · device registered ✓
  · /admin/chat/csat.csv header ✓ · pages 200 ✓
```

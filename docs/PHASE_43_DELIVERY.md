# PHASE 43 — G1 COMPLETE + G2 DEPS CLEAN + G3 FOUNDATIONS — DELIVERY

Branch: `feature/phase-43-remediation`
Base: `main` @ `5e648d3` (G1 session-context merge)
Scope: remediation-plan gates **G1.2/G1.3 (all fixed identities eliminated + authz tests)**,
**G2.1 (dependency remediation — 0 vulnerabilities)**, **G3.1 (durable job queue)**,
**G3.2 (real OpenTelemetry)**, plus the first frontend test suite (Vitest).

---

## G1.2 — every hard-coded identity eliminated (web + mobile + API)

### Backend: object-level authorization is now structural

- **`internal/transport/http/profile_authorizer.go`** (new): `ProfileAuthorizer`
  with `ResolveStudent` / `ResolveTutor` — the single choke-point for
  profile-scoped access:
  - STUDENT → only the profile whose `user_id` is the session user;
  - PARENT → only learners in `parent_student_links` (single-learner parents
    auto-resolve when the ID is omitted);
  - TUTOR → only the vetting profile owned by the session user;
  - admin → any explicit ID (still audited);
  - a supplied foreign ID → **403**, a missing ID → session-resolved.
- Wired into every endpoint that previously trusted caller-supplied IDs:
  - `portal_handler.go` — availability (list/upsert/delete + exceptions),
    assignments, submissions, attendance-summary;
  - `dashboard_handler.go` — `/me/lessons`, `/me/tutor-lessons`, `/me/earnings`;
  - `learning_handler.go` — create assessment, start/submit attempt,
    progress-report create/list (incl. bare-TUTOR "my reports" listing);
  - `booking_handler.go` — **`parent_user_id` is now derived from the
    session**; a mismatched body value → 403 (admin exempt).
- **Self-registered STUDENT accounts get a real profile**: `AuthService`
  `ensureStudentProfile` creates the learner's own `student_profile` at
  registration / role-selection (`WithStudentProfiles` wiring), so
  `/auth/me/context` always resolves. Dev seed learner now belongs to the
  demo STUDENT user and is linked to the demo parent via a proper
  `parent_student_link` (mirrors production rules).

### Web: zero fixture UUIDs (was 10 files)

- `grep -rn "00000000-0000-0000" client mobile` → **0 matches**.
- `student-dashboard`, `lms` hub/course, `tutor-dashboard`, `lms/tutor` +
  teaching console, `StudentQuizzes`, `TutorLearning`, `MessageCenter`,
  notifications, dashboard unread count → all session-resolved
  (`useSession` + omitted profile params).
- **Checkout rebuilt**: the "paste your parent/student UUID" inputs are gone —
  learner comes from a dropdown of `/me/learners`, the paying parent from the
  session. `createCohortBooking` no longer sends `parent_user_id`.
- **PrivateBookingForm**: subject IDs resolved from the live `/subjects`
  catalogue (fixture `c001/c002/c003` removed).
- **`/tutors/[slug]`**: now fetches the real tutor from `/api/v1/tutors/{slug}`
  (ISR 1h) — hard-coded tutor content + fixture profile IDs removed.
- **Admin vetting**: `DEV_ADMIN` + X-User-ID bridge headers removed — the
  session cookie carries the admin role (server enforces).
- **Admin analytics**: attendance CSV no longer hard-codes a lesson ID
  (prompts for one).
- **API clients** (`vetting`, `messaging`, `portal`, `lms`, `learning`,
  `bookings`): retired dev-auth headers everywhere; profile params optional.
- Tutor dashboard's roster-less "mark attendance for learner 0001" buttons
  replaced with a link to the teaching-console roster (per-learner marking
  lives there); teaching-console progress reports pick the learner from the
  actual class roster.

### Mobile

- `mobile/app/lms.tsx` + `lms/[cohortId].tsx`: fixture learner ID removed —
  `/me/lessons` and assignment submission are session-resolved via the bearer
  token.

## G1.3 — authorization regression tests

- **E2E (`scripts/e2e.sh`) extended → 148/148 PASS** (was 141):
  - session-resolved availability/earnings/quiz-start/submit (no params);
  - **foreign `tutor_profile_id` → 403**, **foreign `student_profile_id` → 403**,
    **non-tutor availability → 403**, **report as foreign tutor → 403**;
  - student profile resolved from `/auth/me/context` and used end-to-end
    (quiz → auto-grade → progress report → student sees it).
- **Vitest suite added (first frontend tests)** — `client/tests/`
  `session-authorization.test.ts` (8 tests): API layers omit profile IDs by
  default, never send `X-User-ID`/`X-User-Roles`, booking body carries no
  `parent_user_id`, apiFetch always sends trace-id + credentials.
  `vitest.config.ts` + `npm test` wired; root `test:web` now runs it (the
  "Vitest not yet configured" stub is gone).

## G2.1 — dependency remediation: 0 vulnerabilities (was 7: 1 critical, 5 high)

| Change | Why |
|---|---|
| **Next.js 14.2.15 → 15.5.23** | 14.2.15 was inside the fix range of 20+ advisories incl. critical middleware authorization bypass (CVE-2025-29927, fixed 14.2.25) — moved to the maintained 15.x line |
| `@tanstack/react-form` ^0.48 → ^1.x | 0.x pulled vulnerable `@remix-run/*`/`turbo-stream` chain (high) |
| `uuid` dependency **removed** | moderate advisory; `crypto.randomUUID` + tiny RFC4122 fallback in `lib/api.ts` |
| `overrides`: `postcss ^8.5.26`, `sharp ^0.35` | Next's pinned transitive copies carried high advisories |
| Next 15 migration | official `next-async-request-api` codemod (async `params`/`searchParams` on 6 dynamic routes), `outputFileTracingRoot` set |

`npm audit` → **found 0 vulnerabilities**. `tsc --noEmit` clean.
`next build` → **83/83 routes** on Next 15.5.23. CI frontend job now gates on
`npm run test` + `npm audit --audit-level=high`.

## G3.1 — durable job queue (placeholder retired)

- **`internal/worker/queue.go`** (new): Redis-backed durable queue —
  `BRPOPLPUSH ready→processing`, exponential backoff (2s…5m cap),
  `MaxAttempts=5`, **dead-letter list** (`nuvora:jobs:dead`) with operator
  inspection (`DeadLetters`), delayed jobs via ZSET promotion, at-least-once
  delivery with idempotent-handler contract; `MemoryQueue` with identical
  semantics for dev/tests.
- `cmd/worker` consumes the queue when Redis is up (expire-holds, weekly
  payouts, ranking recompute registered as handlers) and degrades to
  cron-only mode without it; crons retained as the schedule source.
- **`internal/worker/queue_test.go`**: success, retry-then-recover,
  dead-letter after max attempts, unknown-type dead-letter, backoff cap.

## G3.2 — real OpenTelemetry (placeholder retired)

- **`internal/telemetry/otel.go`**: real OTLP/HTTP trace exporter
  (`go.opentelemetry.io/otel` v1.24) — batch span processor, service
  resource attrs, W3C tracecontext + baggage propagation, graceful shutdown
  flush; no-op (zero cost) when `OTEL_EXPORTER_OTLP_ENDPOINT` unset.
  Works with Tempo/Jaeger/SigNoz/Honeycomb collectors.

## Contract

- `api/openapi.yaml`: profile-scoped query params (`student_profile_id`,
  `tutor_profile_id`) now optional with session-resolution semantics
  documented (403 on foreign IDs); booking no longer requires
  `parent_user_id`; availability/exception bodies no longer require
  `tutor_profile_id`.

## Verification

```text
gofmt / go build / go vet      PASS
go test ./...                  PASS (service, config, middleware, worker — new queue suite)
scripts/e2e.sh (memory)        148 passed · 0 failed  (7 new negative authz tests)
client npm audit               0 vulnerabilities  (was 1 critical / 5 high / 1 moderate)
client tsc --noEmit            PASS
client next build (15.5.23)    PASS — 83/83 routes
client vitest                  8 passed · 0 failed  (first frontend suite)
grep fixture UUIDs             0 matches in client/ + mobile/
openapi.yaml                   valid YAML
```

## Remaining (next phases, per PRODUCTION_REMEDIATION_PLAN)

- G3: metrics/alerting dashboards + backup/DR drill (queue + tracing now real).
- G4: staging proof with live Paystack/Flutterwave keys, email/SMS provider,
  signed-URL object storage, video links, Expo push.
- G5: safeguarding/legal decisions + consent-cleared production catalogue
  (the `/tutors/[slug]` page now renders real API data — it needs real
  approved tutor profiles seeded via operations).
- G6: Playwright browser E2E (parent→pay→lesson→progress + cross-family
  negative) on top of the new Vitest layer; `e2e-pg.sh` release gate re-run
  against real Postgres in CI.

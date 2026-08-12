# PHASE 33 — LMS beyond MVP + AI chatbot complete build — DELIVERY

Branch: `feature/phase-33-lms-chatbot`
Base: `main` @ `f8cbcfa` (phase 32)
Delivery method: git bundle `ykay-virtual-phase-33.bundle`

---

## 1. LMS beyond MVP

New tutor-authoring + roster capabilities over the learning backend, plus
the full chat assistant (below).

### Backend additions
- `POST /cohorts/{id}/assignments` — create assignment (tutor/admin only).
- `POST /cohorts/{id}/resources` — create resource / material link (tutor/admin).
- `GET /cohorts/{id}/enrollments` — **class roster** with learner names
  (tutor/admin only; resolves student profiles).
- Repo layers extended (interface + memory + postgres): `Assignment.Create`,
  `Resource.Create`, `CohortEnrollment.ListByCohort`.
- Role guard: authoring + roster endpoints reject non-tutor sessions (403);
  e2e-verified.

### Frontend
- **Tutor teaching console** (`/lms/tutor/cohorts/[id]`) gained four
  sections: **class roster** (names/status/enrolled date), **quiz builder**
  (title, pass %, N questions × 4 options with correct-answer radio →
  publishes via the existing auto-graded engine), **assignment creator** and
  **resource creator** (collapsible forms).
- Existing student course workspace unchanged (lessons, attendance strip,
  assignments, auto-graded quizzes, resources, notes, progress).

## 2. AI chatbot — complete build (plan C1–C3 + handoff)

### Backend (`internal/domain/chat`, `internal/service/chat_*.go`)
- **Thread model**: per-user threads, append-only messages, status
  OPEN/ESCALATED/CLOSED; memory repo (postgres migration noted as follow-up).
- **Endpoints** (session-required):
  - `POST /chat/threads` — create (greeting message auto-added)
  - `GET /chat/threads` — list mine
  - `GET /chat/threads/{id}/messages`
  - `POST /chat/threads/{id}/messages` — store user msg → provider reply →
    store reply (rate-limited like auth)
  - `POST /chat/threads/{id}/escalate` — status → ESCALATED **+ support
    ticket with full transcript** (via the existing support service)
- **Gemini provider** (`chat_gemini.go`): direct REST to
  `generativelanguage.googleapis.com` (no SDK), `gemini-2.0-flash` default,
  system prompt constrains to NUVORA topics, temperature 0.4, 500-token cap.
- **Grounding** (`buildChatContext` in main): fresh programmes / cohorts /
  tutors snapshot injected into every call — the bot answers from live data,
  never from memory.
- **Guardrails**: PII (email/phone) redacted before it leaves the platform;
  escalation keywords (human/refund/complaint/…) trigger handoff; graceful
  canned reply when no `GEMINI_API_KEY` is configured (same pattern as
  Google OAuth) so the UX never breaks.
- Config: `GEMINI_API_KEY`, `GEMINI_MODEL`, `CHATBOT_ENABLED` (kill switch).

### Frontend
- **`/chat`** — full assistant page: thread sidebar, conversation bubbles,
  typing indicator, 👤 Human handoff button, ESCALATED banner.
- **`ChatWidget`** (root layout, every page) — upgraded from a dead bubble to
  a real floating mini-chat: opens latest thread or starts one, inline
  composer, link to the full page. Verified in the layout bundle.
- `features/chat/api.ts` — typed client.

### Tests
- `TestChatService_ThreadLifecycle`: greeting, canned reply (provider off),
  AI reply (fake provider), history, cross-user 404, escalation.
- E2E grew **77 → 92**: chat create/list/send/escalate + cross-user 404 +
  LMS assignment/resource/quiz creation + roster 200/403.

## Verification

```text
gofmt / go build / go vet     PASS
go test ./...                 PASS (incl. chat service tests)
tsc --noEmit                  PASS
next build                    PASS
scripts/e2e.sh                92 passed · 0 failed
Live (site :3100 + API :8080):
  chat: thread → greeting → reply → escalate → ESCALATED + ticket
  tutor: create assignment/resource/quiz → 201; roster → names resolved
  non-tutor roster/authoring → 403
  /chat + /lms pages 200; widget present in root layout bundle
```

## To enable real AI replies

```env
GEMINI_API_KEY=...        # Google AI Studio key
GEMINI_MODEL=gemini-2.0-flash
CHATBOT_ENABLED=true
```

Without a key the assistant responds with the offline message and still
saves everything + escalates correctly.

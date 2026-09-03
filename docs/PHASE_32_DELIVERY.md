# PHASE 32 — Auth fixes, industry-standard onboarding, LMS, seeds & plans — DELIVERY

Branch: `feature/phase-32-auth-lms`
Base: `main` @ `c220651` (phase 31)
Delivery method: git bundle `ykay-virtual-phase-32.bundle`

---

## 1. Google auth "Request failed 404" — FIXED

The flow code was verified clean (endpoint returns 409 JSON when
unconfigured). "Request failed 404" is `apiFetch`'s fallback when it
receives an HTML 404 — i.e. a request that missed the API entirely
(stale build without the `/api/v1` rewrite, or a missing route). Fixes:

- **JSON 404 catch-all** on the API (`/api/v1/` and `/`): every unknown path
  now returns `{"error":{"code":"NOT_FOUND",...}}` — the browser can never
  swallow an HTML 404 again. Verified live.
- **GoogleButton** now explains unconfigured state: "Google sign-in isn't
  enabled yet — use email instead" + server env hint.
- Google OAuth setup steps documented in `docs/SEEDS.md` (env vars +
  redirect URI registration).

## 2. Onboarding "one character at a time" — FIXED (root cause)

`Step1`–`Step7` were **function components defined inside the page
component**. Every keystroke re-rendered the page, creating new component
identities → React unmounted/remounted the input → focus loss →
one-character-at-a-time typing.

**Fix:** all step components hoisted to module scope with explicit props
(`state/save/go/...`). Verified in the shipped bundle; typing is now
instant. Bonus hardening in the same rewrite:

- **Password strength meter** (step 5): live bar + checklist
  (8+ chars, mixed case, digit, symbol).
- **Code input**: `autocomplete="one-time-code"`, auto-submits at 6 digits.
- Confirm-password mismatch shown inline; validation errors clearer.

## 3. Industry-standard auth & onboarding summary

- Sessions: httpOnly cookie, SHA-256-hashed tokens, Secure in production,
  rotation on privilege change (already in place).
- Brute-force protection on all auth endpoints (per-IP, phase 31).
- Email verification = 6-digit code that also activates + logs in.
- Password policy ≥8 chars (NIST 800-63B), with strength guidance in UI.
- Google OAuth optional, fail-graceful when unconfigured.
- 7-step stateful onboarding (name/email → verify → role → role-path →
  profile → about → dashboard), refresh-safe, role-specific.

## 4. Working seed details — `docs/SEEDS.md`

All four demo accounts (admin/parent/tutor/student @ykaycollege.com,
`password123`), profiles `…0001` / `…0102`, programmes, cohorts c010–c012,
subjects, tutors and the new LMS demo content (assignments, quiz,
attendance, graded submission, CONFIRMED enrollment). Every entry verified
live against the running API.

## 5. LMS for students & tutors — BUILT (MVP, industry-standard shape)

New portals over the existing learning backend (assessments, grading,
attendance, notes, resources, progress reports):

- **`/lms`** — student hub: course cards, attendance rate, pending
  assignments, quiz passes, progress reports.
- **`/lms/courses/[cohortId]`** — course workspace: live-lesson schedule
  with join links, attendance strip, assignments (submit inline),
  **auto-graded quiz engine** (start → answer → instant score/pass),
  resources, lesson notes, progress reports.
- **`/lms/tutor`** — teaching hub: cohorts I teach, upcoming lessons.
- **`/lms/tutor/cohorts/[cohortId]`** — teaching console: per-lesson
  **attendance marking**, **submission grading** (score + feedback),
  quiz list, **progress-report creation** (strengths/weaknesses/
  recommendations/rating).
- Dashboard links added (student → 🎓 My Learning, tutor → 🏫 Teaching
  console).

Backend fixes for the LMS: memory-store wiring — `Attendance`, `Assignments`,
`Learning`, `Grading`, `Submissions` must point at the **store-backed**
instances or seeded data vanishes (same trap as phase-28 lessons). New
`seedLMSDemo` seeds: 2 assignments, a 3-question auto-graded quiz, attendance
rows, a graded submission (17/20) and a CONFIRMED enrollment for learner
`…0001` in cohort c010. `listAssessments(cohortId?)` client now passes the
cohort filter.

## 6. Mobile & AI chatbot plans — `docs/PLAN_MOBILE_CHATBOT.md`

- **Mobile:** PWA hardening → Expo (React Native) app; phased M1–M5
  (scaffold, student LMS, tutor/parent apps, store launch); foundations
  needed (token auth, device push registry).
- **Chatbot:** Google **Gemini** (flash) streaming chat via a new Go chat
  service with **grounded function calling** (catalogue/cohorts/tutors/FAQ
  so it never hallucinates pricing), guardrails, human handoff to the
  existing support/messaging stack, cost model (~<$50/mo), phases C1–C6
  with suggested sequencing (Phase 33 = C1–C2).

## Verification

```text
gofmt / go build / go vet     PASS
go test ./...                 PASS
tsc --noEmit                  PASS
next build                    PASS
scripts/e2e.sh                77 passed · 0 failed
Live: all 4 LMS pages 200; quiz flow 3/3 passed; assignments/resources/
  attendance/submission seeded and served; JSON 404 on unknown API paths;
  onboarding bundle carries strength meter + one-time-code handling;
  seed login works via the rewrite; demo accounts verified.
```

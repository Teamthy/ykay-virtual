# PHASE 48 — UI OPTIMIZATION + MOBILE STANDARD LMS + LOAD TESTS — DELIVERY

Branch: feature/phase-48-ui-mobile-loadtests
Base: feature/phase-47-g6-browser-e2e @ 3863735
Scope: the next-tranche items from docs/UI_OPTIMIZATION_PLAN.md,
docs/MOBILE_LMS_PLAN.md and G6.1 item 5 (load tests).

## Web UI optimization (all pages)

### Consent-gated testimonials (G5.3 enforcement)
- TestimonialSlider is now a SERVER component consuming the consent-gated
  /content/testimonials API (identical data path to TestimonialsSection);
  the carousel moved to a presentational TestimonialCarousel. An honest
  empty state links to /success-stories when no consented rows exist.
- The hard-coded `testimonials` fixture export was DELETED from
  lib/site-data.ts (no fixture marketing claims can reach production).
- Dev-mode parity: seedConsentedTestimonials (memory demo) + seed-refs.sql
  (real PG) now create rows WITH consent evidence recorded
  (consent_given, consent_source, consent_date) — every dev/staging
  environment exercises the production consent path.

### Accessibility (measured, not guessed)
- Global contrast fix: ink-500 #777→#6B6B6B and ink-400 #999→#737373 —
  a single token change that moved landing-page axe serious violations
  from 52 → 31 nodes (remaining: trust-logo spans + italic/font-light
  accents, logged for the acceptance register).
- axe gate expanded to the conversion path: /dashboard, /lms,
  /checkout/{cohort} — all at 0 critical.
- Carousel a11y labels retained (Phase 47 fix).

## Mobile standard LMS (execution)

New screens (all session-resolved, bearer token — G1.2 rule):
- app/quizzes.tsx — quiz list resolved from the learner's cohorts
  (/me/lessons → per-cohort /learning/assessments, merged + de-duped).
- app/quizzes/[assessmentId].tsx — full quiz player: start → single-
  attempt question set → answer → auto-grade submit → pass/fail result
  with retake.
- app/progress.tsx — attendance gauge (/me/attendance-summary) + tutor
  progress reports (/learning/progress-reports) with ratings.
- app/notifications.tsx — notification centre: list, unread badge,
  per-item mark-read + read-all.
- app/account.tsx — session profile, linked learners, logout
  (SecureStore token clear → /login).
- app/home.tsx — standard-LMS hub: session greeting, live unread badge,
  navigation to every learner surface.
- _layout.tsx registers all new routes.
- src/lib/api.ts typing repaired (static imports for expo-notifications /
  Platform — the dynamic-import version never type-checked).
- Contract verified live: /auth/login/mobile → token → /me/lessons →
  /learning/assessments?cohort_id=… → quiz list.

## Load tests (G6.1#5 + G7 evidence)

- scripts/loadtest.sh — hey harness against real Postgres: cached
  catalogue (~5,000 req/s), search (~2,900), login rate-limit engagement
  (42/80 → 429), webhook idempotency storm, session path (~440 req/s).
- RATE_LIMIT_PER_MINUTE env knob added (default 300 unchanged) — the
  tuning lever load tests need and G7 distributed limiting replaces.
- docs/LOAD_TEST_REPORT.md — results + capacity conclusions: one
  instance covers the 10k-user model with >40× headroom; the
  session-resolution path is the first optimization lever.

### Two production bugs found and fixed by the load test
1. isUniqueViolation never matched lib/pq errors (SQLState vs Code) —
   all postgres unique-violation handling was silently broken
   (duplicate webhooks/orders → raw 500s). Fixed + unit test.
2. Duplicate-webhook race — aborted-transaction lookup returned
   "current transaction is aborted" 500s under concurrency.
   ProcessWebhook now discards the aborted tx and continues fresh.
   Verified: 50 parallel duplicates → 50×200, exactly 1 settlement.

## Verification

```
gofmt / go build / go vet             PASS
go test ./...                         PASS (incl. TestIsUniqueViolation,
                                      TestOpenAPIContract)
scripts/e2e.sh (memory)               168 passed · 0 failed
scripts/e2e-pg.sh (real PG 17)        168 passed · 0 failed
scripts/staging-evidence.sh           31 passed · 0 failed
scripts/e2e-web.sh (Playwright+axe)   5 passed · 0 critical (landing
                                      serious 52→31 nodes)
client tsc / vitest                   PASS (8/8)
mobile tsc --noEmit                   PASS (previously failing)
scripts/loadtest.sh                   recorded in LOAD_TEST_REPORT.md
```

## Remaining (next tranche)

- UI: the 31 remaining contrast nodes (trust-logos + italic accents),
  image alt/lazy sweep, ≤375px pass — tracked in UI_OPTIMIZATION_PLAN.md.
- Mobile: push deep-linking on tap, offline course cache, real-device
  matrix (eas.json preview APK flow is ready).
- G7: Redis-backed session cache, distributed rate limiting,
  audit_logs partitioning (capacity math in LOAD_TEST_REPORT.md).

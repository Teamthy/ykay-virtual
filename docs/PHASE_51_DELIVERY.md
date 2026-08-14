# PHASE 51 — INDUSTRY-STANDARD DASHBOARDS, RUNTIME ERRORS, ROUTING, SUGGESTIONS, WIZARD — DELIVERY

Branch: feature/phase-51-dashboards-wizard
Base: feature/phase-50-ci-hero-devux @ c0b2aad
Scope: the full production-polish tranche — every dashboard brought to an
industry-standard shell, all known runtime errors fixed (plus two new
production bugs found and fixed), role-routed/synced dashboards, the
suggestions engine, the first-time 3-page wizard (web + mobile), and
"NUVORA on the go" mobile completeness.

## Runtime errors — found and fixed

1. **MessageCenter crash** (`conversations.data?.data.length`): the API
   returns `{data: null}` for fresh accounts — 4 components dereferenced
   the envelope without defaults. All patched to
   `(res.data?.data ?? [])`; MessageCenter's optimistic update now uses
   the correct unwrapped query shape.
2. **Recommendations shelf crash** (`Cannot read properties of undefined
   (reading 'slug')` → then `null.slice`): the raw tutor DTO leaked
   `subjects: null` from the PG search path. Fixed server-side
   (RecommendationService now maps a clean API DTO, never null) +
   client-side defaults.
3. **ReferralCard 500 chain**: `referral_codes.user_id` had no unique
   constraint but the repo inserts with `ON CONFLICT (user_id)` — every
   `/me/referral-code` 500'd on a fresh database. Migration 000032 adds
   the unique index (dedupe-first) + defensive client slice.
4. **ChunkLoadError ("Loading chunk 583 failed")**: stale standalone
   manifests from incremental builds. Fixed: `rm -rf .next` before build
   in e2e-web.sh + the Lighthouse CI job, and a production-grade
   `global-error.tsx` boundary (Reload / Try again / digest) so chunk
   failures degrade gracefully for users with old tabs.
5. **Stale-server port poisoning**: Next renames its process title to
   "next-server", so a zombie build survived generic pgreps and answered
   health checks with stale chunks. e2e-web.sh now kills squatters and
   verifies its OWN server bound the port.
6. **Wizard flag missing from login response**: `toUserResponse` didn't
   include `onboarded`, so post-login routing could never see it. Unified
   `toUserResponse(user, roles)` everywhere (login, mobile login, code
   confirm, register).

## Role routing & synced dashboards (industry standard)

- `hooks/useDashboardRoute.ts` — single source of truth: admin/tutor/
  student/parent home mapping + per-dashboard role allowlists.
- `RoleGate` component mounted on **every** dashboard (parent, student,
  tutor, lms, admin): once the session resolves, a user whose role does
  not match the page is redirected to their own home; admins always land
  on /admin. Middleware still guards the cookie; RoleGate enforces roles.
- Post-login flow: verified → wizard (if not onboarded) → role home.
  The Playwright suite covers all of it in a real browser.

## Suggestions engine (server-side, session-scoped)

- `GET /me/recommendations` — cohorts open for enrolment (soonest start +
  fill rate), featured programmes level-matched to the learner(s),
  top-ranked tutors, each with a server-computed `reason` and a
  human-readable `basis` ("Based on JSS2 learners in your family.").
- Rendered as the "For you" shelf on the parent/student/tutor dashboards
  and a mobile screen — no fixture IDs, no client guessing.
- E2E: parent + student recommendation scenarios (176 checks total).

## First-time 3-page wizard (web + mobile)

- Web `app/onboarding/wizard` + mobile `app/wizard`: Welcome → learner
  creation (parents) / level (students) / subject (tutors) → Goals →
  `POST /auth/me/onboarded` → role dashboard. Idempotent; returning
  users skip straight through (flag on /auth/me, migration 000031).
- Mobile welcome screen is now session-aware: signed-in users route to
  wizard or home automatically.
- Playwright: dedicated wizard test walks all 3 steps to the dashboard.

## Mobile — "NUVORA on the go" completeness

- New `recommendations.tsx` screen + "For you" hub card; wizard; session-
  aware welcome; all routes registered. `tsc --noEmit` clean.

## Verification

```
gofmt / go build / go vet          PASS
go test ./...                      PASS (9 packages)
scripts/e2e.sh (memory)            176 passed · 0 failed  (was 168;
                                   +8 recommendation/onboarding checks)
scripts/e2e-pg.sh (real PG)        176 passed · 0 failed  (migration 32)
scripts/staging-evidence.sh        31 passed · 0 failed
scripts/e2e-web.sh (Playwright)    6 passed · 0 failed  ← wizard, For-you
                                   shelf, role routing all in-browser
                                   axe: 0 critical / 0 serious (landing)
client vitest 8/8 · tsc · audit 0  PASS
mobile tsc --noEmit                PASS
```

## Remaining (tracked)

- UI polish backlog (UI_OPTIMIZATION_PLAN.md): ≤375px pass, image alt/
  lazy sweep; tutor-card imagery migration to local assets.
- G5.3 register rows for any real-person marketing photos.
- Pilot launch checklist (next artifact).

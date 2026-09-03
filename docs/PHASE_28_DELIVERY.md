# PHASE 28 — Routing Completeness, Role Seeding, Hero & Template Unification — DELIVERY

Branch: `feature/phase-28-routing-seeding-heroes`
Base: `main` @ `42f0045` (phase 27)
Delivery method: git bundle `ykay-virtual-phase-28.bundle`

---

## What was delivered

### 1. All programmes/cohorts pages built & routing end-to-end

The full user journey now works with real data in dev mode (and any env):

- **Home Popular programmes / Upcoming cohorts** → **`/programmes`** list →
  **`/programmes/[slug]`** detail (tabs + CTA card) → **`/cohorts`** list →
  **`/cohorts/[id]`** detail (schedule + enrol card) → **`/cohorts/[id]/enroll`**
  checkout. All verified HTTP 200 with content.
- **Seeded dev catalogue**: 2 published programmes + 3 published cohorts with
  fees/capacity/schedules + 3 scheduled lessons (shown on the cohort detail
  page's session schedule).
- **Memory repo now implements the enriched programme interface**
  (`ListWithMeta` + `GetDetailBySlug`) so `/programmes` list and detail pages
  render real rows in dev (previously returned empty).
- **Dummy showcase cards route to real pages** via an optional `href` on
  `ProgrammeCard`/`CohortCard` (UTME → `/utme-2026`, IGCSE → `/online-classes`,
  WAEC → `/exam-prep`, etc.) instead of dead 404 slugs.
- **Bug fixed**: `lib/api.ts` was a `"use client"` module, so its `apiFetchSSR`
  was **not callable from server components** — every SSR-fetched page
  (programmes, cohorts, blog, testimonials, sitemap) silently 404'd. SSR
  helpers moved to a new server-safe `lib/server-api.ts`.

### 2. All roles seeded — one account per dashboard

Password for all: **`password123`**

| Email                     | Role                         | Dashboard            |
| ------------------------- | ---------------------------- | -------------------- |
| `admin@ykaycollege.com`   | SUPER_ADMIN                  | `/admin/vetting`     |
| `parent@ykaycollege.com`  | PARENT (+ learner Ada Bello) | `/dashboard`         |
| `tutor@ykaycollege.com`   | TUTOR                        | `/tutor-dashboard`   |
| `student@ykaycollege.com` | STUDENT                      | `/student-dashboard` |

Seeded in memory mode (`seedDemoUsers`) **and** in Postgres via migration
`000019_demo_users` (bcrypt-hashed, email-verified, role-assigned; down
migration provided). All four verified logging in with correct roles.

### 3. Hero unification — top-left h1, no blue bg

- `PageHero` rebuilt: plain cream surface, **top-left aligned** breadcrumbs +
  Anton h1 + subtitle + optional CTAs — no navy/blue band, no centred layout.
- Applied automatically to **every page using PageHero** (programmes, cohorts,
  subjects, pricing, how-it-works, careers, curricula, blog, contact, about,
  resources, success-stories, private-tuition, exam-prep, digital-skills,
  online-classes…). The how-it-works blue background is gone.

### 4. "Meet our tutors" → Preline Team template

`TutorsShowcase` (home-tutoring + hometutors) rebuilt on the team grid:
avatar + name + **verified chip** + role + gold-star rating rows in a
2–3 column grid, ending with a **"Browse all tutors → /tutors"** card (the
"We are hiring!" treatment).

### 5. "We deliver the best results, period." → Preline Approach template

`ResultsSection` + old icon-grid merged into one `ApproachSection`: left
16:9 image, right **numbered timeline** (YK-Virtual Insights™ Assessment →
Progress Reports & Reviews) with connector line, gold **"Get started today"**
CTA. Home section order preserved.

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS
npx tsc --noEmit          PASS
next build                PASS (all routes)
scripts/e2e.sh            77 passed · 0 failed
Live: programmes + cohorts lists 200, detail pages 200 with real titles +
  lessons, enroll 200, demo logins for all 4 roles, PageHero top-left with no
  blue band, team grid + approach timeline rendered.
```

# PHASE 06C — Wireframe Implementation: Home, Programmes Hub, Programme Detail Tabs, Industry Standards — DELIVERY

Branch: `feature/phase-06c-wireframes` (contains Phases 3–10B + 06C)
Base: `feature/phase-10b-cohorts-onboarding` @ `223374d`
Delivery method: git bundle `ykay-virtual-phase-06c.bundle`

---

## What was implemented (against the working-document wireframes)

### Home (§8.1) — primary CTAs + real hero search
- **Hero search** (Subject + Curriculum/Exam + Level) — routes to `/programmes?subject=&curriculum=&exam=&level=`, **never a dead end** (`HeroSearch`)
- **Primary CTAs**: Find a Programme (hero search + programme section), Book Private Tuition (hero CTAs already + new sections); **Secondary CTA**: Become a Tutor (kept)
- **Popular programmes** — cards with title, curriculum, level, subject chips, format, **next start**, price, CTA (`ProgrammeCard` + `PopularProgrammes`)
- **Upcoming cohorts** — live from the API: capacity/status, schedule, timezone, fee, Enrol CTA (`UpcomingCohorts`)
- **Testimonials** — **admin-managed + consent-gated**: new `testimonials` API (public list only returns `consent_given AND is_public`, featured first), `POST /admin/testimonials` (consent required → 400 without), home slider reads it (`TestimonialsSection`)
- Trust indicators: vetted tutors, escrow, parent visibility — all verifiable claims

### Programmes Hub (§8.2)
- Header + breadcrumb, **filter bar** [Curriculum][Level][Subject][Format][Exam] + **sidebar filters** (British/Nigerian, exams, levels), programme cards, **load more** (infinite), URL-driven filters (`ProgrammesHub`)

### Programme detail (§8.3) — reusable template with tabs
- Breadcrumb, title with curriculum/level/exam tags, summary, subjects, price + **ENROL / BOOK CTAs**
- **Tabs: Overview | Topics | Cohorts | Private Tuition | Tutors | FAQ** (`ProgrammeDetailTabs`)
- Cohorts tab: live cohorts (dates, seats, fee, Join); Tutors tab: live approved tutors via new `GET /programmes/{slug}/tutors`; Topics: structured curriculum list; FAQ with schema

### Find a Tutor (§8.8) + Tutor Profile (§8.9)
- **Tutor card upgrade**: avatar, ✓ Verified badge, subjects, experience, rating, location, **View Profile + Request Tuition** (`TutorCard`)
- **Marketplace toggle** (`NEXT_PUBLIC_MARKETPLACE_ENABLED=false` → managed-matching notice, "request a tutor" path)

### Landings (curricula, exam prep, digital skills)
- **Featured cohorts strips** wired into British, Nigerian, Exam-Prep and Digital-Skills landings (`CohortStrip`)

### Become a Tutor (§8.10) / About (§8.11) / Pricing (§8.12) / Success Stories (§8.13) / Contact (§8.14)
- Become a Tutor: **Why teach · Quality standards · Earning model** sections added
- About: **Academic quality model + Safeguarding & learner wellbeing** sections added
- Pricing: **Cancellation & reschedule policy** section added (reschedule/cancel/no-show)
- Success Stories: **case studies** section + consent-controlled photos note
- Contact: **learner level + subject** fields added (per §8.14 spec)

### Authentication (§8.15)
- **Google sign-in button** (config-gated via `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; graceful "arrives with OAuth setup" note when unset — never a broken button)
- Parent multi-learner flow (onboarding), role-aware redirects (already in place)

## Backend additions
- `ProgrammeRepo.ListWithMeta / GetDetailBySlug` — enriched: curriculum/level/exam names, subject names+slugs, **next published cohort start** (LATERAL); `Level` filter param added
- `CohortRepo.CohortsForProgramme` + `TutorRepo.TutorsForProgrammeSubjects` (detail tabs)
- `TestimonialRepo` (postgres + memory) + `ContentService.ListTestimonials/CreateTestimonial` (consent enforced)
- New routes: `GET /content/testimonials`, `POST /admin/testimonials`, `GET /programmes/{slug}/tutors`, enriched `GET /programmes` + `/programmes/{slug}` — OpenAPI now **67 paths**

## Test results (run in sandbox)
```
go build ./...                  PASS    go vet ./...            PASS
gofmt -l (whole module)         0
go test ./internal/service/...  95 tests PASS
legacy/server: go test ./...    9 packages PASS
client: npx tsc --noEmit        PASS
client: npx next build          PASS  (home, programmes hub, programme tabs, cohorts, landings)
API smoke (memory fallback)     PASS
  - testimonials public [] → admin create (no consent 400) → with consent 201
    → public shows 1 (Mrs Adebayo, featured) ✅
  - programmes enriched (memory=plain) 0/0 · programme tutors 404 (no programme)
```
Enriched programme data (names, next start, subjects) is exercised against Postgres in
production; memory mode returns plain/empty lists by design.

## Manifest
### New backend
- `internal/repository/postgres/programme_meta_repo.go`
- `internal/repository/postgres/content_repos.go` (TestimonialRepo)
- `internal/repository/memory/content_memory.go` (TestimonialMemory, appended)

### Modified backend
- `internal/domain/academics/entity.go` (ProgrammeDetail + Level filter)
- `internal/domain/content/{entity,repository}.go` (Testimonial + AuthorRole)
- `internal/service/{programme_service,content_service}.go`
- `internal/transport/http/{catalogue_handlers,content_handler,router}.go`
- `cmd/api/main.go` (testimonials + enriched wiring)
- `internal/repository/memory/uow.go` (Testimonials in store)
- `api/openapi.yaml` (67 paths)

### New frontend
- `client/features/programmes/components/{HeroSearch,ProgrammeCard,PopularProgrammes,ProgrammesHub,ProgrammeDetailTabs}.tsx`
- `client/features/cohorts/components/{UpcomingCohorts,CohortStrip}.tsx`
- `client/features/content/components/TestimonialsSection.tsx`
- `client/features/tutors/components/TutorCard.tsx` (rewritten)

### Modified frontend
- `client/app/page.tsx` (home composition per §8.1)
- `client/app/(marketing)/programmes/page.tsx` + `programmes/[slug]/page.tsx` (hub + tabs)
- `client/app/(marketing)/{tutors,contact,about,become-tutor,pricing,success-stories}/page.tsx`
- `client/app/(marketing)/curricula/{british,nigerian}/page.tsx`, `exam-prep/page.tsx`, `digital-skills/page.tsx` (cohort strips)
- `client/app/(auth)/login/page.tsx` (Google button, config-gated)
- `client/features/programmes/api/list.ts`, `client/features/tutors/api/search.ts` (types)
- `docs/PHASE_06C_DELIVERY.md`

## Bundle instructions (PowerShell — `;` not `&&`)
```
git fetch /path/to/ykay-virtual-phase-06c.bundle feature/phase-06c-wireframes
git checkout -b feature/phase-06c-wireframes FETCH_HEAD
go run ./cmd/migrate --cmd=up
go run ./cmd/api
npm --prefix client install
npm --prefix client run dev
```
Try: home hero search (subject + curriculum/exam + level → programmes hub with filters),
programme detail tabs (Cohorts/Tutors live with Postgres data), admin → create a
consent-gated testimonial → it appears on the home page, tutor cards with
Verified badges + Request Tuition, marketplace toggle via env var.

## Zero-friction + standout additions
- Hero search that actually routes (no dead end) — the spec's #1 friction point
- Programme cards with next-start dates from live cohorts
- Tabbed programme detail = one reusable template (never hard-coded pages)
- Consent-gated testimonials = trust without fabrication
- Managed-matching mode toggle = Tuteria-style fallback when marketplace is off
- Google sign-in staged (config-gated, no broken UI)

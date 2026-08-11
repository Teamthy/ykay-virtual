# PHASE 09 — Full Public Site (Founder Profile, All Pages, Toasts, Zero Dead Routes) — DELIVERY

Branch: `feature/phase-09-full-site` (contains Phases 3–8 + 9)
Base: `feature/phase-11-admin-console` @ `e549d59`
Delivery method: git bundle `ykay-virtual-phase-09.bundle`

---

## 1. What was left (gap analysis vs. the YKAY Working Document v1.0)

**IA gaps from §6 that did NOT exist before this phase:**
| Missing (doc §6) | Status after this phase |
|---|---|
| About / Academic Leadership (founder profile) | ✅ `/about` — full Yinka Oladimeji profile (doc §3 content) |
| British Curriculum landing | ✅ `/curricula/british` |
| Nigerian Curriculum landing | ✅ `/curricula/nigerian` |
| Exam Preparation landing | ✅ `/exam-prep` |
| Computing & Digital Skills | ✅ `/digital-skills` |
| Private Tuition (7-step request) | ✅ `/private-tuition` + wizard (doc §8.7) |
| How It Works | ✅ `/how-it-works` (parent + tutor flows, doc §8.10) |
| Pricing | ✅ `/pricing` (tabs per §8.12, indicative ranges + honest disclaimer) |
| Success Stories | ✅ `/success-stories` (verified competition claims; consent-gated placeholders) |
| Contact / Support (trackable) | ✅ `/contact` → real `POST /support/tickets` (was a dead stub calling a nonexistent API) |
| Student portal | ✅ `/student-dashboard` (today's lessons, join links, progress snapshot, §9) |
| Home page per §8.1 | ✅ leadership teaser + How-It-Works strip + FAQ (JSON-LD) added; CTAs wired |

**Dead-route / dead-hook audit:**
- ❌ Removed legacy `app/support/page.tsx` (called a nonexistent `/api/v1/support/tickets`, hardcoded localhost)
- ❌ Removed `href="/tutors/apply"` (route never existed) → all header/footer links now point at real routes
- ❌ Footer links had NO hrefs → Footer rewritten with full column wiring
- ❌ Header "Contact Us" / mobile menu had `<a>` without href → Header rewritten (Services + Curricula dropdowns, working search → `/tutors?subject=`)
- ✅ Zero `href="#"` / `href=""` remain (grep-verified)
- ✅ Every query hook in `features/*` is consumed by a component

## 2. What was built

### Founder / Academic Leader profile (doc §3 — real content, no fabrication)
`/about` — Yinka Oladimeji: career (Atlantic Hall Educational Trust Council, Day Waterman
College, Children's International School Lekki), credentials (BSc CS, MSc IT, COBIS Middle
Leaders Fellow), achievements (IGCSE CS outcomes, 2026 International Coding Olympiad Rome —
medals + world Top-3 Codementum), vision quote, Person JSON-LD, and an explicit
**verification note** (exact wording + permissions to be confirmed before publication).

### Public pages (11 new)
All SSR/static, breadcrumbs + Course/FAQ JSON-LD, CTA-wired, no fabricated testimonials
(placeholders marked `[PLACEHOLDER]` pending consent per the repo constitution).

### Private tuition 7-step wizard (doc §8.7)
Learner/level → subject → goals → schedule/timezone → tutor preference → contact → review.
Submits a structured support ticket; success toast; advisor-matching copy (managed matching
mode per Appendix B). Uses the session email when signed in.

### Contact / support (real backend)
`POST /api/v1/support/tickets` (domain `content.SupportTicket` + postgres/memory repos +
`SupportService.OpenTicket` with validation + handler + router/main wiring). Contact page
creates trackable tickets with toasts; advisor channels listed.

### Toasts (sonner)
Global `<Toaster>` in the root layout + wired into: login (welcome back), register (account
created), checkout (order created → complete payment), admin blog (published/archived),
vetting profile/subjects saved, contact form, private-tuition wizard.

### Frontend optimization
- Header: Services + Curricula dropdowns, wired search form (subject → `/tutors?subject=`),
  mobile menu with every route, AuthNav kept
- Footer: 3 fully-wired columns + brand + socials (→ /contact)
- Home: leadership teaser, how-it-works strip, FAQ with FAQPage JSON-LD
- Student dashboard: today's lessons w/ join links, recent lessons w/ status badges,
  progress snapshot (attendance/assignments/completed), quick links; empty states
- Legacy dead code removed; grep-verified zero dead hrefs

## 3. Test results (run in sandbox)

```
go build ./...                  PASS    go vet ./...            PASS
gofmt -l (whole module)         0
go test ./internal/service/...  82 tests PASS   (2 new support tests)
legacy/server: go test ./...    9 packages PASS
client: npx tsc --noEmit        PASS
client: npx next build          PASS  (11 new pages + all prior routes)
API smoke (memory fallback)     PASS  (support ticket create 200 + validation 400)
```

## 4. Manifest

### New backend
- `internal/repository/postgres/support_repo.go`
- `internal/repository/memory/` (SupportMemory in admin_memory.go)
- `internal/transport/http/support_handler.go`
- `internal/service/support_service_test.go`
- `internal/domain/content/repository.go` (+SupportTicket types)

### Modified backend
- `internal/service/admin_service.go` (+SupportService)
- `internal/transport/http/router.go`, `cmd/api/main.go`

### New frontend
- `client/components/toaster.tsx`
- `client/components/layout/Header.tsx` (rewritten), `Footer.tsx` (rewritten)
- `client/components/home/{LeadershipTeaser,HowItWorksStrip,HomeFAQ}.tsx`
- `client/app/page.tsx` (updated home composition)
- `client/app/(marketing)/{about,private-tuition,how-it-works,pricing,success-stories,contact,exam-prep,digital-skills,student-dashboard}/page.tsx`
- `client/app/(marketing)/curricula/{british,nigerian}/page.tsx`
- `client/features/tuition/PrivateTuitionWizard.tsx`

### Modified frontend
- `client/app/layout.tsx` (+Toaster)
- `client/app/(auth)/{login,register}/page.tsx` (toasts)
- `client/app/admin/blog/page.tsx` (toasts)
- `client/features/bookings/components/CheckoutClient.tsx` (toast)
- `client/features/vetting/components/BecomeTutorClient.tsx` (toasts)

### Removed
- `client/app/support/` (dead legacy page)

## 5. Still open vs. the working document (honest list)

| Doc item | Status |
|---|---|
| §8.3 Programme detail tabs (Topics/Cohorts/Tutor(s)/FAQ) | Detail pages exist; tabs → Phase 9b when cohort data flows |
| §9.2 Assignment submission / resources downloads | API-ready (submissions/resources tables); UI with teaching operations phase |
| §10 Parent portal advanced (invoices, multiple learners) | `/dashboard` core exists; learner switcher + receipts next |
| §11 Tutor availability + attendance marking UI | API schema ready; UI with teaching ops |
| §12 Admin reports/CSV export (§FR-24) | Next admin iteration |
| §21 Video provider (Zoom/Meet/Teams link strategy) | Meeting links stored; provider decision pending |
| §22 Analytics funnel + §23 MFA for admins | Phases 13–14 |
| Content blocks CMS for homepage (§FR-21) | Blog CMS done; homepage blocks → admin content phase |

## 6. Bundle instructions (PowerShell — `;` not `&&`)

```
git fetch /path/to/ykay-virtual-phase-09.bundle feature/phase-09-full-site
git checkout -b feature/phase-09-full-site FETCH_HEAD
go run ./cmd/migrate --cmd=up
go run ./cmd/api
npm --prefix client install
npm --prefix client run dev
```

Try: `/about` (founder), `/private-tuition` (7-step wizard + toast), `/contact` (real ticket +
toast), `/curricula/british`, `/exam-prep`, `/digital-skills`, `/pricing`, `/success-stories`,
`/student-dashboard` — and the fully-wired header/footer.

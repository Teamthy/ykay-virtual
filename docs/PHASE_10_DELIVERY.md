# PHASE 10 — Reviews, Referrals & Institutional (B2B) Accounts — DELIVERY

Branch: `feature/phase-10-reviews-referrals-b2b` (contains Phases 3–10)
Base: `feature/phase-09-full-site` @ `bf7332d`
Delivery method: git bundle `ykay-virtual-phase-10.bundle`

---

## What was built

### Reviews (consent-gated, booking-scoped, rating recompute)
- **Domain**: `review.ReviewRepository` extended — Create, ListPublishedByTutor
  (PUBLISHED + is_public + consent_given only — Review JSON-LD rule),
  ExistsForReviewer, RecomputeTutorRating (atomic SQL updating
  `tutor_profiles.rating_avg/count` from consented published reviews)
- **Service** `ReviewService`: Create (rating 1–5, **consent required**,
  reviewer ≠ tutor, one review per reviewer+tutor → 409, starts PENDING,
  audited), ListPublishedByTutor (public), Moderate (publish → recompute rating)
- **Transport**: `POST /api/v1/reviews` (auth), `GET /api/v1/tutors/{slug}/reviews`
  (public) — OpenAPI now **58 paths**
- **Frontend**: `features/reviews/ReviewsSection` on the tutor profile —
  published reviews list + signed-in review form (star rating, consent
  checkbox required, toast, "appears after moderation" copy); the fabricated
  "Mrs Soetan" quote removed (no fake testimonials)

### Referral programme (code → apply → qualify → wallet reward)
- **Domain**: `referral.ReferralRepository` — CreateCode/GetCodeByUserID/GetCode,
  Create (UNIQUE referred_user), GetByReferredUser, Qualify, MarkRewarded,
  ListByReferrer, CreateReward, GetRewardByReferral + admin List/Count
- **Service** `ReferralService`: GetOrCreateCode (8-char unambiguous codes,
  collision-safe), Apply (can't self-refer, invalid code → 404, already
  referred → 409), **QualifyOnOrderPaid** (PENDING → QUALIFIED → wallet credit
  ₦2,000 → reward row → REWARDED; idempotent — no double rewards), ListMine
- **Hooks**: `PaymentService.ProcessWebhook` calls the qualifier after order
  PAID; `AuthService.Register` accepts `referral_code` and records it
- **Transport**: `GET /me/referral-code`, `POST /referrals/apply`,
  `GET /me/referrals`
- **Frontend**: `ReferralCard` on the parent dashboard (code, copy link with
  toast, invited/qualified/rewarded stats, status list); register page has a
  referral-code field prefilled from `?ref=CODE` with a "You were referred!" banner

### Institutional (B2B) accounts
- **Domain**: `institution.InstitutionRepository` — Create (slug auto, unique)
  + AddMembership (OWNER on creation when signed in)
- **Service** `InstitutionService.Create` (name/type validation, audited)
- **Transport**: `POST /api/v1/institutions` (public)
- **Frontend**: shared `B2BLeadForm` wired into **/for-schools** (SCHOOL) and
  **/corporate-training** (CORPORATE) — name/type/email/phone/website/needs +
  success toast; signed-in users become the institution owner

### Fixes found by the smoke test
- Memory-mode `TutorRepo` was nil → review creation panicked; guarded the
  service + wired `store.Tutors` in the memory fallback, with the mock
  marketplace tutors (chinasa/oluwatobi) seeded so reviews/search work without
  Postgres

## Test results (run in sandbox)

```
go build ./...                  PASS    go vet ./...            PASS
gofmt -l (whole module)         0
go test ./internal/service/...  91 tests PASS   (9 new: review consent gate,
                                                 create→moderate→publish,
                                                 duplicate 409, moderate-no-consent
                                                 409, referral full reward loop
                                                 + wallet credit + idempotency,
                                                 invalid code, non-referred no-op,
                                                 unique codes, institution create)
legacy/server: go test ./...    9 packages PASS
client: npx tsc --noEmit        PASS
client: npx next build          PASS  (tutor profile, dashboard, register,
                                       for-schools, corporate-training)
API smoke (memory fallback)     PASS
```

### Smoke transcript (excerpt)
```
POST /auth/register + login (referrer)          → code JCQBPCWP
GET  /me/referral-code                          200 code + reward ₦2000
POST /auth/register (friend, referral_code=…)   referral recorded PENDING
GET  /me/referrals (referrer)                   1 · PENDING
POST /institutions {"name":"Lagos Prep School"} → slug lagos-prep-school, SCHOOL
POST /reviews (no consent)                      400
POST /reviews (consent)                         → PENDING
GET  /tutors/oluwatobi/reviews                  (empty — pre-moderation)
POST /admin/reviews/{id}/moderate PUBLISHED     → PUBLISHED
GET  /tutors/oluwatobi/reviews                  → 1 published · rating 5
POST /reviews (duplicate)                       409
```

## Manifest

### New backend
- `internal/domain/review/repository.go` (rewritten full interface)
- `internal/domain/referral/repository.go` (rewritten full interface)
- `internal/domain/institution/repository.go` (rewritten full interface)
- `internal/repository/postgres/growth_repos.go` (reviews/referrals/institutions)
- `internal/repository/memory/growth_memory.go`
- `internal/service/growth_service.go`, `internal/service/growth_service_test.go`
- `internal/transport/http/growth_handler.go`

### Modified backend
- `internal/service/admin_service.go` (moderate → recompute rating)
- `internal/service/payment_service.go` (referral qualifier hook)
- `internal/service/auth_service.go` (referral_code on register)
- `internal/transport/http/router.go` (+6 routes), `cmd/api/main.go`
  (service wiring + memory tutor seeds)
- `internal/repository/memory/uow.go` (+Referrals/Institutions/Reviews in store)
- `internal/repository/{postgres,memory}/admin_repos.go` (dedup referral/review impls)
- `api/openapi.yaml` (58 paths)

### New frontend
- `client/features/reviews/{api.ts,components/ReviewsSection.tsx}`
- `client/features/referrals/ReferralCard.tsx`
- `client/features/institutions/B2BLeadForm.tsx`

### Modified frontend
- `client/app/(marketing)/tutors/[slug]/page.tsx` (live reviews + Request Tuition → /private-tuition)
- `client/app/dashboard/page.tsx` (ReferralCard)
- `client/app/(auth)/register/page.tsx` (referral field + ?ref= banner + Suspense)
- `client/app/(marketing)/{for-schools,corporate-training}/page.tsx` (B2BLeadForm)
- `client/features/auth/api.ts` (RegisterInput.referral_code)
- `docs/PHASE_10_DELIVERY.md`

## Bundle instructions (PowerShell — `;` not `&&`)

```
git fetch /path/to/ykay-virtual-phase-10.bundle feature/phase-10-reviews-referrals-b2b
git checkout -b feature/phase-10-reviews-referrals-b2b FETCH_HEAD
go run ./cmd/migrate --cmd=up
go run ./cmd/api
npm --prefix client install
npm --prefix client run dev
```

Try it: register two accounts → copy your code from the dashboard → register the
second with `?ref=CODE` → pay an order → your wallet gains ₦2,000. Leave a
review on a tutor profile → moderate it in /admin/reviews → it appears publicly.
Submit the B2B form on /for-schools or /corporate-training.

## Remaining roadmap
- Phase 12: search ranking & growth-loop polish (ranking cron refinement,
  related-content weights)
- Phase 13: observability (OTel, Prometheus/Grafana)
- Phase 14: load & security testing (k6, ZAP, authz matrix)
- Phase 15: CI/CD + cloud launch readiness (Docker, Lighthouse gate, DR runbook)
- Phase 16: post-launch SEO ops (GSC, CWV monitoring)

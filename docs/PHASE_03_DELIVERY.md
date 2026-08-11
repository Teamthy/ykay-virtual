# PHASE 03 — Booking, Packages & Escrow Payment Engine — DELIVERY

Branch: `feature/phase-03-booking-escrow`
Base: `main` @ `1a3d045` (Phase 1)
Delivery method: git bundle (see Bundle instructions below)

---

## ⚠️ Important context — Phase 2 was never on the remote

The master prompt stated Phase 2 (`feature/phase-02-marketplace-api` @ commits
`2d4eb6a`/`a2b534e`) had been pushed. Verification in this sandbox found:

- `origin/feature/phase-02-marketplace-api` points at the Phase 1 tip (`009569b`);
  commits `2d4eb6a` and `a2b534e` do not exist on any remote or bundle.
- The `.bundle` files committed in the repo root belong to the OLD flat
  `server/` "Wave 6" lineage (diverged at `57469b1`) — they do **not** contain
  the AGENTS.md-structured Phase 2 work (no `internal/repository`,
  `internal/service`, `internal/transport/http`, root `go.mod`).

**Consequence:** the Phase 2 foundation (repository layer, services, transport,
frontend catalogue hooks/pages) was rebuilt in this phase to the exact Phase 2
spec, and Phase 3 (booking + escrow) was built on top. Both are on this one
branch. If you have the real Phase 2 commits locally, you can cherry-pick/merge
them on top — the API surface here is designed to match the Phase 2 spec 1:1
(`/tutors/search`, `/subjects`, `/programmes`, same query params, envelope).

Stale `.bundle` files (`ykay-virtual-phase2.bundle`, `ykay-virtual-wave0.bundle`,
`ykay-virtual-waves1-5.bundle`) were removed from the repo and `*.bundle` added
to `.gitignore`.

---

## Update 2 — Senior repo restructure (same branch, commit 2)

Requested: proper folder structure, senior-dev layout, both apps verified running.

### Structural changes
- `server/` (legacy flat module, module name `ykay-virtual` — collided with the
  root module) → moved to **`legacy/server/`**, module renamed to **`ykay-legacy`**,
  all imports updated. Its 9 test packages still pass and it no longer conflicts
  with the root Go module. It is deprecated reference code — new work lives in
  `cmd/` + `internal/` + `pkg/` at the repo root.
- **`.history/` removed** (183 tracked IDE snapshot files — repo hygiene).
- Root `README.md` rewritten: full structure map, quick start, Makefile usage.
- Root `package.json` scripts updated: `dev:api` now points at `./cmd/api`
  (was the dead `./server/cmd/server`), added `dev:worker`, `migrate`,
  `typecheck`, `build:web`, `test` (runs root + legacy Go suites).
- **`Makefile`** added: `infra`, `migrate`, `api`, `worker`, `web`, `build`,
  `typecheck`, `test`, `test-api`, `test-legacy`, `lint`, `fmt`, `smoke`.
- Docs consolidated: `YKAY_BUILD_PLAN.md`, `YKAY_VS_TUTERIA_PARITY.md`,
  `PHASE_03_DELIVERY.md` moved into `docs/`.
- `.gitignore` += `.history/`, `legacy/server/.env` (`*.tsbuildinfo`,
  `*.bundle` already present).
- Senior fixes: `pkg/validator.go` `ValidateMinLength` produced a rune instead
  of a number string (fixed with `strconv.Itoa`); rate-limit middleware now
  returns the standard error envelope with `TOO_MANY_REQUESTS` instead of a
  plain text body; `gofmt` applied to the whole module (`make lint` clean).

### Verification (post-restructure, run in sandbox)
```
go build ./...        PASS   go vet ./...          PASS
gofmt -l (whole module)  0   go test ./internal/service/...  25 tests PASS
legacy: go build ./... PASS  legacy: go test ./... 9 pkgs PASS
client: npx tsc --noEmit  PASS   client: npx next build  PASS
API smoke (memory fallback, :8092):
  /health 200 · tutors/search 2 tutors · subjects data:[] · booking 404 · forged webhook 400
```

## What was built

### Phase 2 foundation (rebuilt to spec)

| Area | Files |
|---|---|
| Root module | `go.mod` (module `ykay-virtual`, Go 1.22), `go.sum`, `.env.example` |
| Domain | `internal/domain/errors.go` (sentinels), `internal/domain/academics/entity.go` (Subject/Programme + repo interfaces), `internal/domain/tutor/repository.go`, `internal/domain/booking/repository.go`, `internal/domain/payment/repository.go` (Wallet GetOrCreate added), `identity.AuditService.LogStateChange` added |
| Repository (Postgres) | `postgres.go` (bounded pools 25/5, WithTx, TxQuerier, uuidNull), `subject_repo.go` (search/category, whitelist sort), `tutor_repo.go` (subjectSlug via EXISTS, approved+public only, location/online/price/rating filters, whitelist sort, location_label), `programme_repo.go` (PUBLISHED only, curriculum/exam/format/featured), `booking_repo.go` (cohorts FOR UPDATE, enrollments, private requests/packages), `order_repo.go` (generate_order_number()), `payment_repo.go` (payments, idempotent webhooks w/ unique-violation mapping, escrow, payouts, wallets), `identity_repo.go` (audit logs, parent→student link check, tutor-can-teach check) |
| Repository (memory) | `memory.go` + `booking_memory.go` + `uow.go` — in-memory fakes for all interfaces + `MemoryStore` + `MemoryUnitOfWorkFactory` (tests + dev fallback) |
| UoW | `internal/repository/uow.go` — UnitOfWork contract; Postgres impl binds all repos to one `*sql.Tx` |
| Cache | `internal/cache/redis_real.go` — go-redis, Ping/Get/Set/Del/DelPrefix(SCAN)/Incr/Exists, `CacheKey` helper |
| Services | `tutor_service.go` (search cache 120s, slug cache 300s, InvalidateSearchCache, mock fallback chinasa/oluwatobi), `subject_service.go` (180s), `programme_service.go` (180s), `cohort_service.go` (300s), `audit_service.go` |
| Transport | `internal/transport/http/` — `dto.go` (ParsePagination ?page/?page_size/?sort/?filter[x], WriteAppError typed→HTTP at edge), `catalogue_handlers.go` (subjects/tutors/programmes + TutorDTO), `cohort_handler.go`, `router.go` (Go 1.22 method+path patterns, RequestID→Logger→Recover→RateLimit chain) |
| Entrypoints | `cmd/api/main.go` (Redis→InMemory cache fallback; Postgres→memory storage fallback; graceful shutdown), `cmd/worker/main.go` (crons), `cmd/migrate/main.go` (real lib/pq runner: up/down/status, schema_migrations, per-file tx) |
| Payments | `internal/payment/provider.go` — Paystack + Flutterwave: `VerifyWebhookSignature` (HMAC-SHA512 / HMAC-SHA256), `CreatePaymentLink` (real API when secret set, mock link in dev) |

### Phase 3 — Booking, packages & escrow payment engine

| Area | What |
|---|---|
| Booking service | `internal/service/booking_service.go` — `CreateCohortBooking` / `CreatePrivateBooking`: single UoW creating order (+ generated order_number) + order item + PENDING enrollment (cohort, row-locked capacity check, duplicate-enrollment guard) or private request + ACTIVE package; wallet ensured; audit log; **idempotency_key replay** returns the original order untouched (replayed=true) |
| Payment service | `internal/service/payment_service.go` — `InitiatePayment` (provider reference `ORDER_NO-UUID8`, PENDING payment row, hosted checkout link, failure → payment FAILED + audit); `ProcessWebhook` (signature-verified, **UNIQUE provider_reference idempotency**, amount reconciliation with Paystack kobo normalization, success → payment SUCCESS + order PAID + enrollment CONFIRMED + escrow HELD with 72h release_at); `ReleaseEscrow` (CLIENT_CONFIRM/AUTO_EXPIRE → payout PENDING); `RefundEscrow` (dispute path → wallet credit + order/enrollment REFUNDED); `ExpireStaleHolds` (cron) |
| Payout service | `internal/service/payout_service.go` — weekly batch: PENDING → PROCESSING → PAID via `PayoutProvider` seam (Mock in dev), idempotent |
| Worker crons | `expire_stale_booking_holds` (15 min + boot sweep), `process_weekly_tutor_payouts` (7 days) |
| Migration | `000011_booking_escrow.{up,down}.sql` — partial indexes for both crons (`idx_escrow_status_release`, `idx_payouts_status_created`, `idx_orders_status_created`) |
| OpenAPI | `/bookings` full request/response schema, `/payments/initiate`, `/payments/webhooks/{provider}` with `WebhookResult`, `/cohorts/{id}`, schemas Order/OrderItem/Cohort/BookingResponse/InitiatePaymentResponse/WebhookResult |
| Frontend | `features/bookings/types.ts` + `api/create.ts` (createCohortBooking, createPrivateBooking, initiatePayment), `features/cohorts/api/get.ts` (SSR getCohortSSR), `features/bookings/components/CheckoutClient.tsx` (**TanStack Form + Zod** client+server validation, disabled-during-submit, optimistic query writes, escrow copy, payment-link card with redirect/copy), `app/checkout/[cohortId]/page.tsx` (SSR + ISR 300s, hard 404 for missing/non-published cohorts, breadcrumb visual + JSON-LD, noindex), `components/providers.tsx` (QueryClientProvider), layout metadata template + Organization JSON-LD, qk factory extended (cohorts/orders/checkout) |
| Frontend deps | `@tanstack/react-form@^0.48.2`, `zod@^3.23.8`, `uuid@^9` (+ types), `@types/node` |
| Cleanup | Removed legacy `client/app/programmes/[id]/*` stubs (route conflict with `(marketing)/programmes/[slug]`, dead code) |

---

## Test results (run in sandbox)

```
go build ./...                                    PASS
go vet ./...                                      PASS
gofmt (new files)                                 CLEAN
go test ./internal/service/...  (25 tests)        PASS
go test ./... (root module)                       PASS
cd server && go build ./...                       PASS  (fixed tutorsService ordering)
cd server && go test ./... (10 packages)          PASS  (admin auth enrollments lessons
                                                        payments programmes support
                                                        tuitionrequests tutors)
client: npx tsc --noEmit                          PASS
client: npx next build                            PASS  (checkout = dynamic ƒ route)
API smoke test (memory fallback, :8091)           PASS
```

Service tests (25): cohort booking success/idempotency-replay/capacity-full/
not-published/forbidden-unlinked/duplicate-enrollment, private booking success/
validation/tutor-can-teach, subject cache, tutor search cache + mock mode,
programme published-only, webhook valid/duplicate/invalid-signature/unknown-ref/
non-success/amount-mismatch, initiate payment success/reject-paid-order, escrow
release + double-release guard, refund credits wallet, stale-hold expiry cron,
weekly payout batch idempotent.

## Smoke test output (excerpt)

```
GET  /health                         → {"status":"ok","version":"0.3.0"}
GET  /api/v1/tutors/search?subject=mathematics → envelope + chinasa/oluwatobi (mock)
POST /api/v1/bookings (bad cohort)   → {"error":{"code":"NOT_FOUND",...}}
POST /api/v1/payments/webhooks/paystack (forged sig) → 400 BAD_REQUEST
GET  /api/v1/cohorts/{uuid}          → 404 NOT_FOUND
```

## Manifest

### New backend
- `go.mod`, `go.sum`
- `internal/domain/errors.go`
- `internal/domain/academics/entity.go`
- `internal/domain/tutor/repository.go`
- `internal/domain/booking/repository.go`
- `internal/domain/payment/repository.go` (extended: GetOrCreate)
- `internal/domain/identity/repository.go` (extended: LogStateChange)
- `internal/cache/redis_real.go`
- `internal/payment/provider.go` (rewritten: Paystack + Flutterwave)
- `internal/repository/uow.go`
- `internal/repository/postgres/{postgres,subject_repo,tutor_repo,programme_repo,booking_repo,order_repo,payment_repo,identity_repo,uow}.go`
- `internal/repository/memory/{memory,booking_memory,uow}.go`
- `internal/service/{audit_service,tutor_service,subject_service,programme_service,cohort_service,booking_service,payment_service,payout_service}.go`
- `internal/service/{booking_service_test,payment_service_test,testhelpers_test}.go`
- `internal/transport/http/{dto,catalogue_handlers,cohort_handler,booking_handler,payment_handler,router}.go`
- `cmd/api/main.go`, `cmd/worker/main.go`, `cmd/migrate/main.go` (rewritten)
- `migrations/000011_booking_escrow.{up,down}.sql`
- `.env.example`
- `internal/config/config.go` (SiteURL added)

### Updated
- `api/openapi.yaml` (Phase 3 contract)
- `.gitignore` (added `*.bundle`)
- `client/package.json`, `client/package-lock.json`
- `client/lib/queryClient.ts`, `client/app/layout.tsx`
- `server/cmd/server/main.go` (tutorsService ordering fix)
- Deleted: stale `*.bundle` files, legacy `client/app/programmes/`

### New frontend
- `client/components/providers.tsx`
- `client/features/bookings/{types.ts,api/create.ts,components/CheckoutClient.tsx}`
- `client/features/cohorts/api/get.ts`
- `client/app/checkout/[cohortId]/page.tsx`

## Environment variables required (new)

`SITE_URL` — canonical site URL used by transport (webhook/redirect contexts).
All others unchanged from Phase 1 (`DATABASE_URL`, `REDIS_URL`, `PAYSTACK_SECRET`,
`FLUTTERWAVE_SECRET`, `NEXT_PUBLIC_API_URL`, …).

## Bundle instructions

The bundle includes the full branch ref (verified from a fresh clone).
**Important (your PowerShell error):** `/path/to/...` in the previous
instructions was a literal placeholder, and the fetch must run from the repo
root — you ran it inside `client/`. Do this instead:

1. Download `ykay-virtual-phase-03.bundle` from the workspace (it is a binary
   file — do not copy/paste it as text).
2. In PowerShell, from the **repo root** (where `.git` lives — NOT `client/`):

```powershell
cd C:\Users\USER\Desktop\PROJECTS\ykay-virtual
git fetch C:\Users\USER\Desktop\PROJECTS\ykay-virtual-phase-03.bundle feature/phase-03-booking-escrow
git checkout feature/phase-03-booking-escrow
```

If you prefer to keep your own branch name:

```powershell
git checkout -b feature/phase-03-booking-escrow FETCH_HEAD
```

3. Then start everything:

```powershell
docker compose up -d postgres redis
go run ./cmd/migrate --cmd=up
go run ./cmd/api          # terminal 1
go run ./cmd/worker       # terminal 2
npm --prefix client install
npm --prefix client run dev   # terminal 3 → http://localhost:3000
```

Or use the Makefile (`make infra`, `make migrate`, `make api`, `make web`).

## Known limitations / next phases

- Live Postgres + Redis integration tests (testcontainers) still need a Docker
  host — verified via memory-backed unit tests + smoke run here.
- Auth middleware/session (httpOnly cookie) is Phase 7 territory; booking
  handlers currently take `parent_user_id` in the body with object-level checks
  in the service layer (student-link + tutor-can-teach) already enforced.
- Real provider payouts (bank transfer API) — the `PayoutProvider` seam is in
  place; wire Paystack transfers in Phase 8 (tutor wallet).
- Checkout UI is single-cohort; private-tuition checkout lands with the tutor
  dashboard (Phase 8).

# NUVORA — Cohort → Enrolment → Payment → Student/Tutor: Production Readiness Audit

Date: 2026-08-23 · Scope: full end-to-end money path, repository-wide review.
Verdict summary at the bottom.

---

## 1. The end-to-end flow (as verified in code)

```
Catalogue (/cohorts, cached 300s)
   └─ Checkout (/checkout/{cohortId})
        └─ POST /bookings  (type=COHORT)
             • authorizeEnrollment: parent-linked learner OR adult self-enrol;
               under-15 minors require a linked guardian ✅
             • Row-locked cohort read (GetByIDForUpdate) → no oversubscription ✅
             • Coupon validation + usage record in the same tx ✅
             • Order (PENDING) + OrderItem + Enrollment (PENDING) + seat++ in ONE tx ✅
             • Idempotency-key replay returns the original order ✅
             • Cart-abandon lead fired for ops follow-up ✅
        └─ POST /payments/initiate
             • YK-010: actor must own the order; auth required ✅
             • Reuses existing PENDING payment (idempotent initiate) ✅
             • Paystack /transaction/initialize → hosted checkout link ✅
        └─ Paystack/Flutterwave hosted page → payer pays
        └─ POST /payments/webhooks/{provider}
             • HMAC signature verified server-side (SHA512/SHA256) ✅
             • UNIQUE provider_reference ⇒ duplicate delivery can't double-charge ✅
             • Amount reconciliation (kobo-normalised) ✅
             • Currency reconciliation ✅  ← ADDED IN THIS PASS
             • Payment SUCCESS + Order PAID + Enrollment CONFIRMED +
               student linked to all upcoming cohort lessons + escrow HELD, one tx ✅
             • Receipt email + WhatsApp confirmation (best-effort) ✅
        └─ Escrow (72h hold) → release (parent confirm or auto-expire cron)
             → Payout PENDING → Paystack transfer (fail-closed until enabled) ✅
Student side: dashboard, LMS course page, lessons, resources, assignments ✅
Tutor side: roster (ListByCohort), earnings Held/Released, bank details, payouts ✅
```

Test evidence: 13 backend packages green (incl. webhook-hardening, escrow,
payout, authz suites), OpenAPI contract test, client typecheck + vitest (34) +
full `next build` all pass.

## 2. Defects found and FIXED in this pass

### 🔴 P1 — Seat leak: abandoned checkouts blocked cohort seats forever
`CreateCohortBooking` increments `enrolled_count` when the PENDING enrollment
is created, but **nothing ever decremented it**. Every visitor who reached
checkout and never paid consumed a seat permanently; a 20-seat cohort could
show "full" with zero paid students, and `CanEnroll()` would reject real buyers.

**Fix (shipped):**
- New cron `expire_stale_pending_enrollments` (worker, 15-min tick + boot
  recovery, Redis leader lock): cancels PENDING enrollments older than 2h whose
  order is still unpaid, cancels the order, releases the seat, writes audit.
- Re-booking after expiry revives the same row (table has
  `UNIQUE(cohort_id, student_profile_id)`) — previously a cancelled learner
  could never enrol again ("already enrolled" conflict).
- Late-webhook race closed: if payment lands after expiry,
  `confirmEnrollment` re-takes the seat and confirms.
- `cancelled_at` now stamped on cancellation (Postgres + memory repos).
- Tests: 5 new service tests cover release, fresh-checkout safety, paid-order
  skip, rebook-revive, late-webhook seat re-take.

### 🔴 P1 — Payer stranded on the gateway after paying
The API validated and *stored* `callback_url` but **never sent it to
Paystack** (`/transaction/initialize` body had no `callback_url`), and the
Flutterwave adapter hardcoded `https://nuvora.com/checkout/verify` — a route
that does not exist. After paying, users were left on the gateway's generic
success page with no route back into the app — the top driver of "I paid but
nothing happened" support tickets.

**Fix (shipped):**
- New `CallbackLinkCreator` capability on both providers; Paystack initialize
  now carries `callback_url`, Flutterwave uses it as `redirect_url`.
- Handler defaults the callback to `/receipts/{orderId}` and resolves it
  against the trusted `SITE_URL` (relative-path-only validation kept — no
  open redirect).
- Checkout client passes `/receipts/{orderId}`; the receipt page now **polls
  every 5s while PENDING** and flips to "✅ Payment confirmed" when the
  webhook settles — the webhook remains the only source of truth.
- Tests: httptest-backed provider tests assert the callback reaches both
  gateway APIs (and kobo conversion).

### 🟠 P2 — Webhook accepted any currency
Amount was reconciled but currency was not: a signed success event for
**1,000 USD** would settle a **1,000 NGN** order (numeric match). Added a
currency guard (mismatch → audit `currency_mismatch`, webhook consumed,
payment stays PENDING) + tests for reject and accept paths.

## 3. What is done well (keep as-is)

- **Money engine**: single-transaction settlement, idempotent webhooks via DB
  unique constraint, escrow with fail-closed refunds (YK-006) and fail-closed
  payouts in production (YK-005), amount normalisation, full audit trail.
- **Authorization**: object-level checks everywhere sampled (order ownership
  YK-010, booking-scoped messaging, profile authorizer, minor gating).
- **Concurrency**: row-locked cohort capacity, idempotency-key replays,
  cron leader election (A-09), SKIP LOCKED sweeps.
- **Ops**: Prometheus cron heartbeats, dead-letter queue, DR runbook,
  payments runbook with the ₦1,000 live-loop drill, env fail-closed boot.
- **Testing culture**: contract test locks router ↔ OpenAPI; webhook
  hardening suite; 59 migrations with up/down pairs.

## 4. What's left / should be added (not blockers for the cohort loop)

| Priority | Item | Notes |
|---|---|---|
| ~~P2~~ ✅ | ~~Private-tuition E2E purchase journey~~ | DONE (2026-08-23): self-serve flow (tutor profile → package → pay) hardened — request is born MATCHED to the chosen tutor, payer returns to the in-app receipt after the gateway. |
| ~~P2~~ ✅ | ~~Gateway refunds~~ | DONE (2026-08-23): refund flow certified — state checks before the gateway call (double-refund + refund-after-payout blocked), partial dispute refunds hit the gateway too, reconciliation logging; enable with `PAYMENT_REFUNDS_ENABLED=true` after the refund drill. |
| ~~P2~~ ✅ | ~~Lesson double-booking guard (FR-10)~~ | Verified already fully implemented (`HasOverlappingLessons` in ScheduleLesson + postgres/memory + tests) — GAP_ANALYSIS was stale. |
| ~~P3~~ ✅ | ~~MFA for admin accounts~~ | Verified already fully enforced in code (`requiresMFA` for all admin roles + emailed second factor + frontend flow) — GAP_ANALYSIS was stale. |
| ~~P3~~ ✅ | ~~Enrolment windows (FR-25)~~ | DONE (2026-08-23): migration 000060 adds optional `enrollment_opens_at/closes_at`; server gate + checkout UI + admin form; enrolment always closes at `end_date`. |
| ~~P3~~ ✅ | ~~Reschedule/cancellation self-service (FR-23)~~ | DONE (2026-08-23): `POST /lessons/{id}/reschedule` + `/cancel` (tutor own lesson or admin, double-booking guarded, COMPLETED/CANCELLED immutable) + tutor console UI; cancelled lessons free the calendar slot. |
| ~~P3~~ ✅ | ~~Upload malware scanning~~ | DONE (2026-08-23): scanner (signatures + zip-bomb + fail-closed ClamAV via `CLAMAV_ADDR`) already existed but only covered avatars — now every upload through UploadGuard is scanned BEFORE storing, fail-closed. |
| P3 | Recorded-lesson library & transcripts | Future virtual-school phase (already in the roadmap docs). |
| ~~P3~~ ✅ | ~~Payment-abandon nudge~~ | DONE (2026-08-23): `send_payment_nudges` worker cron — one WhatsApp per stalled checkout (45 min–24 h), lead flips NEW→CONTACTED, never double-sends. **2026-08-24: email fallback** — leads WhatsApp can't reach (no phone/user, or a send failure) get one branded email instead (`RESEND_API_KEY`/`SMTP_*` on the worker); channel recorded in the lead audit trail. |

## 5. Production-readiness verdict — cohort → enrolment → payment → student/tutor

**GO — production ready**, with the two P1 fixes in this commit deployed and
the following runbook items confirmed live (all documented in
`docs/PAYMENTS_RUNBOOK.md`):

- [ ] `PAYSTACK_SECRET=sk_live_…` on the API + worker; webhook URL set to
      `/api/v1/payments/webhooks/paystack` in the Paystack dashboard.
- [ ] `SITE_URL` set (the post-payment redirect now depends on it).
- [ ] Worker deployed alongside the API (the new seat-release cron runs there)
      with Redis available for leader election.
- [ ] `PAYSTACK_TRANSFER_ENABLED=true` only when tutor payouts should really move money.
- [ ] Run the ₦1,000 live loop once end-to-end (enrol → pay → escrow → release
      → transfer) per the runbook before announcing.

Invariants verified by the test suite after the changes:
- A seat is held only while a checkout is live (≤2h) or paid — never leaked.
- No duplicate charge on duplicate webhook delivery; wrong amount **or wrong
  currency** never settles an order.
- The payer always lands back on an in-app receipt that reflects the
  webhook-confirmed truth.

---

## Frictionless-flow pass (2026-08-24)

Wait-time / dead-end fixes layered on top of the payment-safety work:

| # | Fix | Where |
|---|---|---|
| F-2 | Logged-out visitor at `/cohorts/{id}/enroll` gets a **sign-in/register step with a return trip back to checkout** (was: empty learner select + forever-disabled Pay button) | `client/features/bookings/components/CheckoutClient.tsx` |
| F-3 | **`POST /me/orders/{orderId}/verify`** — server asks Paystack/Flutterwave to confirm the transaction and settles through the *same* path as the webhook (`settleSuccessInUOW`). The web receipt auto-verifies on landing and offers "Confirm payment now"; checkout's payment-link card auto-checks 6s after return. A lost webhook can no longer strand a paid seat. | `internal/payment/provider.go`, `internal/service/payment_service.go`, `internal/transport/http/payment_handler.go` |
| F-4a | **gzip** on compressible API responses (3–6× smaller JSON on mobile data; images excluded, tiny bodies excluded, `Vary: Accept-Encoding`) | `internal/middleware/gzip.go` |
| F-4b | **60s anonymous browser cache + 5min stale-while-revalidate** on public catalogue GETs (cohorts list/detail, tutors search, programmes) — authenticated requests are never cached | `internal/middleware/public_cache.go`, router |
| F-5 | Home page hero PNG **2.56 MB → 104 KB JPEG** served via `next/image` (was the single biggest first-load cost) | `client/public/hero/african-student.jpg` |
| F-6 | SEO metadata for the 7 naked routes (pricing, contact, 5 become-tutor steps) via server layouts | `client/app/(marketing)/**/layout.tsx` |
| F-7 | Optional privacy-friendly analytics (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`; inert when unset) | `client/components/layout/Analytics.tsx` |

New env vars: **none required**. Optional: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
(web analytics), `EXPO_PUBLIC_SITE_URL` (mobile → web checkout origin).

Verify-path invariants (all test-covered in `payment_verify_test.go`):
- Idempotent: non-PENDING order → no gateway call; SUCCESS payment → no re-settle.
- Owner/admin only (`ErrForbidden` otherwise; anonymous rejected outright).
- Amount **and** currency reconciliation identical to the webhook guards.
- Gateway "pending"/"failed" is a truthful no-op — never an error, never a settle.
- Unconfigured gateway secrets can NEVER report success (dev/e2e stubs return pending).

## Realtime layer — Phase 5b (2026-08-24)

Chat/notification latency drops from the next poll tick (was 10–15 s) to
instant: `GET /api/v1/me/events` streams per-user **poke events**
(`message.new`, `notification.new`) over SSE; clients invalidate their
TanStack caches and refetch through the normal REST endpoints — realtime
never carries data, so there is exactly one source of truth.

| Piece | Where |
|---|---|
| Broker (per-instance hub + optional Redis pub/sub cross-instance fan-out) | `internal/realtime/broker.go` |
| Publish point (recipient + sender's other tabs) | `internal/service/messaging_service.go` `SendMessage` |
| SSE endpoint (25 s heartbeats, ~9 min recycle, session auth) | `internal/transport/http/events_handler.go` |
| Client (one EventSource per signed-in tab; auto-reconnect; poll fallback 30–45 s) | `client/hooks/useRealtimeEvents.ts`, `RealtimeBridge` |
| gzip exclusion for `text/event-stream` | `internal/middleware/gzip.go` |

Invariants (test-covered):
- Events never cross users (recipient-scoped hub, verified in broker + handler tests).
- A slow subscriber can never block a publisher (non-blocking sends, drop-oldest).
- Without Redis the hub is local-only — everything still works, polling covers other instances.
- `realtime = nil` ⇒ the service behaves exactly as before (notification rows unchanged).
- SSE is never gzipped/buffered; heartbeats keep proxies from idling the stream.

Ops notes: no new env vars — the broker reuses the existing `REDIS_URL`
connection. With Redis, events fan out across ALL API instances; without it,
events reach only streams on the instance that handled the send (Render
single instance = full effect either way).

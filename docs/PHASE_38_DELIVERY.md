# PHASE 38 — All P1s: admin payments UI, tutor earnings, Google OAuth flow, notifications, private booking, LMS charts — DELIVERY

Branch: `feature/phase-38-p1-complete`
Base: `main` @ `65e3a34` (phase 37)
Delivery method: git bundle `ykay-virtual-phase-38.bundle`

---

## 1. Admin payments / refunds / payouts UI
- **Backend**: `OrderRepository.ListAll` (memory + postgres) →
  **`GET /admin/orders`** (paginated); **`GET /admin/payouts`**;
  **`POST /admin/orders/{id}/refund`** → `PaymentService.RefundOrder`
  (finds escrow holds by order → `refundEscrowInUOW` (shared core with
  RefundEscrow) → wallet credit → order REFUNDED, idempotent 409 on repeat).
- **UI `/admin/payments`**: orders table (status badges, amounts, pagination)
  with **Confirm payment** (PENDING) and **Refund modal with reason**
  (PAID); payouts table. Linked from the admin hub. Student access → 403.

## 2. Tutor earnings & payouts
- `/lms/tutor` gains **Earnings & payouts** section: held / released /
  paid-out ₦ totals + payout history (from `/me/earnings`), with
  escrow-protected messaging.

## 3. Google OAuth — production-ready flow (cookie-domain bug fixed)
- **`POST /auth/google/exchange {code,state}`** (rate-limited) returns
  `{token, user}` server-to-server.
- **Next route `/auth/google/callback`** (route.ts): exchanges with the API,
  sets the `ykay_session` httpOnly cookie **on the app host** (the old
  API-callback flow set it for the API host → broken in the browser),
  redirects to `/dashboard` (or `/onboarding` for fresh accounts).
- **`/auth/google/error`** — friendly error page (denied/misconfigured/
  state mismatch) with setup hints for site owners.
- Config default `GOOGLE_REDIRECT_URL` → `http://localhost:3100/auth/google/callback`.
- Real client credentials remain deployment env (GOOGLE_CLIENT_ID/SECRET);
  flow verified live: 307 on invalid code → error page; 409 when unconfigured.

## 4. Notifications — real session user
- `/notifications` replaced the hardcoded dev user id with the session
  user; mark-read / mark-all / 30s polling retained. Guarded (307 → login).

## 5. Private-tuition booking UI
- `PrivateBookingForm` on tutor pages (`/tutors/[slug]`): subject (from the
  tutor's list), learner (from `/me/learners`), sessions, duration, price
  per session, goals → `createPrivateBooking` → escrow payment link with
  copy + gateway CTA. Logged-out users get a login CTA. The lead-capture
  wizard on `/private-tuition` remains for managed matching.

## 6. Progress charts on LMS
- Student course page adds three CSS/SVG charts: **attendance per lesson**
  (green/amber/grey), **quiz pass-rate gauge** (+ count), **tutor report
  ratings** (★ bars).

## Also fixed en route
- **`RelatedContent` crash** on every tutor page: the related endpoint
  serializes Go structs as `Profile.*` (untagged) — component now
  normalizes both shapes (this was a live 500 on `/tutors/[slug]`).
- **Global rate limit 100 → 300 req/min** (the E2E suite + real users were
  tripping 100/min; auth endpoints stay 40/min).
- E2E now runs on a guaranteed-fresh API instance (stale-exhausted reuse
  caused phantom 429s).

## Tests
- E2E grew **128 → 139**: admin orders meta, payouts, cohort booking +
  captured order, confirm-payment, refund, student→403, tutor earnings
  fields, google exchange unconfigured→409.

## Verification
```text
gofmt / go build / go vet     PASS
go test ./...                 PASS
tsc --noEmit                  PASS
next build                    PASS
scripts/e2e.sh                139 passed · 0 failed
Live: /tutors/oluwatobi 200 (+ booking form) · /auth/google/error 200 ·
  /auth/google/callback 307 · /admin/payments 200 (admin) ·
  /notifications 200 · LMS course charts + tutor earnings in bundles ·
  /me/earnings 200
```

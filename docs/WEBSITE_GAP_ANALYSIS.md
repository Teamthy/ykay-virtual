# NUVORA Website — What's Left to Build (gap analysis, Aug 2026)

Honest, ranked view of the public web app against a production tutoring
marketplace. Everything not listed here is considered **shipped and working**
(home, programmes, cohorts, checkout flow, tutors, dashboards, LMS, chat,
admin, PWA, onboarding, auth, blog, marketing pages, legal pages as of
phase 36).

Legend: 🔴 launch blocker · 🟠 should-have · 🟢 nice-to-have

---

## 🔴 P0 — ✅ DONE in phase 37

1. **Account & settings hub** (`/account`) — ✅
   - Profile (first/last name, phone, timezone — new profile fields on the
     user record, migration 000023), change password, push-device manager,
     email preferences, **data export** (JSON, GDPR/NDPR export right) and
     **account deletion** (soft-delete + session revoke + device purge,
     "type DELETE to confirm"). Backend: `PUT /auth/me/profile`,
     `GET /auth/me/export`, `POST /auth/me/delete` + AccountService.
   - Linked from parent/student/tutor dashboards.

2. **Parent dashboard — per-child progress** — ✅
   - Progress section now shows **real progress reports** per selected
     learner (strengths/weaknesses/recommendations/rating) alongside the
     attendance summary (was a placeholder).

3. **Site-wide search** (`/search`) — ✅
   - Free-text tutor search added to the backend (`q` on `/tutors/search`,
     ILIKE on display_name/headline/bio + mock filter); `/search` page
     groups **Tutors / Programmes / Subjects** with counts and result tabs;
     header search now routes here.

4. **Payment round-trip on checkout** — ✅ (web UX)
   - Checkout now **polls the order** after opening the gateway (every 6s)
     and shows a green "Payment confirmed — seat secured" state when the
     webhook flips the order to PAID, plus a "waiting for confirmation"
     counter. Payment gateway link flow + escrow copy retained.
   - Note: end-to-end with **live Paystack keys** still requires the
     merchant's test/live keys (backend webhook + escrow already e2e-tested).

## 🟠 P1 — ✅ DONE in phase 38

5. **Admin payments/refunds/payouts UI** — ✅
   - `/admin/payments`: orders table (pagination), **confirm payment**,
     **refund with reason** (escrow → wallet → order REFUNDED via new
     `POST /admin/orders/{id}/refund`), payouts table. Backend:
     `GET /admin/orders` (ListAll), `GET /admin/payouts`, PaymentService
     `RefundOrder`.

6. **Tutor earnings & payouts** — ✅
   - `/lms/tutor` earnings section: held / released / paid-out totals +
     payout history (from `/me/earnings`), escrow-protected messaging.

7. **Google OAuth production flow** — ✅
   - New `POST /auth/google/exchange` returns the raw token; **Next route
     `/auth/google/callback`** exchanges server-side and sets the session
     cookie on the APP host (fixes the cookie-domain bug), redirects to
     dashboard/onboarding; friendly **`/auth/google/error`** page. Config
     default redirect now `http://localhost:3100/auth/google/callback`.
     Real creds remain env/deploy (GOOGLE_CLIENT_ID/SECRET).

8. **Notifications for the real session user** — ✅
   - `/notifications` now uses the session user (was a hardcoded dev id),
     keeps mark-read/read-all + polling.

9. **Private-tuition booking UI** — ✅
   - `PrivateBookingForm` on tutor pages: subject/learner/sessions/duration/
     price/goals → `createPrivateBooking` → escrow payment link. (Lead
     wizard on /private-tuition kept for managed matching.)

10. **Progress charts on LMS** — ✅
    - Course page charts: per-lesson attendance bars, quiz pass-rate gauge,
      tutor report ratings — CSS/SVG, no chart dependency.

Also fixed en route: `RelatedContent` crashed on tutor pages (the related
endpoint serializes Go structs as `Profile.*` — normalized both shapes);
global rate limit raised 100→300 req/min (suite + real-user headroom).

## 🟢 P2 — polish & scale

11. **Wishlist / saved tutors** — add for retargeting.
12. **Referral program UI** — API exists (`/referrals`); add invite link +
    reward copy on dashboards.
13. **i18n (French/Pidgin) + RTL** — language pill is decorative today.
14. **Dark mode** — tokens exist; add toggle + persistence.
15. **SEO content scaling** — more programme/curriculum landing pages,
    programme FAQs, tutor-verification badge schema markup.
16. **Accessibility audit** — automated axe CI + manual pass (ARIA on
    interactive components, contrast checks).
17. **Performance budgets** — Core Web Vitals CI (Lighthouse job exists in
    CI; tune budgets + images).
18. **Cookie consent banner** — now that cookies are disclosed in the
    privacy policy, add the consent UI (CMP-lite).
19. **Sitemap/robots expansion** — sitemap exists; add blog + tutors +
    cohorts entries dynamically (they are; verify coverage).
20. **Offline-first LMS** — cache course pages via the service worker for
    offline note-taking.

## Cross-cutting (applies to all above)

- **Session-aware UI everywhere** — several pages hardcode a dev user
  (student `…0001`, tutor `…0102`); switch to real session user + role
  (backend already supports it via `/auth/me`).
- **Data export & deletion UX** — privacy policy promises it; expose
  "export my data" and "delete account" in `/account`.

## Already strong (keep)

Onboarding (7-step stateful), LMS student+tutor, AI chatbot + agent inbox,
PWA (manifest/SW/install), admin vetting+cohorts+support, payments backend
(escrow/webhooks/analytics), security hardening (no auth bridge, CORS
fail-closed, rate limits, prod config validation), 117-pass E2E suite,
prompt evals, CSAT reporting.

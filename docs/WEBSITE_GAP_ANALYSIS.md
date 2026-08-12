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

## 🟠 P1 — high value

5. **Payment/admin operations UI**
   - Admin: payments list, manual payment confirmation, **refunds**,
     **payouts to tutors**, escrow holds. Backend + e2e exist; UI doesn't
     (`/admin` has analytics/vetting/cohorts/lessons/support/reviews/blog/
     referrals/institutions/chat).

6. **Tutor earnings & payout dashboard**
   - Tutor sees lessons/availability today; add escrow balance, payout
     history, withdraw flow (API: `/me/earnings`, payouts).

7. **Real Google sign-in + OAuth error surfacing**
   - Flow is built; needs the production Google client credentials and a
     nice callback error page (not a JSON blob).

8. **Notifications UX**
   - `/notifications` works for a dev user; wire the real session user,
     mark-as-read, push consent, and in-app badge counts.

9. **Booking → lesson lifecycle for private tuition**
   - Cohort flow is complete; 1:1 private tuition booking (availability →
     request → confirmation → payment) needs its web UI (API exists:
     availability, private packages).

10. **Progress visualisation for parents/students**
    - Charts for quiz/attendance/progress-report trends on `/lms` course
      pages (CSAT-style SVG bars are already used in admin — reuse pattern).

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

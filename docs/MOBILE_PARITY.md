# YK-Virtual Web ↔ Mobile Feature Parity

> Scope: which web features exist on mobile, which are mobile-only, which are
> intentionally web-only, and the roadmap to close remaining gaps.
> Updated 2026-08-24 (mobile SDK 54, backend 000060; commerce deep-link pass).

## Principles

- **Every learner/tutor/parent core flow ships on both platforms.** Mobile is
  a first-class client, not a viewer of the web app.
- **Admin operations are desktop-first.** The admin console (cohort creation,
  payouts approval, vetting review, leads follow-up) is a dense, table-heavy
  workspace designed for a monitor; it stays on the web. Mobile admin users
  still log in and get the same friendly "use the web for admin work" MFA
  notice.
- Parity items marked **DONE** are live on mobile; **ROADMAP** are planned.

## Matrix

| Area                                                                                                 | Web                       | Mobile                                                                                                                                                | Status                     |
| ---------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Register / onboarding (parent, student, tutor, institution)                                          | ✅                        | ✅ 4-step compact                                                                                                                                     | DONE                       |
| Login (password, login-code, Google)                                                                 | ✅                        | ✅ password + code                                                                                                                                    | DONE                       |
| Admin MFA email code                                                                                 | ✅                        | ⚠️ friendly redirect to web                                                                                                                           | DONE (documented)          |
| Home dashboard — command center (header → primary card → metrics → quick actions → activity → tools) | ✅                        | ✅ role-aware rebuild per docs/MOBILE_DASHBOARD_DIRECTION.md                                                                                          | DONE                       |
| **Unified dashboard shell** (one layout for all roles)                                               | ✅ AppShell               | ✅ TabLayout + TabBar on Home/LMS/Tutor/Account/Search                                                                                                | DONE                       |
| Learner LMS (courses, lessons, videos, assignments, quizzes)                                         | ✅                        | ✅ role-aware LMS hub + course screens                                                                                                                | DONE                       |
| Tutor workspace (earnings, schedule, lessons, messages, availability, profile)                       | ✅                        | ✅ tutor/* screens + exams console                                                                                                                    | DONE                       |
| **CBT practice exams (student)**                                                                     | ✅ assessments            | ✅ NEW `practice` hub + timed player + marked-paper review                                                                                            | DONE (new)                 |
| **Tutor-authored school exams**                                                                      | ✅ assessments            | ✅ NEW `tutor/exams` console (builder, results, delete)                                                                                               | DONE (new)                 |
| Payments: orders, receipts, Paystack checkout                                                        | ✅                        | ✅ payments + order detail + receipt; cohort detail deep-links "Enrol on web" to the browser checkout (escrow/coupons/gateway return all live on web) | DONE (deep-link)           |
| Escrow / refunds / disputes                                                                          | ✅                        | ✅ order detail surfaces status                                                                                                                       | DONE                       |
| Tutor payouts + bank details                                                                         | ✅                        | ✅ via tutor earnings/profile (bank details entry on web)                                                                                             | PARTIAL                    |
| Messaging (contacts, threads, unread)                                                                | ✅                        | ✅ messages + tutor/messages                                                                                                                          | DONE                       |
| Chat widget (AI + human handoff)                                                                     | ✅                        | ✅ chat screen                                                                                                                                        | DONE                       |
| Notifications hub + devices                                                                          | ✅                        | ✅ notifications + devices                                                                                                                            | DONE                       |
| Leads funnel (exit intent, cart abandon, WhatsApp)                                                   | ✅ web-only (browsing UX) | n/a — mobile funnels into app                                                                                                                         | WEB-ONLY (by design)       |
| Admin console (overview, cohorts, programmes, tutors, vetting, leads, payouts, exports)              | ✅                        | ✅ read-only ops overview (escrow hero, queues, today's classes, audit); mutations stay web                                                           | PARTIAL (mobile read-only) |
| Exam prep marketing pages (WAEC/NECO/JAMB/IGCSE)                                                     | ✅                        | ✅ exam-prep + subject pages                                                                                                                          | DONE                       |
| Programme pages + enrolment                                                                          | ✅                        | ✅ programmes/[slug]                                                                                                                                  | DONE                       |
| Tutor search, profiles, reviews, saved                                                               | ✅                        | ✅ search/subjects/tutors/saved                                                                                                                       | DONE                       |
| Referrals                                                                                            | ✅                        | ✅ referrals screen                                                                                                                                   | DONE                       |
| Certificates                                                                                         | ✅                        | ✅ via LMS progress                                                                                                                                   | DONE                       |
| Parent learner management (link, progress, approvals)                                                | ✅ parent dashboard       | ✅ learners + progress screens                                                                                                                        | DONE                       |
| Progress reports + attendance                                                                        | ✅                        | ✅ progress + learning-progress                                                                                                                       | DONE                       |
| Dark mode                                                                                            | ✅ (class strategy)       | ✅ ThemeProvider: light/dark/system + header toggle + theme sweep across every screen                                                                 | DONE (new)                 |
| Brand system (tokens, fonts, logo)                                                                   | ✅                        | ✅ same tokens, Anton + DM Sans, web mark                                                                                                             | DONE                       |
| Offline banner / updates banner                                                                      | ✅                        | ✅ UpdateBanner + offline screen                                                                                                                      | DONE                       |
| Onboarding carousel                                                                                  | ✅ marketing              | ✅ 3 singular pages (no swipe carousel)                                                                                                               | DONE                       |
| Responsiveness                                                                                       | ✅ responsive web         | ✅ content capped 560pt, centred, safe-area aware, tablet-consistent                                                                                  | DONE                       |

## Mobile-only

- Push notification registration (dev builds) + deep links from notifications.
- SecureStore bearer-token session (vs web httpOnly cookies).

## Roadmap

Nothing blocking. Nice-to-haves: EAS build for iOS (requires an Apple
account, $99/yr), push notifications on a dev build (Expo Go can't receive
push), and a web admin console on tablet layouts.

Closed (2026-08-21): bank details on mobile + **bank-list picker with
Paystack account-name resolution**, admin read-only overview, parent learner
switcher, **Google sign-in on mobile** (WebView OAuth via
/auth/google/callback-mobile), **dynamic-type scaling** (OS font scale,
capped 1.4×), **Google Drive material links** (normalised server-side,
one-tap open in the course player), **OTA updates via EAS Update + CI**
(.github/workflows/mobile-release.yml — users never re-download for JS
changes), and the **infrastructure plan** (docs/INFRASTRUCTURE_PLAN.md:
Oracle Always Free + Cloudflare + GitHub Releases/R2 APK hosting, ₦6–8k
total for the domain).

## Dark-mode coverage

- Core chrome is fully dark-aware: Screen, Card, AppText, AppInput, Button,
  TabBar, ScreenHeader, Loader/Skeleton/Empty/Error/Success states, BrandLogo.
- Fully themed screens: index/onboarding pages, login, home, LMS, account
  (+ theme toggle), tutor dashboard, practice suite, tutor exams console.
- Remaining screens inherit themed surfaces/text via the kit; their inline
  colour accents get the same pass in the next parity batch.

## Session behaviour (fixed this batch)

- Mobile no longer self-logs-out: a 401 only clears the session + routes to
  login when the request actually carried a token. Signed-out browsing of
  public screens can never wipe a session (it has none) nor bounce a signed-in
  user. Sessions last 30 days (backend `SessionTTL`).

## Roadmap deltas (2026-08-24 friction pass)

- **Commerce deep-link (DONE)** — cohort detail now carries an "Enrol on web —
  pay securely" button (`Linking.openURL` → `SITE_URL/cohorts/{id}/enroll`).
  `EXPO_PUBLIC_SITE_URL` overrides the web origin per environment.
- **Lesson reschedule/cancel (FR-23, DONE 2026-08-25)** — tutor lessons screen reschedules/cancels inline. (Historical: the tutor web
  console can reschedule/cancel lessons (`POST /lessons/{id}/reschedule|cancel`).
  console shipped it first; mobile caught up in the CI/CD + design-audit pass —
  see docs/MOBILE_DESIGN_AUDIT_2026-08.md.)
- **Payment verify (server-side)** — `POST /me/orders/{id}/verify` settles a
  paid order without waiting for the webhook. The web receipt auto-verifies on
  landing; mobile order detail can adopt the same call.

- **Realtime events (2026-08-24, web-first)** — `GET /api/v1/me/events` SSE
  stream live on web (message/notification pokes; Redis pub/sub fan-out).
  Mobile messages screens still refresh on focus; an EventSource polyfill
  (react-native-sse) can adopt the same endpoint in a later batch.

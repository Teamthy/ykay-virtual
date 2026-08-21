# NUVORA Web ↔ Mobile Feature Parity

> Scope: which web features exist on mobile, which are mobile-only, which are
> intentionally web-only, and the roadmap to close remaining gaps.
> Updated 2026-08-21 (mobile SDK 54, backend 000059).

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

| Area | Web | Mobile | Status |
|---|---|---|---|
| Register / onboarding (parent, student, tutor, institution) | ✅ | ✅ 4-step compact | DONE |
| Login (password, login-code, Google) | ✅ | ✅ password + code | DONE |
| Admin MFA email code | ✅ | ⚠️ friendly redirect to web | DONE (documented) |
| Home dashboard — command center (header → primary card → metrics → quick actions → activity → tools) | ✅ | ✅ role-aware rebuild per docs/MOBILE_DASHBOARD_DIRECTION.md | DONE |
| **Unified dashboard shell** (one layout for all roles) | ✅ AppShell | ✅ TabLayout + TabBar on Home/LMS/Tutor/Account/Search | DONE |
| Learner LMS (courses, lessons, videos, assignments, quizzes) | ✅ | ✅ role-aware LMS hub + course screens | DONE |
| Tutor workspace (earnings, schedule, lessons, messages, availability, profile) | ✅ | ✅ tutor/* screens + exams console | DONE |
| **CBT practice exams (student)** | ✅ assessments | ✅ NEW `practice` hub + timed player + marked-paper review | DONE (new) |
| **Tutor-authored school exams** | ✅ assessments | ✅ NEW `tutor/exams` console (builder, results, delete) | DONE (new) |
| Payments: orders, receipts, Paystack checkout | ✅ | ✅ payments + order detail + receipt | DONE |
| Escrow / refunds / disputes | ✅ | ✅ order detail surfaces status | DONE |
| Tutor payouts + bank details | ✅ | ✅ via tutor earnings/profile (bank details entry on web) | PARTIAL |
| Messaging (contacts, threads, unread) | ✅ | ✅ messages + tutor/messages | DONE |
| Chat widget (AI + human handoff) | ✅ | ✅ chat screen | DONE |
| Notifications hub + devices | ✅ | ✅ notifications + devices | DONE |
| Leads funnel (exit intent, cart abandon, WhatsApp) | ✅ web-only (browsing UX) | n/a — mobile funnels into app | WEB-ONLY (by design) |
| Admin console (overview, cohorts, programmes, tutors, vetting, leads, payouts, exports) | ✅ | ✅ read-only ops overview (escrow hero, queues, today's classes, audit); mutations stay web | PARTIAL (mobile read-only) |
| Exam prep marketing pages (WAEC/NECO/JAMB/IGCSE) | ✅ | ✅ exam-prep + subject pages | DONE |
| Programme pages + enrolment | ✅ | ✅ programmes/[slug] | DONE |
| Tutor search, profiles, reviews, saved | ✅ | ✅ search/subjects/tutors/saved | DONE |
| Referrals | ✅ | ✅ referrals screen | DONE |
| Certificates | ✅ | ✅ via LMS progress | DONE |
| Parent learner management (link, progress, approvals) | ✅ parent dashboard | ✅ learners + progress screens | DONE |
| Progress reports + attendance | ✅ | ✅ progress + learning-progress | DONE |
| Dark mode | ✅ (class strategy) | ✅ ThemeProvider: light/dark/system + header toggle + theme sweep across every screen | DONE (new) |
| Brand system (tokens, fonts, logo) | ✅ | ✅ same tokens, Anton + DM Sans, web mark | DONE |
| Offline banner / updates banner | ✅ | ✅ UpdateBanner + offline screen | DONE |
| Onboarding carousel | ✅ marketing | ✅ 3 singular pages (no swipe carousel) | DONE |
| Responsiveness | ✅ responsive web | ✅ content capped 560pt, centred, safe-area aware, tablet-consistent | DONE |

## Mobile-only

- Push notification registration (dev builds) + deep links from notifications.
- SecureStore bearer-token session (vs web httpOnly cookies).

## Roadmap (next parity batches)

1. **Google sign-in on mobile** — webview OAuth flow.
2. **Dynamic-type scaling** — respect OS font scale for body text.
3. **Tutor bank-list picker** — resolve account name from the bank code
   (currently manual entry; backend contract identical).

Closed this batch: **bank details on mobile** (DONE — `tutor/bank` screen,
POST /tutors/me/vetting/profiles/{id}/bank), **admin read-only overview**
(DONE — `/admin` console), **parent learner switcher** (DONE — pin a child;
lessons/progress/LMS/attendance all filter via `student_profile_id`).

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

# YK-Virtual / Ykay Virtual — End-to-End Repository Audit

**Audited:** 14 August 2026
**Repository:** `Teamthy/ykay-virtual` (`main`, commit `fa5c8fa`)
**Scope:** product intent, implementation coverage, launch readiness, engineering verification, and remaining work.

## 1. What is being built

Despite the repository name and early documentation referring to **Ykay Virtual School**, the implemented product brand is **YK-Virtual**. It is a Nigeria-first, academically governed online-learning business designed to grow beyond a tutor directory:

- public programme, curriculum, subject, cohort and tutor discovery;
- private tuition and managed tutor matching;
- parent/learner onboarding and bookings;
- payment orders, gateway initiation/webhooks, escrow, refunds and payouts;
- tutor application, document review, staged vetting and competency assessment;
- student, parent, tutor and academic-admin operations portals;
- LMS delivery: lessons, attendance, resources, assignments, quizzes, submissions, grading and progress reports;
- support, booking-scoped messaging, notifications, referrals, reviews and blog/content;
- an AI support assistant with escalation to human agents;
- PWA/web app plus an Expo mobile scaffold.

The central promise remains: **British and Nigerian curricula, exam preparation, private tuition, cohorts and digital-skills learning—with parent visibility and stronger academic governance than a pure marketplace.**

## 2. Architecture understood

| Area            | Current implementation                                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web             | Next.js 14 App Router, TypeScript, Tailwind, React Query/Form, 83 generated routes, PWA shell.                                                           |
| API             | Go modular monolith under `/api/v1`; memory and PostgreSQL repositories; cookie sessions plus bearer tokens for mobile.                                  |
| Data            | PostgreSQL migrations `000001`–`000026`; domains cover identity, academics, tutors/vetting, booking, payments, learning, chat, content and institutions. |
| Commercial core | Orders/payment webhooks use idempotency controls; escrow/payout lifecycle and an admin finance console exist.                                            |
| Operations      | Docker, production compose, migration runner, backup/restore/deploy scripts, Render blueprint and Vercel/Render deployment workflow.                     |
| Quality gates   | Go unit/service tests, HTTP E2E shell suite and CI PG job. Frontend currently has build/typecheck only.                                                  |

The implementation is substantially further along than the early `YKAY_BUILD_PLAN.md`; use recent phase delivery reports and current source as the authoritative status.

## 3. End-to-end journeys that are materially implemented

1. **Family learning journey:** discover catalogue → register/login/onboard → add learner → create cohort booking/private request → pay/confirm → see classes, attendance, resources, assignments and progress.
2. **Tutor journey:** register → create profile → add subject/document → submit → staged admin review/interview/verification/competency → approval → availability, assigned delivery and earnings/payout view.
3. **Academic delivery:** tutor authors resources, assignments and quizzes; learner accesses work, submits and receives auto/manual grading and progress reporting.
4. **Operations journey:** administrator manages vetting, cohorts, lessons, support, reviews, content, analytics, orders, refunds and payout records.
5. **Support journey:** learner/parent chat → AI response or escalation → agent inbox → agent response/closure → rating and CSAT analytics.
6. **Mobile journey:** Expo login/token, onboarding, chat and learner LMS screens are scaffolded and API-backed in part.

## 4. Evidence and verification performed

### Passed locally

- `npm --prefix client ci` completed.
- `npm --prefix client run build` completed successfully: Next.js compiled, typechecked and generated **83 routes**.
- Git working tree was clean immediately after clone.

### Not executable in this environment

- Go is not installed (`go: command not found`), so I could not independently run `go test`, API E2E, migrations or the real-Postgres gate here.
- The project’s latest delivery record reports `go test ./...`, Go build/vet and its E2E suite passing; CI is configured to run the real PostgreSQL E2E gate.

### Dependency/security signal

- `npm ci` reports **7 vulnerabilities: 1 moderate, 5 high, 1 critical**.
- The installed **Next.js 14.2.15** emits a security-vulnerability warning. Treat dependency remediation as a release blocker, not cosmetic maintenance.

## 5. What is missing or not production-ready

### P0 — must close before a real public launch

1. **Remove demo identities and hard-coded production UI identities.**
   - Migration `000019_demo_users.up.sql` inserts public, predictable role accounts with password `password123`, including `admin@ykaycollege.com`.
   - Several live web screens use fixed UUIDs rather than resolving the authenticated user: `/student-dashboard`, `/tutor-dashboard`, `/lms`, tutor LMS, learning components, messages, admin vetting and mobile LMS.
   - Required: move demo seed data to a separately invoked development-only seed; delete it from production migration history or ensure production migration runner skips it; use `/auth/me` and role/profile resolution everywhere; add regression tests that prove one user never sees another user’s data.

2. **Patch the web dependency vulnerabilities.**
   - Upgrade Next.js to a vendor-fixed release, regenerate lockfile, run `npm audit`, build, smoke test and Lighthouse again.
   - Triage all 7 audit findings; do not use blind `npm audit fix --force` without compatibility tests.

3. **Replace placeholder background processing and observability.**
   - `internal/worker/jobs.go` only logs jobs and returns success; there is no durable queue, retry/dead-letter operation, scheduling or real execution.
   - `internal/telemetry/otel.go` is explicitly a placeholder; there is no trace exporter/metric instrumentation/alerting implementation.
   - Required for payments, reminders, notifications, payouts, expiry, backups and incident handling: Redis-backed/durable jobs, idempotent handlers, retry/dead-letter policy, job monitoring, real OpenTelemetry and actionable dashboards/alerts.

4. **Make all real external integrations operational and prove them in staging.**
   - Payment gateway test/live keys and webhook endpoint validation; email/SMS/WhatsApp provider; private object storage with signed URLs and malware-scanning plan; video provider/meeting-link policy; Google OAuth credentials if enabled; Expo credentials/push keys.
   - Run a staging payment webhook duplicate/replay test, refund, payout and notification delivery test. Browser redirect must never be treated as payment proof.

5. **Resolve child-safety and legal operating decisions before enabling real learners.**
   - Decide whether learner accounts are parent-created/approved by age; direct tutor–minor messaging/recording/visibility rules; safeguarding escalation owner and SLA; consent, retention and deletion operation; verified claims/testimonials/assets.
   - Publish final policy text only after business/legal review, and train academic/support staff on the workflow.

### P1 — next implementation tranche

6. **Complete session-aware client integration.** Hard-coded UUIDs make dashboards/LMS/messaging demo-biased and could cause confusing or unsafe cross-account UX even if server authorization blocks it. Centralize `useCurrentUser` / profile resolution and make API calls derive object IDs server-side wherever possible.

7. **Frontend automated tests are absent.** Root `test:web` explicitly says “Vitest not yet configured”; there are no project Vitest/RTL/MSW or Playwright configuration files. Add unit/component tests for auth, onboarding, role navigation, payment status, object-level access state and error states; add browser E2E for the happy path and authorization boundaries.

8. **Test authentic browser workflows, not only shell API E2E.** The existing script is valuable—auth, vetting, assessments, analytics, chat, mobile token, finance—but it relies heavily on seeded UUIDs. Add Playwright journeys with fresh records and cookies, including parent → learner → booking → payment callback/webhook simulation → LMS; tutor vetting; and negative cross-family access.

9. **Review OpenAPI contract coverage.** The API now exposes many operations (admin finance, LMS, chat, account/device endpoints) beyond the early contract. Establish CI that compares registered routes to OpenAPI and require schemas/examples/auth requirements for every public API.

10. **Finish the mobile product deliberately.** The Expo app is a solid scaffold but still uses demo learner IDs in LMS screens. Decide whether the initial release is PWA-only or native; if native, finish real profile/session mapping, deep links, error/loading/offline handling, EAS credentials, device testing and store/privacy submission work.

11. **Implement real content and catalogue operations.** Many marketing pages and tutor identities are seeded/static. Before launch, load approved programmes, cohorts, pricing, tutor profiles, curriculum data, images, FAQs and testimonials with governance/consent; eliminate unsupported competitive claims and placeholder live content.

### P2 — growth and platform maturity

12. **Internationalization is only a lightweight dictionary.** It covers limited navigation/auth text, not full content, locale routes, date/number formats or transactional messages.
13. **Accessibility/performance need independently measured production verification.** CI has Lighthouse configuration, but run it against staging with actual imagery/content and test keyboard/screen-reader/mobile flows. Address real-user CWV after analytics is live.
14. **Academic platform depth remains later scope.** Formal admissions, academic-year/timetable structures, report cards/transcripts, rich gradebook/rubrics, recordings/library, certificates, advanced analytics and compliance/accreditation workflows are not a completed virtual-school release.
15. **Institutional/B2B needs commercial validation.** Entities and lead/admin surface exist; contracts, billing rules, bulk provisioning, data-processing terms and operational fulfilment need a pilot.

## 6. Product/business decisions still required

The existing `docs/open-decisions.md` is stale relative to implementation but its decisions are still decisive:

- Nigeria-only at launch vs international payments/time zones/curricula;
- Paystack vs Flutterwave (and exact refund/settlement/payout rules);
- managed matching vs an open tutor marketplace;
- Zoom/Meet/Teams or another live-class strategy;
- parent/minor account policy and tutor communication/recording policy;
- launch catalogue, prices, cancellation/reschedule/refund terms;
- storage vendor and retention policy; notification providers;
- final public brand/domain: **Ykay Virtual School vs YK-Virtual**. This must be settled before public launch because code, documentation, email copy, domain and legal documents currently mix names.

## 7. Recommended delivery order

1. **Release-security sweep (P0):** Next dependency patch, eliminate demo users/IDs, secret scan, production config review, real authz tests.
2. **Production integrations:** staging infrastructure, database backups/restore drill, object storage, payments/webhooks, email/SMS and monitoring/alerts.
3. **Identity-aware UX + browser E2E:** replace every fixed ID; add Playwright/Vitest; run a pilot with real roles.
4. **Operations and safeguarding readiness:** policies, staff runbooks, incident/escalation drills, consent-cleared catalogue and verified marketing claims.
5. **Pilot one narrow offering:** e.g., a limited Nigerian/IGCSE cohort plus private tuition; operate manually with metrics before expanding catalogue/geography.
6. **Scale-out:** durable workers, advanced school/LMS features, native mobile release and B2B after the pilot validates commercial operations.

## 8. Bottom-line verdict

This is **not an empty scaffold**. It is a broad, credible, late-MVP learning marketplace/LMS with unusually strong implemented coverage for vetting, payments, learning, chat and operational surfaces. The main risk is that it can look more “done” than it is: demo users/UUIDs remain embedded in client flows, background jobs and telemetry are placeholders, live providers have not been proven here, and frontend test coverage is missing.

**Recommendation:** do not call it production-ready yet. Run a constrained, invitation-only pilot only after the P0 list is closed and a staging environment proves the full payment-to-lesson-to-progress workflow with real identities and operational staff.

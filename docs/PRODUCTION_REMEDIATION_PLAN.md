# YK-Virtual — Production Remediation & Launch Plan

**Prepared:** 14 August 2026
**Decisions confirmed:** Public brand = **YK-Virtual** · persistent demo accounts = **none** · approach = plan before implementation.

> This is the execution backlog for closing every finding in `REPOSITORY_AUDIT_2026-08-14.md`. It deliberately separates **code completion**, **operational readiness** and **business/safeguarding decisions**. A production launch requires all three.

## Target release definition

YK-Virtual is ready for a controlled commercial pilot only when a real parent can: discover a real offering; create/verify an account; add a learner; enrol or request tuition; complete a verified payment; receive a scheduled lesson; attend; see attendance, work and progress; and receive support—while a verified tutor and admin can securely perform their tasks without seeded identities, hard-coded IDs, direct database edits or unmonitored manual recovery.

---

## Workstreams and release gates

| Gate | Outcome                                 | Blocks pilot? | Primary evidence                                                           |
| ---- | --------------------------------------- | ------------: | -------------------------------------------------------------------------- |
| G0   | Brand and production-data hygiene       |           Yes | no Ykay user-facing copy; no demo migrations/accounts; clean production DB |
| G1   | Identity-aware web/mobile authorization |           Yes | all client IDs from session; cross-account browser/API tests pass          |
| G2   | Dependency/security baseline            |           Yes | vulnerability triage/remediation; security checks and release config pass  |
| G3   | Durable operations                      |           Yes | real job queue, telemetry, alerting, backups and recovery drill            |
| G4   | Live-provider staging proof             |           Yes | verified gateway/webhook, notifications, storage, video workflow           |
| G5   | Safeguarding/legal/content readiness    |           Yes | approved policies, operating owners, consent-cleared catalogue/content     |
| G6   | Pilot quality validation                |           Yes | browser E2E, accessibility/performance, real-role pilot sign-off           |
| G7   | Post-pilot scale                        |            No | advanced LMS, mobile-store release, B2B maturity, internationalization     |

---

# G0 — Brand and production-data hygiene

## G0.1 Standardize public brand on YK-Virtual

**Scope**

- Search source, deployment files, email templates, docs, metadata, app manifests, mobile app, API strings and generated assets for `YKAY`, `Ykay`, `ykay-virtual` where the string is user-facing or operationally branded.
- Update public title/description, OpenGraph, email sender names, legal pages, mobile app display name/package identifiers where approved, deployment/project naming and screenshots/runbooks.
- Retain historical repository/module identifiers only where changing them has compatibility cost; document their technical-only status.

**Acceptance criteria**

- A case-insensitive user-facing text search has no Ykay references except explicitly marked historical documentation.
- Home page, emails, PWA manifest, mobile display name, policies and deployment guide consistently say YK-Virtual.
- Brand assets and domain names are confirmed by business owner before changing immutable mobile identifiers or external OAuth settings.

**Decision owner:** Founder/brand owner.
**Dependency:** final domain, legal entity and sender domain.

## G0.2 Eliminate persistent demo accounts and static production seed data

**Scope**

- Remove migration `000019_demo_users` from the production migration chain using a safe forward migration/release procedure; do not rewrite migration history once any shared environment has applied it without an agreed reset/migration strategy.
- Add a non-production **test fixture factory** used only by E2E tests; each test run creates random unique users, tutors, learners, programmes and cohorts and cleans them up or uses an isolated database.
- Remove any API boot-time demo seeding from `cmd/api` except behind explicit `ENVIRONMENT=development` and `SEED_DEMO_DATA=true`; default must be false.
- Add startup validation which refuses demo credentials/data in production.
- Add a runbook for safely removing legacy demo users from staging/production and revoking all their sessions/devices/tokens.

**Acceptance criteria**

- Fresh production migration yields zero pre-created people, passwords, profiles, orders or enrolments.
- API production startup fails if a demo-seed flag is enabled.
- E2E has no fixed participant identity constants and passes against an empty real PostgreSQL database.
- A query/assertion in the release gate proves known demo emails and UUIDs are absent.

**Security note:** treat historical demo credentials as compromised. Remove rows, revoke sessions and rotate any secrets that might have been used in a shared environment.

---

# G1 — Session-aware UX and object-level authorization

## G1.1 Create a canonical current-session model

**Scope**

- Establish a typed `CurrentUser`/`SessionContext` endpoint contract based on `/auth/me` that returns user, roles and the role-specific profile identifiers legitimately available to the session.
- Add a server/client session provider/hook, loading/error/unauthenticated states and role-aware redirect helper.
- Make server APIs infer `parent_user_id`, sender identity and actor identity from the authenticated session; do not accept trust-sensitive caller IDs from browser request bodies where avoidable.
- Define the canonical selection model for multi-learner parents and multi-role users.

**Acceptance criteria**

- No screen needs a hard-coded user, learner, tutor or admin UUID.
- A parent’s selected learner is a linked learner returned by the session/API—not URL tampering or client storage alone.
- APIs reject a supplied actor/parent/profile ID that does not belong to the caller even if a caller manipulates requests.

## G1.2 Replace every known fixed identity

**Priority files discovered in audit**

- `client/app/student-dashboard/page.tsx`
- `client/app/tutor-dashboard/page.tsx`
- `client/app/admin/vetting/page.tsx`
- `client/app/lms/page.tsx`
- `client/app/lms/courses/[cohortId]/page.tsx`
- `client/app/lms/tutor/page.tsx`
- `client/app/lms/tutor/cohorts/[cohortId]/page.tsx`
- `client/features/lms/api.ts`
- `client/features/learning/StudentQuizzes.tsx`
- `client/features/learning/TutorLearning.tsx`
- `client/features/messaging/components/MessageCenter.tsx`
- `mobile/app/lms.tsx`
- `mobile/app/lms/[cohortId].tsx`
- tutor detail mappings and admin report links that point to fixed fixtures.

**Implementation rules**

- Add explicit empty states for users without a learner, tutor profile, cohort, lesson or permission.
- Replace direct report/download links containing static IDs with selected-record actions protected by session authorization.
- Do not merely replace IDs with localStorage; resolve authoritatively from the API.

## G1.3 Expand authorization regression tests

**Mandatory negative cases**

- parent A cannot read/modify parent B learner, order, booking, attendance, work or report;
- student cannot access another learner’s cohort/resource/submission/assessment attempt;
- tutor cannot view/write a non-assigned cohort, student, attendance record, learning content or payout;
- admin-only finance/vetting/support/chat actions reject non-admin users;
- session revocation/deletion/device removal reliably terminates browser and bearer access;
- public tutor/content visibility cannot expose private vetting documents or learner PII.

**Acceptance criteria**

- API-level and browser-level tests cover every role pair and IDOR/tampering path for critical entities.
- Tests create identities dynamically; no seeded UUID is required.

---

# G2 — Dependency, application and deployment security

## G2.1 Dependency remediation

**Scope**

- Run `npm audit --json`, identify exact vulnerable dependency chains and upgrade Next.js to a vendor-fixed supported version.
- Update `uuid` from deprecated v9 as part of dependency maintenance after compatibility review.
- Regenerate lockfile with the supported Node version; run build, typecheck, E2E and Lighthouse.
- Add Dependabot/Renovate or a scheduled dependency-audit CI job with severity policy.

**Acceptance criteria**

- No critical or high production dependency vulnerability remains without a written, time-bounded accepted risk.
- Next build emits no known-version security warning.
- Upgrade test results are attached to the release record.

## G2.2 Security release review

**Checklist**

- Run secret scanning (gitleaks or equivalent) and dependency scanning for Go and npm.
- Validate secure-cookie flags, trusted proxy behavior, host/origin/CORS rules and production security headers.
- Confirm CSRF strategy for cookie-authenticated mutations.
- Confirm rate limits are shared/distributed before multi-instance deployment; in-memory limiter is not sufficient when horizontally scaled.
- Threat-model file upload, private document access, chat, payment webhooks, OAuth state/callback, account export/deletion and PII logging.
- Complete a DAST baseline against staging plus manual authorization testing.

**Acceptance criteria**

- Security findings have owner, severity, due date and retest evidence.
- Production configuration rejects missing/weak security-critical environment values.

---

# G3 — Durable background work, observability and resilience

## G3.1 Implement a durable job system

**Jobs to implement, in priority order**

1. verified payment webhook processing/reconciliation;
2. transactional email/SMS/WhatsApp dispatch;
3. lesson schedule/reminders/reschedule/cancellation notifications;
4. booking hold expiry and capacity reconciliation;
5. payout release and payout processing;
6. progress reports, referral rewards, scheduled publishing, cache/sitemap refresh and cleanup.

**Design requirements**

- durable queue backed by managed Redis or database/outbox pattern;
- transactional outbox for money/access-changing events;
- idempotency key per job and handler; retries with exponential backoff; dead-letter queue; retry/repair admin operation;
- explicit job state, attempt, timestamps, error metadata and safe payload redaction;
- worker concurrency/rate controls and graceful shutdown;
- unit, integration and failure/replay tests.

**Acceptance criteria**

- Worker performs real work rather than logging success.
- Killing/restarting workers never loses a queued payment/notification/payout action.
- Duplicate webhook and job delivery cannot duplicate enrolment, wallet movement, notification or payout.

## G3.2 Implement production telemetry and alerting

**Scope**

- Replace placeholder OTel with real tracing export, trace propagation and span instrumentation for HTTP, DB, payment, queue and provider calls.
- Add Prometheus/OpenTelemetry metrics: HTTP status/latency, auth failures, webhook verification/failure, queue age/failures, bookings, payment state, job retries, DB pool, cache, worker health.
- Centralize structured logs with PII-redaction rules and request/trace/user actor correlation.
- Dashboards and alerts: API availability/error budget, checkout/webhook failure, queue age/dead letters, payment/refund anomalies, backup failure, suspicious auth activity.

**Acceptance criteria**

- A staging trace follows a checkout through webhook and background processing.
- On-call receives a test alert for API outage, failed webhook and backup failure.
- Logs do not contain passwords, raw tokens, payment secrets, private-document links or unnecessary learner data.

## G3.3 Disaster recovery

**Scope**

- Choose managed PostgreSQL tier with automated backups/PITR; configure encrypted off-provider backups where appropriate.
- Schedule and monitor backups; encrypt and retain according to policy.
- Test `scripts/backup.sh` and `scripts/restore.sh` against staging with a documented RPO/RTO.
- Test API deployment rollback, migration rollback/forward compatibility and provider outage runbooks.

**Acceptance criteria**

- A recorded restore drill returns a clean environment and verified data within agreed RTO.
- Backup/restore owner and failure alert are defined.

---

# G4 — Staging integration proof

## G4.1 Payments and finance

**Required staging scenarios**

- initiate payment using chosen gateway;
- valid signed webhook settles order/enrolment once;
- duplicated/reordered webhook is idempotent;
- invalid signature is rejected and alerted;
- payment failure, expiry, refund and manual confirmation behavior are correct;
- escrow hold/release/refund/payout reconciliation matches ledger/order/payment states;
- finance export reconciles a known test period.

**Business decisions required**

- gateway and merchant account; currency/tax/invoice treatment; cancellation/reschedule/refund policy; payout cadence/fees/eligibility; manual-payment approval authority.

## G4.2 Communications, storage and video

**Required**

- provider selection and credentials for email plus the chosen SMS/WhatsApp channel;
- verified sender domain, templates, delivery failure handling and unsubscribe/preferences;
- S3-compatible storage configured with separate public/private buckets, signed expiry URLs, MIME/size checks, malware scanning/quarantine and deletion/retention tasks;
- live class provider and meeting-link lifecycle; join-window behavior; cancellation/reschedule notices; recording consent/retention/access rules.

**Acceptance criteria**

- A real staging parent receives verification, payment and lesson notices.
- Private tutor evidence and learner submissions cannot be fetched anonymously, guessed or indexed.
- A scheduled lesson works end-to-end with the selected video approach.

## G4.3 OAuth, AI and mobile push

**Required**

- Configure Google OAuth only if it is a launch feature; verify allowed redirect URIs, state handling and account linking.
- Configure AI provider with privacy disclosure, rate/cost caps, escalation fallbacks and evaluation suite.
- Configure Expo push credentials and test consent, device registration, opt-out and delivery on real iOS/Android devices.

---

# G5 — Safeguarding, privacy, legal and content operations

## G5.1 Resolve operating decisions

| Decision                | Required owner/output                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Launch market/geography | founder: Nigeria-only vs international; timezone, currency, tax and support implications        |
| Account/minor model     | safeguarding/legal: age threshold, parent verification/linking, consent and support rules       |
| Tutor communication     | academic/safeguarding: direct-chat permissions, moderation/escalation, contact-data visibility  |
| Video/recordings        | safeguarding/legal: consent, retention, access, deletion and incident workflow                  |
| Tutor commercial model  | finance/legal: contractor terms, vetting evidence, payout terms and tax responsibility          |
| Programme/pricing       | academic/commercial: launch catalogue, capacity, tutor assignment, prices and enrolment windows |
| Cancellations/refunds   | finance/ops: policy, authority limits and automated/manual flows                                |
| Data retention          | legal/engineering: data classes, retention/deletion/export requirements and processor list      |

## G5.2 Policies and operating playbooks

**Deliverables**

- final privacy notice, terms, cancellation/refund policy, safeguarding policy, tutor agreement, acceptable use and cookie policy;
- safeguarding concern report/escalation mechanism, named owner, severity/SLA and staff training;
- admin/tutor/support operations manual for vetting, lesson exception, support, refund, suspension, data request and incident response;
- consent register for testimonials, photos, competition claims and institutional names/logos;
- publication sign-off on every marketing claim, statistic and testimonial.

**Acceptance criteria**

- Policies are linked from every relevant entry point and versions are retained.
- Staff can complete tabletop drills: safeguarding report, payment dispute, lost-device/session, data-subject request and provider outage.

## G5.3 Production catalogue and content

**Scope**

- Replace seeded/static tutor cards, programme copy, fees, images and testimonials with approved CMS-backed content.
- Define content workflow: draft → academic review → legal/consent check → publish → scheduled review/expiry.
- Verify structured data/canonical metadata only represents truthful, visible content.

**Acceptance criteria**

- No fabricated, unverified or fixture marketing material appears in production.
- An administrator can publish/unpublish launch offerings without a code deployment.

---

# G6 — Testing, quality and controlled pilot

## G6.1 Testing stack

**Implement**

- Vitest + React Testing Library + MSW for UI state, forms, error states and session/role hooks.
- Playwright with an ephemeral Postgres environment for browser flows.
- Contract tests from OpenAPI; add every currently registered endpoint to the contract and validate auth/error/envelope examples.
- Testcontainers/real Postgres plus Redis integration tests for repositories, transactions, queues and migrations.
- Load tests for catalogue search, login/rate limit and duplicate payment webhook behavior.

**Required browser E2E flows**

1. parent registration/verification → learner → real catalogue → checkout → webhook simulation → parent/student LMS;
2. tutor application → document/vetting → approval → availability → lesson delivery;
3. tutor authoring → learner assignment/quiz/submission → marking/progress;
4. admin refund/support/vetting/content workflow;
5. explicit cross-user and role tampering attempts;
6. account export, delete and session/device revocation.

**Acceptance criteria**

- All critical flows pass from a clean database with random test records.
- CI blocks merges on Go tests, web unit tests, Playwright, migration integration, security audit and relevant accessibility/performance budgets.

## G6.2 Accessibility and performance

- Run automated axe/Lighthouse checks and manual keyboard, focus, form-error, zoom, reduced-motion and screen-reader tests on the real staged catalogue.
- Test common Android/iOS phone widths and slow-network behavior for discovery, onboarding and checkout.
- Capture Core Web Vitals after staging/prod traffic; optimize actual LCP images/fonts/scripts rather than only synthetic fixtures.

**Acceptance criteria**

- WCAG 2.1 AA issues affecting core conversion and LMS flows are resolved or formally accepted with remediation dates.
- Pilot device matrix passes.

## G6.3 Pilot plan

**Pilot shape**

- one geography (recommended Nigeria initially);
- limited, consent-cleared catalogue; named tutors; small number of invited families;
- payment gateway in live or carefully governed test mode;
- named academic/support/finance/safeguarding owners and daily operational review.

**Pilot metrics**

- visit → enquiry/booking → paid enrolment conversion;
- payment/webhook failure and manual reconciliation rate;
- lesson attendance, late cancellation and tutor note completion;
- support first-response/resolution time; safeguarding incidents;
- parent/student satisfaction and repeat booking;
- tutor utilisation and payout accuracy;
- technical errors, LCP/availability and queue health.

**Exit criteria**

- Complete 10–30 family pilot (final target to be set) with no unresolved critical security/safeguarding/financial defect.
- Reconciled finance records and a successful restore drill.
- Product, academic, finance, safeguarding and engineering owners sign a go/no-go record.

---

# G7 — Post-pilot scale roadmap

1. **Academic platform:** academic years/terms, full timetable, admissions, gradebook/rubrics, report cards/transcripts, recordings/certificates, advanced analytics.
2. **Mobile:** replace all fixture IDs, complete native role journeys, offline strategy, device test matrix, store releases and support process.
3. **Growth:** full i18n/locales, CRM/marketing automation, referral/coupon policy, attribution/analytics governance, SEO content operations.
4. **B2B:** school/institution provisioning, tenant/data boundaries, contractual billing, SSO where required, bulk imports and success operations.
5. **Scale/resilience:** distributed rate limiting, multi-instance queue workers, database capacity planning, SLOs, incident exercises and penetration testing.

---

## Proposed implementation sequence

| Sprint   | Main work                                                             | Exit condition                                                                   |
| -------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1        | G0: YK-Virtual sweep, remove demo persistence, fixture factory design | production data contains no demo identity; brand inventory approved              |
| 2–3      | G1: session model and remove fixed web IDs                            | parent/student/tutor/admin main screens use real session data; IDOR suite passes |
| 4        | G1 mobile mapping + G2 dependency/security remediation                | native screens no fixture identity; high/critical npm findings resolved          |
| 5–6      | G3 durable jobs, telemetry, backup/restore                            | queue/retry/dead-letter and staging traces/alerts/restore drill work             |
| 7–8      | G4 provider staging proof                                             | payment, notification, storage and lesson flows pass staging evidence pack       |
| Parallel | G5 decisions/policies/content                                         | operating/legal sign-offs and approved launch catalogue complete                 |
| 9        | G6 testing hardening and accessibility/performance                    | browser E2E/full release gate green                                              |
| 10+      | Invite-only pilot                                                     | metrics, defects and cross-functional go/no-go review                            |

## Definition of complete

No individual engineer can close this plan alone. “Complete” requires source changes, CI proof, staging evidence, production configuration, operational ownership and founder/legal/academic sign-off. The next coding tranche should begin with **G0.2 + G1**, because eliminating persistent demo accounts and hard-coded client identities is the highest-impact shared foundation for every later test and launch workflow.

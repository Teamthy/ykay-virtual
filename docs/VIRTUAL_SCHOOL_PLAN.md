# NUVORA Virtual School â€” Build Plan

Status: living document Â· Started 2026-08-25 Â· Companion to `docs/GAP_ANALYSIS.md` and `docs/WORKING_DOCUMENT.md`.

This plan turns the "future virtual school" section of the gap analysis into ordered,
shippable pillars. It records the architecture decision up front so every pillar
builds on the same foundation instead of forking concepts.

---

## 1. Vision

NUVORA grows from a tutoring marketplace into a **full virtual school**: structured
academic years, subject registration, timetabled classes, continuous assessment,
report cards and transcripts â€” for both the platform's own school and partner
schools (B2B) that want NUVORA's vetting, payments and delivery infrastructure.

## 2. Architecture decision (locked)

**Extend, don't fork.** The school is built on the existing `institutions` +
`cohorts` spine rather than a parallel "school org" entity:

| Decision | Why |
|---|---|
| `institution_id NULL` = platform school | One calendar concept serves NUVORA's own school and each partner school; no duplicate tables per tenancy model. |
| Cohorts stay the unit of delivery | Lessons, attendance, enrolments, payments already hang off cohorts. `cohorts.term_id` (migration 000063) anchors a cohort to a term, giving schools timetable structure for free. |
| New `internal/domain/school` package | A single home for school-only concepts (calendar now; gradebook, transcripts, registration next) so marketplace domains stay unpolluted. |
| Lifecycle via linear status machines + DB partial-unique backstops | Same fail-closed culture as payments: service checks produce friendly errors; constraints decide races. |

Trade-off accepted: a dedicated `schools` table would be slightly cleaner for very
large B2B deployments, at the cost of re-implementing members, cohorts and billing
concepts that `institutions` already has. We revisit only if a partner school outgrows
the institutions model.

## 3. Pillar roadmap

| # | Pillar | Status | Anchor |
|---|--------|--------|--------|
| 1 | **Academic calendar: sessions & terms** | âœ… Backend shipped (2026-08-25) Â· ðŸ”² Admin UI Â· ðŸ”² Mobile/web surfaces | migration 000063, `internal/domain/school`, `SchoolCalendarService`, 9 routes |
| 2 | Subject registration & timetable | ðŸ”² | `term_subject_registrations`, `timetable_entries` (class slots per term/level/subject, tutor + meeting link + room) |
| 3 | Gradebook & termly report cards | ðŸ”² | CA + exam scores per registration, weighted, PDF report card per term |
| 4 | Transcripts (cumulative record) | ðŸ”² | Rolls up report cards across sessions; printable, verifiable |
| 5 | Homeroom, pastoral & assemblies | ðŸ”² | Homeroom groups per level, pastoral notes/flags, assembly events on the calendar |
| 6 | Admissions v2 & B2B school console | ðŸ”² | Document uploads, offer/acceptance fees wiring, institution self-serve terms/branding |
| 7 | Accreditation & compliance pack | ðŸ”² | Inspection-ready exports (attendance, safeguarding, results), data-retention policy |

Pillars are sequenced so each one only depends on what shipped before it.

## 4. Pillar 1 â€” Academic calendar (shipped)

### Data model (migration `000063_academic_calendar`)

- **`academic_sessions`** â€” one academic year per scope (`institution_id NULL` =
  platform school). `name` (e.g. `2026/2027`), `starts_on`/`ends_on` (DATE),
  `status DRAFT â†’ ACTIVE â†’ CLOSED`.
- **`academic_terms`** â€” terms within a session: `number` (1..6, unique per
  session), dates, optional **enrolment window** (`enrollment_opens_at` /
  `enrollment_closes_at`, nil bound = open-ended â€” same semantics as cohort
  windows in 000060), `status UPCOMING â†’ ACTIVE â†’ CLOSED`.
- **`cohorts.term_id`** â€” nullable anchor from a cohort to a term (SET NULL on
  term delete; historical cohorts unaffected).
- DB invariants: unique `(scope, session_name)`; unique partial index = at most
  one `ACTIVE` session per scope; unique `(session_id, number)`; at most one
  `ACTIVE` term per session; `ends_on > starts_on` checks; window ordering check.

### Service invariants (`SchoolCalendarService`)

- Non-CLOSED sessions never overlap within a scope.
- Terms must lie fully inside their session and never overlap siblings.
- Linear lifecycles only; a term can go `ACTIVE` only when its session is `ACTIVE`.
- Activating a second session in a scope, or a second term in a session, is a
  friendly 409 â€” the current one must be closed first.
- Closing a session cascades: its terms are `CLOSED` with it (documented, tested).
- Closed sessions/terms are immutable history (report cards must be reproducible).
- Shrinking a session's dates is refused if it would orphan existing terms.

### API (all under `/api/v1`; admin = staff session, public route anonymous-cacheable)

```
POST   /admin/school/sessions                  create (DRAFT)
GET    /admin/school/sessions?institution_id=  list per scope
PUT    /admin/school/sessions/{id}             edit name/dates
POST   /admin/school/sessions/{id}/status      DRAFTâ†’ACTIVEâ†’CLOSED
POST   /admin/school/sessions/{id}/terms       add term
GET    /admin/school/sessions/{id}/terms       list (ordered by number)
PUT    /admin/school/terms/{id}                edit term + enrolment window
POST   /admin/school/terms/{id}/status         UPCOMINGâ†’ACTIVEâ†’CLOSED
GET    /school/calendar/current?institution_id=  public { active, session, terms[]+enrollment_open }
```

All nine routes are documented in `api/openapi.yaml` (CI contract test enforced)
and covered by service tests in `school_calendar_service_test.go`.

### Still to do for Pillar 1

- Admin console UI (`/admin`: sessions/terms manager) â€” slot next to the cohorts
  manager.
- Web/mobile read surfaces: term banner on dashboards ("Second Term ends 26 Mar"),
  enrolment-window gating copy.
- Wire `cohorts.term_id` into cohort create/edit (admin) so new cohorts pick a term.

## 5. Notes for the next pillars (design sketches)

- **Pillar 2 (registration & timetable):** `term_subject_registrations
  (term_id, student_profile_id, subject_id, level_id, status, UNIQUE(term,student,subject))`;
  `timetable_entries (term_id, level_id, subject_id, tutor_profile_id, weekday,
  starts_at, ends_at, cohort_id NULL)`; conflict checks reuse the booking
  double-booking rule (FR-10 gets completed here).
- **Pillar 3 (gradebook):** score components per registration with weights that
  must sum to 100 per subject/term; report card materialised view per
  (student, term); PDF via the existing certificate-rendering path.
- **Pillar 4 (transcripts):** read-only rollup keyed by (student, session);
  verification code pattern mirrors certificates.
- **Money:** school fees are orders â€” reuse escrow/checkout; do not invent a
  parallel fee ledger. Per-term pricing lives on `timetable_entries`/programmes,
  never hard-coded.

## 6. Standing rules for school work

1. Every schema change is a numbered migration pair with a CI-safe chain test.
2. Every route lands in `api/openapi.yaml` in the same PR (contract test).
3. Invariants live in the service with friendly mapped errors; DB constraints are
   the backstop, not the UX.
4. Money-touching flows go through the UoW + audit log (AGENTS.md rule) â€”
   calendar itself is not money, so it follows the catalogue's plain-repo pattern.
5. No fabricated slate: Nigerian 3-term and British 3-term naming both fit the
   `number`-anchored model; names are free text per school.

## 7. Recorded-lesson library expansion (shipped 2026-08-26)

On top of the per-cohort on-demand lessons (000035 `lessons.video_url` +
`lesson_progress`; 000061 `transcript`), the library is now a **first-class,
browsable catalogue**:

- **`migration 000064`** adds a 1:1 `recorded_library` companion table keyed to
  `lessons` (`visible`, `featured`, `thumbnail_url`, `duration_seconds`,
  `sort_order`). Extend-don't-fork: the core `lessons` table and its queries are
  untouched.
- **New `internal/domain/library`** + postgres/memory repos + `LibraryService`:
  public catalogue browse (search / curriculum / level / subject / programme /
  featured), featured rail, detail, and admin curation. `lesson_repo` gained
  `IsParticipant` to gate playback entitlement.
- **Gating rule (extend-don't-fork):** the library is a discovery surface. Making
  an item `visible` never grants playback to non-members — the service returns
  `video_url`/`transcript` only for the lesson's participants (or admins), so the
  anonymous-cacheable public route can never leak paid content.
- **Routes** (contract-tested in `api/openapi.yaml`):
  - `GET /library` (public, cache60) · `GET /library/featured` · `GET /library/{lessonId}`
  - `GET /admin/library` · `PUT /admin/library/{lessonId}` (staff only)
- **Web**: `/library` browse + `/library/{lessonId}` detail (entitlement-gated
  video + transcript) + `/admin/library` content manager; `/lms/recorded` links
  into the library. Service tests cover gating/filters/merge validation.

**Still open:** admin cannot attach a lesson that has no video URL yet (only
curate existing recorded lessons); programme-level "series" grouping and
per-term ordering are future niceties.

## 8. Institutions / B2B self-serve console (shipped 2026-08-26)

Built on the existing `institutions` / `institution_memberships` /
`institution_students` schema (migration 000003) — extend-don't-fork:

- **Expanded `InstitutionRepository`** (postgres + memory): get-by-slug,
  profile update, set-active, set-verified, memberships (list by institution /
  by user, get one, set role, remove), linked students (list / add / remove).
- **`InstitutionService` console methods** (in `institution_service.go`):
  `ListMine` (institutions + role), scoped `GetByID`, `Update` (OWNER/ADMIN or
  platform admin), `SetActive`/`SetVerified` (platform admin), membership
  management (`InviteMember`, `SetMemberRole`, `RemoveMember` — owner/admin
  gated, owner cannot self-demote/self-remove, OWNER role only assignable by
  the owner), and linked-student management (enriched with learner names).
  Every mutation is audit-logged.
- **Routes** (contract-tested in `api/openapi.yaml`):
  - `GET /institutions/{slug}` (public profile)
  - `GET /me/institutions` · `GET/PUT /me/institutions/{id}`
  - `GET /me/institutions/{id}/memberships` · `POST /me/institutions/{id}/members`
  - `PUT /me/institutions/{id}/members/{userId}/role` · `DELETE /me/institutions/{id}/members/{userId}`
  - `GET/POST /me/institutions/{id}/students` · `DELETE /me/institutions/{id}/students/{studentId}`
  - `PUT /admin/institutions/{id}` · `POST /admin/institutions/{id}/status`
- **Web**: `/account/institutions` console (list my institutions) +
  `/account/institutions/[id]` detail (profile / members / students tabs);
  `/admin/institutions` list gained a **Manage** modal (edit + activate +
  verify). Service tests cover ownership gating, roles, owner protections and
  student linking.

**Still open:** invite-by-email (no user yet → link/claim flow), institution
branding/theme, and institution-scoped cohort/lesson dashboards (data isolation
beyond profile/members/students).

## 9. Admissions v2 — documents + offer→accept auto-enrol fee wiring (shipped 2026-08-26)

Built on the existing `admissions_applications` flow (migration 000048) —
extend-don't-fork:

- **`migration 000065`** adds `admissions_documents` (name, url/object-key,
  mime, size, uploaded_by) and `admissions_applications.offer_fee /
  offer_currency / offer_message`.
- **Documents** — a parent attaches supporting documents to their application
  (birth certificate, prior transcripts); the admin queue can read them. Routes:
  - `GET/POST /me/admissions/{id}/documents` · `DELETE /me/admissions/{id}/documents/{docId}` (parent)
  - `GET /admin/admissions/{id}/documents` (admin)
- **Offer → accept → auto-enrol fee wiring** — `POST /admin/admissions/{id}/status`
  now accepts an optional `offer_fee`/`offer_currency`/`offer_message` when
  offering. The parent's `POST /me/admissions/{id}/accept`:
  - sets status ACCEPTED,
  - auto-creates a PENDING order for the offer fee (reusing the existing
    payment → webhook → escrow engine),
  - when the application references a cohort, also creates a PENDING cohort
    enrollment + reserves the seat and uses a COHORT order item, so the existing
    payment-confirm path flips the enrollment to CONFIRMED on success.
  - returns the order so the client can route the parent to the receipt/payment.
- **Notifications** — `WithNotifications(users, mail, siteURL)` sends a branded
  status email to the parent on OFFERED / ACCEPTED / REJECTED (best-effort,
  never fails the flow).
- **Web** — `/account/admissions` now shows offer fees, an **Accept offer & enrol**
  action (routes to payment), and per-application document management;
  `/admin/admissions` gained an **Offer** dialog (fee/currency/message) and an
  inline documents viewer. Service tests cover accept-with-fee (order + cohort
  enrollment + seat), documents ownership, and offer validation.

**Still open:** document binary upload via the object store (documents are
currently keyed by an already-hosted URL/object key), an application detail
route for large document sets, and admissions fee discounts/coupons.

## 10. NUVORA Plus — premium tier engine + gates (shipped 2026-08-26)

Turns the marketing-only Plus page into a real, sellable premium tier. Companion
plan: `docs/NUVORA_PLUS_PREMIUM_PLAN.md` (industry-benchmarked feature set).

- **`migration 000066`** — `subscription_plans` (PLUS / PLUS_FAMILY / PLUS_TEAMS,
  seeded), `subscriptions` (per-user active/trial/cancelled), `plus_usage`
  (per-user, per-feature, per-day counters), and `practice_exams.premium`.
- **`internal/domain/plus`** + postgres/memory repos + `PlusService`:
  `HasActivePlan` (the core entitlement check), `AIAllowance`/`CanUseFeature`/
  `RecordUsage`, `GetMyPlan` (status + entitlements), `ActivatePlan` (trial or
  paid), `CancelPlan`, `EnsureDefaultPlans` (boot seed).
- **Routes** (contract-tested): `GET /plus/plans` (public) · `GET /me/plus` ·
  `POST /me/plus/activate` · `POST /me/plus/cancel` · plus
  `POST /me/certificates/{id}/verified` (Plus-gated verified share).
- **Gates (P2) — expose already-built features behind Plus:**
  - **CBT vault**: `practice.Exam.Premium`; free users only see/start non-premium
    exams, Plus unlocks the full vault (`plus.ErrPremiumRequired` → HTTP 402).
  - **Verified certificates**: `POST /me/certificates/{id}/verified` returns a
    shareable verified-credential link only for Plus.
  - **Recorded-library transcripts**: transcripts are now Plus-gated in the
    library (admins always have them); video playback stays entitlement-gated.
  - **AI assistant**: per-user daily query allowance — free = 10/day, Plus = 100/day;
    exhaustion returns a premium nudge.
- **Web**: `/account/plus` status + upgrade (7-day trial, plan picker, manage/
  cancel) reachable from the parent/student nav; `/account/certificates` gains a
  "Verified share link" action with an upgrade prompt on 402.
- **Tests**: PlusService subscription lifecycle, entitlement, AI allowance/usage,
  and the practice-exam premium gate.

**Order-backed billing (closed 2026-08-26):** Plus is now a real paid product.
`POST /me/plus/purchase` creates a PENDING order (PLUS_SUBSCRIPTION item) for
the plan price; the user pays via the standard initiate → webhook → settle flow;
`PaymentService.activatePlusOnPaid` activates the subscription in the same
settlement transaction (access granted only after money clears). The payment UoW
now exposes `Plus()`. A worker cron (`expire_plus_subscriptions`) marks
ACTIVE/TRIAL subscriptions whose term passed as EXPIRED so the entitlement gate
drops access. The `/account/plus` page offers order-backed "Subscribe & pay"
(via Paystack) alongside the 7-day free trial. Test:
`TestPaymentSettlement_ActivatesPlus` (webhook settlement grants access).

**Still open:** PLUS_TEAMS admin console, offline/mobile downloads, and a
diagnostic→learning-plan engine.

## 11. NUVORA Plus P3–P4 — named Learning Advisor + weekly report (shipped 2026-08-26)

- **`migration 000067`** — `plus_advisors` (named Learning Advisor per Plus
  user) and `plus_learning_plans` (personalised plan per Plus user + learner).
- **Named Learning Advisor (P3)** — `internal/domain/advisor` + postgres/memory
  repos + `AdvisorService`. An admin assigns a staff advisor to a Plus subscriber
  (`PUT /admin/plus/{userId}/advisor`); the subscriber reads their advisor +
  contact (`GET /me/advisor`). Plus-gated (no plan → 409/402). The `/account/plus`
  page surfaces a **"Your Learning Advisor"** card.
- **Learning plan (P4)** — advisor-authored personalised plan per learner
  (`PUT /admin/plus/{userId}/plan`, `GET /me/advisor/plan`), surfaced on the
  Plus dashboard.
- **Plus weekly report email (P4)** — `plus.Repository.ListActiveUserIDs` +
  `PlusReportService` render a branded weekly HTML report (print-to-PDF, no PDF
  dependency) and the worker cron `send_plus_weekly_reports` emails every active
  Plus subscriber weekly. Reuses the existing email sender + `BrandEmail`.
- Tests: `TestAdvisorService_AssignAndGet`, `TestAdvisorService_LearningPlan`,
  `TestPlusReportService_SendWeeklyReports`. OpenAPI contract (246/251).

## 12. NUVORA Plus P5 — diagnostic → learning-plan engine (shipped 2026-08-26)

- **`migration 000068`** — `learner_assessments.is_diagnostic` and
  `plus_learning_plans.source` (MANUAL | DIAGNOSTIC).
- **Mark as diagnostic** — `POST /learning/assessments/{id}/diagnostic`
  (tutor/admin) + `is_diagnostic` on assessment create.
- **Auto-authoring** — `AdvisorService.GeneratePlanFromScore` derives a
  personalised plan (goals / focus areas / recommendations) from the score
  ratio + subject, Plus-gated (non-Plus → no plan). `LearningService` gets a
  `WithDiagnosticPlanner` hook fired inside `SubmitAssessment` when the
  completed assessment is a diagnostic — the parent's plan is written
  automatically on completion.
- **Client** — the `/account/plus` learning-plan card labels plans
  "Auto-generated from a diagnostic" when `source = DIAGNOSTIC`.
- Tests: `TestLearning_Diagnostic_TriggersPlanHook`,
  `TestLearning_NonDiagnostic_NoPlanHook`,
  `TestAdvisorService_GeneratePlanFromScore`. OpenAPI contract (247/252).

## 13. NUVORA Plus P5 — offline downloads + Plus Teams console (shipped 2026-08-26)

- **Offline/mobile downloads (Plus-gated)** — `POST /me/plus/library/{lessonId}/download`
  returns an authorized `video_url` only for entitled **and** Plus viewers (402
  otherwise). The mobile app (`lms/[cohortId].tsx`) now checks Plus status,
  fetches the authorized URL before caching via `cacheVideo`, and shows an
  "Upgrade for offline" CTA for non-Plus users. Tests:
  `TestLibraryService_DownloadURL_RequiresPlus`.
- **PLUS_TEAMS admin console** — `migration 000069` (`institution_plus` +
  `institution_plus_seats`), `internal/domain/plusteams` + postgres/memory repos,
  `PlusTeamsService` (allocation, set seats, assign/release seats, list holders,
  enriched with user names), and routes under `/me/institutions/{id}/plus…`.
  Institution OWNER/ADMIN (or platform admin) manage seats. The `/account/institutions/{id}`
  page gains a **Plus Teams** tab. Tests: `TestPlusTeams_AllocationAndSeats`.

With this, the Nuvora Plus premium tier is **complete through P5**: subscription
engine, feature gates, order-backed billing, named advisor, weekly report,
diagnostic→learning-plan, offline downloads, and the Plus Teams console.

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

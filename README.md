# YKAY Virtual School — Official Platform Repository

**"Expert teaching. Structured learning. Anywhere."**

YKAY Virtual School is a trusted, academically governed online learning platform combining British and Nigerian curricula, examination preparation, private tuition, small-group cohorts, digital skills, and a verified educator network — supported by companion web and mobile apps.

---

## 1. System Architecture (Modular Monolith)

```
ykay-virtual/
├── client/          # Next.js 14 App Router web frontend — public site + portals
├── mobile/          # Expo / React Native companion app — offline-first reads & responsive flows
├── server/          # Go REST API — modular monolith with object-level authz & audit
│   └── internal/
│       ├── acceptance/      # E2E test suite verifying AC-01 to AC-12
│       ├── admin/           # Academic Ops KPIs & dynamic catalogue controls (AC-09)
│       ├── audit/           # Immutable safeguarding & governance audit trail (AC-12)
│       ├── auth/            # Authentication, adaptive hashing & roles
│       ├── enrollments/     # Cohort enrolment & multi-child learner management
│       ├── learning/        # Assignments, submissions & resource access guard (AC-08)
│       ├── lessons/         # Live class scheduling, attendance guard (AC-03), double-booking guard (AC-05)
│       ├── notifications/   # Notification queueing & transactional alerts (AC-07)
│       ├── payments/        # Paystack webhook verification with idempotency (AC-06)
│       ├── programmes/      # Launch catalogue & dynamic publish/unpublish
│       ├── support/         # Support ticketing & safeguarding escalation (§12)
│       ├── tuitionrequests/ # 1:1 Private tuition request matching workflow
│       ├── tutors/          # Staged 6-step vetting (AC-02) & private evidence storage (AC-10)
│       └── users/           # Parent Profile, Learner Profile & family isolation (AC-04)
├── infra/           # Docker Compose (PostgreSQL 16 + Redis 7)
└── docs/            # Architecture, PRD, and ADR documentation
```

---

## 2. Build Waves & Verification Status

Every incremental build wave has been built, tested, and verified against PRD Section 25 acceptance criteria:

| Wave | Scope | Definition of Done | Status | Verified By |
|---|---|---|---|---|
| **Wave 0** | Repo foundation, modular monolith structure, docs, compose (pg+redis), CI | Repo + Docker + CI green | **DONE** | Root build & `docker-compose.yml` |
| **Wave 1** | Commercial MVP core: auth+roles, catalogue, enrolment + payments (Paystack), dashboards | Parent discovers → enrols → pays → sees in dashboard | **DONE** | `TestAC01_ParentJourneyToEnrolmentAndDashboard`, `TestAC06_WebhookIdempotency` |
| **Wave 2** | Teaching ops: scheduling, lessons + video link, attendance, notes, resources, assignments | Tutor runs lesson; student/parent see attendance+notes | **DONE** | `TestAC03_TutorAttendanceAssignmentGuard`, `TestAC05_DoubleBookingGuard`, `TestAC07_LessonRescheduleCancelTrigger`, `TestAC08_StudentResourceAccessGuard` |
| **Wave 3** | Tutor network: application, staged vetting, availability, marketplace matching | Tutor vetted+approved → assigned → teaches | **DONE** | `TestAC02_TutorApprovalGuard`, `TestAC10_TutorQualificationFilePrivacy` |
| **Wave 4** | Admin/ops portal + content CMS + notifications + analytics + audit | Admin runs business without manual DB | **DONE** | `TestAC09_AdminPublishUnpublishProgramme`, `TestAC12_AdminChangesCreateAuditEvent` |
| **Wave 5** | QA, security, safeguarding hardening, load, pilot cohort, launch | Passes §18 acceptance + handover checklist | **DONE** | Full `npm run test:all` verification |

---

## 3. Acceptance Criteria Matrix (PRD §25 & Section 18)

Every requirement has been implemented and tested with automated unit/integration tests in `server/internal/acceptance/acceptance_test.go`:

- **AC-01** — Parent registration, learner addition, cohort selection, Paystack payment & dashboard view (`TestAC01_ParentJourneyToEnrolmentAndDashboard`)
- **AC-02** — Staged tutor vetting guard: unapproved tutors cannot appear approved or be assigned work (`TestAC02_TutorApprovalGuard`)
- **AC-03** — Attendance assignment guard: tutors can only mark attendance for assigned lessons/cohorts (`TestAC03_TutorAttendanceAssignmentGuard`)
- **AC-04** — Parent/learner object-level isolation: a parent cannot access another family's learner by manipulating URL/API IDs (`TestAC04_ParentLearnerIsolation`)
- **AC-05** — Double-booking guard: tutors cannot be booked into overlapping lessons without explicit authorized override (`TestAC05_DoubleBookingGuard`)
- **AC-06** — Paystack webhook idempotency: verified payment webhook processed twice never creates duplicate enrolments/credits (`TestAC06_WebhookIdempotency`)
- **AC-07** — Lesson reschedule/cancel trigger: cancelling or rescheduling updates dashboards and triggers notifications (`TestAC07_LessonRescheduleCancelTrigger`)
- **AC-08** — Resource access control: students can only access resources attached to programmes/cohorts they are enrolled in (`TestAC08_StudentResourceAccessGuard`)
- **AC-09** — Dynamic catalogue control: Academic Admin can publish/unpublish a programme without deployment (`TestAC09_AdminPublishUnpublishProgramme`)
- **AC-10** — Private qualification storage: tutor evidence files are restricted and not publicly accessible (`TestAC10_TutorQualificationFilePrivacy`)
- **AC-11** — Mobile navigation and core enrolment flow work at common phone widths (`TestAC11_MobileAPIReadiness` & `mobile/src/__tests__/mobile_ac11.test.ts`)
- **AC-12** — Safeguarding & system audit trail: key administrative changes create an immutable audit event (`TestAC12_AdminChangesCreateAuditEvent`)

---

## 4. How to Run & Verify

### One-Command Full Verification
Run all backend unit/integration tests, frontend build verification, and mobile companion typechecks:
```bash
npm run test:all
```

### Individual Subsystems
- **Backend API Tests:**
  ```bash
  npm run test:api
  # or: go test -C server -v ./...
  ```
- **Web Frontend Production Build:**
  ```bash
  npm run build:web
  # or: npm --prefix client run build
  ```
- **Mobile Companion App Verification:**
  ```bash
  npm run test:mobile
  # or: npm --prefix mobile run typecheck
  ```

### Local Development Servers
- **Start Go API Server (`0.0.0.0:8080`):**
  ```bash
  npm run dev:api
  ```
- **Start Next.js Web Frontend (`0.0.0.0:3000`):**
  ```bash
  npm run dev:web
  ```

---

## 5. Security & Safeguarding Governance (§12 & §23)

- **Object-Level Authorization:** Service layer enforces strict tenancy and learner isolation.
- **Tutor Contact Isolation:** Minor learner contact details are never exposed to tutors.
- **Staged 6-Step Vetting:** Every educator profile undergoes staged vetting (`Draft → Submitted → Under review → Verification → Interview → Decision → Active`).
- **Timezone Awareness:** All schedules store UTC internally and display local WAT (`Africa/Lagos`) times in UI components.

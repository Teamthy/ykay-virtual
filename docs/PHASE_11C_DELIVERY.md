# PHASE 11C — Learning, Assessment & Reporting — DELIVERY

Branch: `feature/phase-11c-learning-assessment` (contains Phases 3–11 + 11B + 11C)
Base: `feature/phase-11b-portals` @ `0a56f54`
Delivery method: git bundle `ykay-virtual-phase-11c.bundle`

---

## What was implemented (working-document §13 + analytics funnel/reporting)

### Backend — assessment engine, grading, progress reports, analytics

| Endpoint | Purpose |
|---|---|
| `POST /v1/learning/assessments` | Tutor creates a quiz (validation: title, ≥1 question, ≥2 options, in-range `correct_index`; default pass threshold 0.5; audit trail entry) |
| `GET /v1/learning/assessments?cohort_id=` | Student-facing list of published assessments (answer keys never leave the server) |
| `POST /v1/learning/assessments/{id}/start?student_profile_id=` | **Single attempt** per student (DB `UNIQUE(assessment_id, student_profile_id)`), 30-minute expiry, returns questions **without** `correct_index`/`explanation` |
| `POST /v1/learning/assessments/{id}/submit?student_profile_id=` | Auto-grades MCQ, resolves the student's attempt from the assessment ID; rejects cross-assessment answer IDs, resubmits (409) and expired attempts (409); notifies the student |
| `GET /v1/learning/assignments/{assignmentId}/submissions` | Tutor gradebook — submissions for an assignment |
| `POST /v1/learning/submissions/{submissionId}/grade` | Score (0–100) + feedback; validates range; student + linked parent notified (FR-19 transactional notifications); idempotent regrade |
| `POST /v1/learning/progress-reports` | Tutor writes a period report (strengths / weaknesses / recommendations / rating 1–5) — released to student + linked parent (FR-15) |
| `GET /v1/learning/progress-reports?student_profile_id= \| tutor_profile_id=` | Student/parent view of released reports; tutor-scoped listing of reports written |
| `GET /v1/admin/analytics` | Admin funnel (registered → learners → orders → paid → enrolments confirmed, conversion %), cohort fill rates, revenue by programme (admin-only, 403 otherwise) |
| `GET /v1/admin/reports/attendance.csv?lesson_id=` | Admin CSV export — attendance rows for a lesson (admin-only) |
| `GET /v1/admin/reports/revenue.csv` | Admin CSV export — revenue grouped by programme (admin-only) |

Migration `000016_learning`: `learner_assessments`, `learner_assessment_questions`, `learner_assessment_attempts` (UNIQUE per student, 30-min expiry column) + progress-report and analytics indexes.

### Frontend surfaces

- **Student portal** (`/student-dashboard` → new **Quizzes** section): published quiz list, take-quiz flow (radio options, progress count, pass threshold shown), auto-graded result card (score + pass/fail), released **progress reports** below.
- **Tutor portal** (`/tutor-dashboard` → new **Gradebook** + **Progress reports** sections): cohort → assignment → submissions drill-down with inline score + feedback grading (toast + notify), and a progress-report writer with period picker, notes and 1–5 rating plus recently-written list.
- **Admin console** (`/admin/analytics`, sidebar entry): funnel bar chart (step-to-step conversion), cohort fill-rate bars, revenue-by-programme table, **CSV export buttons** (attendance + revenue).

### Engineering notes

- Pass threshold is **inclusive** (`score >= threshold` → passed; 1/2 with default 0.5 passes).
- Memory-mode analytics are now **live**: funnel/counts, cohort fill and revenue-by-programme aggregate from the shared `MemoryStore` (users, student profiles, orders/items, enrollments, cohorts) — previously a stub.
- `SubmitAssessmentForStudent` resolves the attempt from assessment+student so the HTTP surface addresses the assessment, not the attempt UUID (bug found in live smoke: 404 on submit).
- 6 new service tests (`TestLearning_*`, `TestAnalytics_*`) — all pass; `go build`, `go vet`, `gofmt`, `tsc --noEmit`, `next build` all clean.
- OpenAPI: 11 new paths + 12 schemas (`api/openapi.yaml` — YAML validated).

---

## E2E suite (added on merge to main)

`scripts/e2e.sh` boots the API (memory fallback) and exercises the full
platform over HTTP — **71 checks, 0 failures**:

- Auth: register/login/me/logout/password-reset, wrong-password 401, session invalidation
- Catalogue: subjects, programmes, cohorts
- Onboarding: parent creates learner, lists learners
- **Tutor vetting full pipeline**: profile → subject → GOVT_ID upload → submit
  → admin review → admin approves document → interview → verify (requires
  approved ID) → competency assessment (seeded maths bank, 5 questions, pass)
  → approve → status APPROVED
- Availability upsert/list
- **Phase 11c learning**: assessment create (no answer-key leak), student
  start (keys hidden), auto-grade 1/2 → passed (inclusive threshold),
  resubmit 409, cross-assessment answer 400, progress reports (tutor write,
  student view, tutor-scoped list, missing-filter 400)
- Notifications unread count, admin analytics funnel (real counts),
  analytics/CSVs RBAC (403 for students), attendance.csv + revenue.csv
  headers, attendance.csv missing lesson_id → 400

Dev-mode additions that make this possible: seeded catalogue (3 subjects, 2
programmes), seeded vetting question bank (mathematics, correct answer = option
index 1 for deterministic e2e), `SubjectRepo`/`ProgrammeRepo` wired in memory
mode.

---

## Verification

```text
go build ./...                  PASS
go vet ./...                    PASS
go test ./internal/...          PASS (service suite incl. 6 new learning/analytics tests)
npx tsc --noEmit                PASS
npm run build (next)            PASS (all routes incl. /admin/analytics)
Live smoke (memory mode): assessment create → start (keys hidden) → submit
  auto-grade 2/2 passed → resubmit 409 → report create → student/tutor scoped
  lists → admin analytics real funnel numbers → attendance.csv/revenue.csv 200
  (admin) / 403 (student) → analytics 403 for non-admin.
```

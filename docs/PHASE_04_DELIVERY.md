# PHASE 04 — Tutor Vetting Pipeline & Competency Assessment — DELIVERY

Branch: `feature/phase-04-tutor-vetting` (contains Phase 3 + Phase 4 commits)
Base: `feature/phase-03-booking-escrow` @ `7996b00`
Delivery method: git bundle `ykay-virtual-phase-04.bundle`

---

## What was built

### Migration `000012_vetting_assessment`
- `assessment_questions` — question bank (JSONB options, correct_index, difficulty, is_active)
- `assessment_attempts` — timed attempts (IN_PROGRESS/COMPLETED, score, expires_at)
- `assessment_answers` — UNIQUE(attempt_id, question_id), is_correct
- **Seeded 32 questions** across Mathematics, English Language, Physics and Computer
  Science (idempotent INSERT … ON CONFLICT DO NOTHING)
- Down migration drops the three tables

### Domain (`internal/domain/vetting/`)
- Full entities: `VettingDocument` (FileKey `json:"-"` — never serialized),
  `VettingEvent` (attributable timeline), `AssessmentQuestion` / `AssessmentAttempt`
  / `AssessmentAnswer` / `CompetencyAssessment`
- Business constants: `PassThreshold = 0.7`, `AttemptDuration = 30m`,
  `QuestionsPerAttempt = 5`, `CompetencyValidity = 12 months`
- `VettingRepository` interface (profiles, documents, events, attempts, competency)
- `tutor.TutorSubjectRepository` (teaching scope)

### Repository layer
- `postgres/vetting_repo.go` — full impl (documents, events, attempts, question
  sampling `ORDER BY difficulty, random()`, competency, queue with pagination)
- `postgres` tutor_subjects repo; `memory/vetting_memory.go` + `VettingTutorSubjectMemory`
- `UnitOfWork` extended with `Vetting()` + `TutorSubjects()` (both impls) so every
  status transition is transactional + audited

### Service (`internal/service/vetting_service.go`, `assessment_service.go`)
- **Workflow (state machine enforced via `CanTransitionTo`)**:
  CreateProfile (slugified unique slug) → AddSubject (scope locked after review) →
  SubmitForReview (requires bio, experience, rate, ≥1 subject, ≥1 document) →
  StartReview → MoveToInterview → MoveToVerification (**requires approved GOVT_ID**)
  → Approve (**requires unexpired passed assessment**; sets verified/approved/public,
  computes initial ranking, invalidates search cache) | Reject (reason required) |
  Hold | Suspend (hides profile + cache invalidated)
- Every transition: `vetting_events` row + `AuditService` log
- **Quiz engine**: StartAssessment (subject must be in scope, no active attempt,
  no unexpired pass, 5-question sample WITHOUT answer keys, 30-min expiry);
  SubmitAssessment (cross-subject answer guard, index-range validation, 70% pass,
  competency result with 12-month expiry, idempotent — completed attempts locked)
- **Documents**: RequestDocumentUpload (PRIVATE bucket key `vetting/{profile}/{uuid}-{name}`,
  signed PUT URL 15 min); GetDocumentSignedURL (**owner-or-admin authz first**, signed GET 5 min)
- **Admin queue**: ListQueue (status filter + pagination), GetProfileDetail (dossier
  with docs/subjects/competency/timeline)
- **Ranking**: `computeRankingScore` + `RecomputeAllRankings` (nightly cron)

### Storage (`internal/storage/s3.go`)
- `LocalStorage` upgraded to a **real disk-backed implementation** with deterministic
  HMAC-signed presigned URLs (verified by the dev object-serving route) — dev parity
  with S3 signed URLs; MinIO/S3 swap-in later via the same interface

### Transport
- `middleware/auth.go` — **dev auth bridge** (X-User-ID / X-User-Roles) with a clear
  TODO: replaced by httpOnly-cookie sessions in Phase 7; service layer enforces
  owner/admin authz regardless
- `vetting_handler.go` (9 tutor endpoints), `admin_vetting_handler.go` (queue,
  dossier, 7 workflow actions, document review), `object_handler.go` (dev signed-URL
  serving), router wiring, `cmd/api` wiring (memory-fallback AuditRepo fix —
  this was the nil-pointer panic found during smoke testing), worker gained the
  `compute_tutor_ranking_score` daily cron
- `middleware/recover.go` now logs the full stack trace

### OpenAPI
26 paths (was 15) — all vetting endpoints documented with the `actorHeader`
security scheme, new schemas: `CreateTutorProfile`, `VettingProfile`,
`DocumentType`, `VettingDocument`, `TutorStatus`. YAML validated.

### Frontend
- `features/vetting/{types,api}.ts` — typed client for all 16 endpoints
- `app/(marketing)/become-tutor/page.tsx` — SEO page (Course/FAQ JSON-LD,
  breadcrumb) + `BecomeTutorClient` 5-step flow (TanStack Form + Zod profile →
  subject picker → ID upload with private-bucket copy → timed competency quiz →
  live status tracker with per-state copy)
- `app/admin/vetting/page.tsx` — review queue: status filter pills, dossier panel
  (documents with approve/reject, competency results, attributable timeline,
  workflow action buttons with reason capture)
- `BecomeTutorCTA` now links to `/become-tutor`

---

## Test results (run in sandbox)

```
go build ./...                       PASS
go vet ./...                         PASS
gofmt -l (whole module)              0
go test ./internal/service/...       47 tests PASS
legacy/server: go test ./...         9 packages PASS
client: npx tsc --noEmit             PASS
client: npx next build               PASS  (/become-tutor, /admin/vetting included)
API smoke (memory fallback, :8095)   PASS
```

New tests (22 added): profile creation/duplicate/validation, submission guards
(bio/subjects/docs, non-owner 403), full workflow to approval (doc review → verify
→ assessment → approve with ranking + cache invalidation), approve-without-
competency conflict, reject reason required, hold/resume, suspend hides profile,
document review double-review + reject-reason, signed URL authz (owner/stranger/admin),
quiz scoring pass/fail, retake guard, expiry, cross-subject answer rejection,
subject-not-in-scope, insufficient question bank, queue filter/pagination,
dossier timeline, ranking recompute.

### Smoke test transcript (excerpt)

```
POST /tutors/me/vetting/profile         201 profile created (slug test…)
POST .../subjects                       201
POST .../documents                      201 doc + signed upload URL
POST .../submit                         200
POST submit (stranger)                  403
GET  /admin/vetting/queue (non-admin)   403
GET  /admin/vetting/queue?status=…      [Ada Obi] total 1
review → interview → verify             200 200 409 (no approved ID — guard works)
approve doc → verify                    200 200
GET  dossier                            docs 1 · subjects 1 · events 6 · VERIFICATION
POST assessments (no question bank)     409 guard
```

---

## Manifest

### New files
- `migrations/000012_vetting_assessment.{up,down}.sql`
- `internal/domain/vetting/entity.go` (rewritten), `internal/domain/vetting/repository.go`
- `internal/repository/postgres/vetting_repo.go`
- `internal/repository/memory/vetting_memory.go`
- `internal/service/vetting_service.go`, `internal/service/assessment_service.go`
- `internal/service/vetting_service_test.go`
- `internal/middleware/auth.go`
- `internal/transport/http/vetting_handler.go`, `admin_vetting_handler.go`, `object_handler.go`
- `client/features/vetting/{types,api}.ts`
- `client/features/vetting/components/BecomeTutorClient.tsx`
- `client/app/(marketing)/become-tutor/page.tsx`
- `client/app/admin/vetting/page.tsx`
- `docs/PHASE_04_DELIVERY.md`

### Modified
- `internal/domain/tutor/repository.go` (TutorSubjectRepository)
- `internal/domain/academics/entity.go` (SubjectRepository.GetByID)
- `internal/repository/uow.go`, `postgres/uow.go`, `memory/uow.go` (+Vetting, +TutorSubjects)
- `internal/repository/memory/memory.go` (SubjectMemory.GetByID)
- `internal/repository/postgres/` (subject GetByID already present)
- `internal/storage/s3.go` (disk-backed LocalStorage + signed URLs)
- `internal/middleware/recover.go` (stack traces)
- `internal/transport/http/{dto,router}.go`
- `cmd/api/main.go` (vetting wiring + memory AuditRepo fix), `cmd/worker/main.go` (ranking cron)
- `api/openapi.yaml` (26 paths)
- `client/components/home/BecomeTutorCTA.tsx`

## Environment variables (new)
- `YKAY_STORAGE_ROOT` — local dev object root (default: /tmp/ykay-storage)
- `YKAY_STORAGE_BASE_URL` — base for signed URLs (default: http://localhost:8080)
- `YKAY_STORAGE_SECRET` — HMAC secret for dev signed URLs

## Bundle instructions

```
git fetch /path/to/ykay-virtual-phase-04.bundle feature/phase-04-tutor-vetting
git checkout -b feature/phase-04-tutor-vetting FETCH_HEAD   # or merge FETCH_HEAD
```

Then: `docker compose up -d postgres redis` → `go run ./cmd/migrate --cmd=up`
(applies 000001–000012, including the seeded question bank) → `go run ./cmd/api`
→ `go run ./cmd/worker` → `npm --prefix client run dev`.

Try it: open `http://localhost:3000/become-tutor` (append `?user=<uuid>` to pick
a dev actor) and `http://localhost:3000/admin/vetting` — admin actions need the
`X-User-Roles: ADMIN` header in dev, which the page sends automatically.

## Known limitations / next phases
- Auth bridge (headers) → replaced by real sessions in Phase 7 (student/parent
  dashboards)
- Question bank grows via admin console (Phase 11); 32 seeded questions today
- S3/MinIO production storage swap (interface ready; S3_* env vars)
- Notifications for vetting milestones (email/SMS) land with the notification
  engine (Phase 5)

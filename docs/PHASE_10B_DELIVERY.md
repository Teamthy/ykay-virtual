# PHASE 10B — Cohort Session Routing + Stateful Onboarding + Positioning + Full Checklist Audit — DELIVERY

Branch: `feature/phase-10b-cohorts-onboarding` (contains Phases 3–10 + 10B)
Base: `feature/phase-10-reviews-referrals-b2b` @ `3b21d15`
Delivery method: git bundle `ykay-virtual-phase-10b.bundle`

---

## 1. Cohort session routing (the headline)

**Backend**
- `GET /api/v1/cohorts` — published cohort catalogue (status-filtered, cached 300s, programme filter)
- `GET /api/v1/cohorts/{id}/lessons` — **the session schedule** (lessons ordered by start time)
- `GET /api/v1/cohorts/{id}/resources` + `/{id}/assignments` — learning materials per cohort
- `POST /api/v1/lessons/{lessonId}/attendance` — tutor marks attendance (PRESENT/ABSENT/LATE/EXCUSED, upsert per student, **ownership-enforced**: only the lesson's tutor via profile→user match)
- `POST /api/v1/lessons/{lessonId}/notes` — tutor lesson note + homework (ownership-enforced)
- Repos: `CohortRepo.ListPublished`, `LessonRepo.ListByCohort/GetByID`, `AttendanceRepo`, `LessonNoteRepo`, `ResourceRepo`, `AssignmentRepo` (postgres + memory)

**Frontend routes**
- `/cohorts` — **Group Cohorts catalogue** (SSR, revalidate 300): date range, timezone, seats-left badges, fee, empty state linking to programmes/private-tuition
- `/cohorts/[id]` — **cohort detail with the full session schedule** (numbered session cards, dates/times/timezone/status badges), Course JSON-LD, breadcrumbs, sticky enrol card (seats, fee, escrow copy, full → disabled)
- `/cohorts/[id]/enroll` — secure checkout (CheckoutClient) with breadcrumb trail Cohorts → Cohort → Enrol
- Header/footer: **Group Cohorts** added to the Services dropdown, mobile menu and footer

## 2. Positioning statement (enforced)

- `site-data.ts` tagline + hero: **"Expert teaching. Structured learning. Anywhere."** ✅
- Descriptor: **"Ykay Virtual School — British & Nigerian curriculum learning, examination preparation and expert private tuition online."** ✅ (layout metadata, footer, robots/sitemap)
- **Verification note removed** from `/about` (awards/credentials now presented confidently; content team can still confirm wording in their own review) ✅

## 3. Stateful onboarding — different pages per step

**Parents** — `/register` (account + role) → `/onboarding/learner` (add first learner: name, DOB, school, level; progress stepper; skip option) → `/dashboard`. Backend `POST/GET /me/learners` (student profile + guardian link + audit).

**Tutors** — 5 **separate route pages** with shared localStorage state (`ykay-tutor-onboarding`):
`/become-tutor` (landing) → `/become-tutor/apply` (profile) → `/become-tutor/subjects` → `/become-tutor/documents` → `/become-tutor/assessment` → `/become-tutor/status` (live application status). Each page: guards (auth + previous-step), progress stepper, back links — genuinely stateful multi-page onboarding.

**Students** — `/register` → `/dashboard` (student portal).

## 4. Feature-checklist audit (from the working document)

### MVP — launchable commercial product
| # | Feature | Status |
|---|---|---|
| 1 | Marketing website + programme catalogue | ✅ Home, About, Programmes, Subjects, Curricula, Exam Prep, Digital Skills, Pricing, Cohorts, Resources |
| 2 | Student/parent registration | ✅ Register + email verify + role-aware redirect |
| 3 | Tutor application + admin approval | ✅ 5-step onboarding + vetting workflow + admin queue |
| 4 | Private lesson request/booking | ✅ 7-step wizard → support ticket → advisor matching |
| 5 | Cohort application/enrolment | ✅ `/cohorts` catalogue → detail → enroll → escrow checkout |
| 6 | Payment recording/gateway | ✅ Orders, Paystack/Flutterwave init + verified webhooks, escrow |
| 7 | Lesson scheduling + meeting links | ✅ Cohort sessions API + schedule UI; meeting links on lessons (gated) |
| 8 | Student/parent/tutor/admin dashboards | ✅ /student-dashboard, /dashboard, /tutor-dashboard, /admin |
| 9 | Attendance + tutor lesson notes | ✅ **NEW** attendance + notes APIs (ownership-enforced) |
| 10 | Resources/assignments | ✅ **NEW** per-cohort resource + assignment reads |
| 11 | Basic progress report | 🟡 Progress snapshot on student dashboard; reports table exists — term reports later |
| 12 | Email/SMS/WhatsApp-ready notifications | ✅ Notification center + email adapter (console/SMTP); SMS/WhatsApp adapters stubbed |
| 13 | Support/contact workflow | ✅ Trackable support tickets + admin stats |
| 14 | Automated assessments + question banks | ✅ Phase 4 quiz engine (32 seeded questions) |
| 15 | Integrated report cards + gradebook | 🟡 Grade/submission tables exist — UI in teaching-ops phase |
| 16 | Tutor payouts/wallet | ✅ Escrow release + weekly payout cron + wallets |
| 17 | Recorded lesson library | 🟡 Meeting links + resources; recordings require video provider decision |
| 18 | Certificates | 🔲 Planned (content engine phase) |
| 19 | Referral/coupon engine | ✅ Referral full loop (₦2,000 rewards); coupons 🔲 |
| 20 | Advanced analytics | 🟡 Admin stats live; funnel analytics Phase 13 |
| 21 | Mobile/PWA | ✅ Installable PWA, bottom nav, offline shell, CORS |
| 22 | Institutional/school accounts | ✅ B2B forms + institution accounts + admin list |

### Phase 2 / future virtual school
| Feature | Status |
|---|---|
| Formal admissions workflow | 🔲 (roadmap — institutions next) |
| Full timetable + subject registration | 🟡 Cohort sessions exist; per-student timetable later |
| Term/academic-year structure | 🔲 |
| Homeroom/pastoral features | 🔲 |
| Continuous assessment | 🟡 Assessments + attendance; gradebook UI later |
| School reports/transcripts | 🔲 (progress_reports table exists) |
| Virtual assemblies/clubs | 🔲 |
| School-wide parent communication | 🔲 |
| Accreditation/compliance workflows | 🔲 |

**Legend:** ✅ in place · 🟡 partial/table-ready · 🔲 planned (documented in the roadmap)

## 5. Public-route audit (working doc §6) — all present

Home `/` · About `/about` · Programmes `/programmes` · British Curriculum `/curricula/british` · Nigerian Curriculum `/curricula/nigerian` · Exam Prep `/exam-prep` · Subjects `/subjects` · Private Tuition `/private-tuition` · **Group Cohorts `/cohorts` (NEW)** · Digital Skills `/digital-skills` · Find a Tutor `/tutors` · Become a Tutor `/become-tutor` (+4 step pages) · How It Works `/how-it-works` · Pricing `/pricing` · Success Stories `/success-stories` · Resources `/resources` (NEW) · Blog `/blog` · Contact `/contact` · Login `/login` · Register `/register` — every header/footer link resolves (grep-verified, no dead routes).

## 6. Test results (run in sandbox)

```
go build ./...                  PASS    go vet ./...            PASS
gofmt -l (whole module)         0
go test ./internal/service/...  95 tests PASS   (4 new: cohort list published-only,
                                                 attendance+notes, ownership 403,
                                                 learner creation+link)
legacy/server: go test ./...    9 packages PASS
client: npx tsc --noEmit        PASS
client: npx next build          PASS  (11 new routes: cohorts, cohorts/[id],
                                       cohorts/[id]/enroll, resources, onboarding/learner,
                                       become-tutor/{apply,subjects,documents,assessment,status})
API smoke (memory fallback)     PASS  (cohorts catalogue [], learner create+list 1,
                                       attendance 404 on fake lesson, resources/assignments 200)
OpenAPI: 64 paths (validated)
```

## 7. Manifest

### New backend
- `internal/repository/postgres/lesson_ops_repo.go`
- `internal/repository/memory/lesson_ops_memory.go`
- `internal/service/lesson_service.go`, `internal/service/onboarding_service.go`
- `internal/service/cohort_onboarding_test.go`
- `internal/transport/http/lesson_ops_handler.go`, `internal/transport/http/onboarding_handler.go`
- postgres student/link repos (appended to identity_auth_repo.go)

### Modified backend
- `internal/domain/booking/repository.go` (CohortListParams, ListPublished, ListByCohort, GetByID, Attendance/LessonNote/Resource/Assignment repos)
- `internal/service/cohort_service.go` (ListPublished + cache)
- `internal/transport/http/{cohort_handler,router}.go`, `cmd/api/main.go` (+10 routes, service wiring)
- `internal/repository/memory/{uow,identity_memory}.go` (student/link stores wired)
- `api/openapi.yaml` (64 paths)

### New frontend
- `client/app/(marketing)/cohorts/page.tsx`, `cohorts/[id]/page.tsx`, `cohorts/[id]/enroll/page.tsx`
- `client/app/(marketing)/resources/page.tsx`
- `client/app/onboarding/learner/page.tsx`
- `client/features/onboarding/api.ts`
- `client/features/cohorts/api/{list,lessons}.ts`
- `client/features/vetting/useTutorOnboarding.ts`, `components/steps.tsx`
- `client/app/(marketing)/become-tutor/{apply,subjects,documents,assessment,status}/page.tsx`

### Modified frontend
- `client/app/(marketing)/become-tutor/page.tsx` (landing + step cards)
- `client/app/(marketing)/about/page.tsx` (verification note removed)
- `client/app/(auth)/{register,login}/page.tsx` (role-aware onboarding redirects)
- `client/components/layout/{Header,Footer}.tsx` (Cohorts + Resources links)
- `docs/PHASE_10B_DELIVERY.md`
- Removed `client/features/vetting/components/BecomeTutorClient.tsx` (replaced by route pages)

## 8. Bundle instructions (PowerShell — `;` not `&&`)

```
git fetch /path/to/ykay-virtual-phase-10b.bundle feature/phase-10b-cohorts-onboarding
git checkout -b feature/phase-10b-cohorts-onboarding FETCH_HEAD
go run ./cmd/migrate --cmd=up
go run ./cmd/api
npm --prefix client install
npm --prefix client run dev
```

Try it: register as a parent → `/onboarding/learner` → dashboard. Register as a tutor → `/become-tutor/apply` → through the 5 step pages. Visit `/cohorts` → detail with the session schedule → enroll.

# PHASE 11B — Portal Suite Implementation: Student · Parent · Tutor · Admin — DELIVERY

Branch: `feature/phase-11b-portals` (contains Phases 3–11 + 11B)
Base: `feature/phase-06c-wireframes` @ `1e89367`
Delivery method: git bundle `ykay-virtual-phase-11b.bundle`

---

## What was implemented (working-document §9–§15)

### Backend (new portal + admin APIs — OpenAPI now 80 paths)
| Endpoint | Purpose |
|---|---|
| `GET/POST /me/availability`, `DELETE /me/availability/{id}` | Tutor recurring availability (day 0-6, HH:MM, idempotent upsert) |
| `GET/POST /me/availability-exceptions`, `DELETE .../{id}` | Days off / ad-hoc availability |
| `GET /me/assignments?student_profile_id=` | Assignments for the student's confirmed cohorts (SQL join) |
| `POST /me/assignments/{id}/submit` | Assignment submission (idempotent upsert; migration 000015 adds UNIQUE) |
| `GET /me/attendance-summary` | Present/absent/late/excused/untracked + rate |
| `GET /me/orders/{orderId}` | **Parent receipt** — order + items + payments (owner authz → 403) |
| `GET /admin/stats/overview2` | Extended KPIs: lessons this week/today, cohorts published, pending enrolments, overdue lesson notes, pending refunds |
| `GET /admin/support`, `POST /admin/support/{id}/status` | Support queue + resolution workflow |
| `GET/POST /admin/cohorts`, `POST /admin/cohorts/{id}/status` | Cohort manager (create DRAFT → publish/cancel/complete) |
| `GET /admin/lessons/today` | Today's classes overview |
| `POST /admin/orders/{id}/confirm-payment` | **Manual/admin-confirmed payment** (per §15: order → PAID, enrollment CONFIRMED, escrow held, referral qualify — idempotent) |

Migration `000015_portals`: submissions UNIQUE(assignment, student), indexes for student submissions / lessons-by-date / support queue.

### Student portal (§9) — `/student-dashboard`
Side nav **Dashboard | My Classes | Calendar | Resources | Assignments | Progress** +
Messages/Notifications/Support. Today panel with [Join class] (link only when the
meeting URL is set — window-gated), progress cards (attendance % from the API,
assignments submitted/total, lessons completed), **calendar grouped by date** with
timezone always shown, **assignment submission** with toast + submitted/feedback
state, attendance breakdown, resources + support links. UTC internally, display
in lesson timezone with the timezone always visible (§14 requirement).

### Parent portal (§10) — `/dashboard`
**SELECT LEARNER dropdown** (from `/me/learners`), outstanding action / **next
payment** (amber alert → complete payment), today/upcoming lessons with join
links, **attendance summary** grid, progress snapshot, tutor notes placeholder,
**payments & receipts** list with a **receipt modal** (order + items + payments),
Book more tuition / Find a programme / Message support CTAs, ReferralCard.

### Tutor portal (§11) — `/tutor-dashboard`
Status + **profile completion bar**, Today's lessons with [Open lesson] [Join
class], **availability editor** (add/remove weekly slots + exceptions with toasts),
**attendance roster** (mark PRESENT/LATE/ABSENT/EXCUSED per completed lesson —
ownership-enforced server-side), lesson notes outstanding, cohorts/private
learners, **earnings summary** (held/released/paid), Messages/Notifications/Support.

### Admin portal (§12) — `/admin`
KPI cards (active learners | tutors approved | cohorts published | revenue in
escrow, plus lessons this week/today, pending enrolments, orders, blog),
**"Needs attention" panel** (pending enrolments, overdue lesson notes = QA alert,
support tickets, disputed escrow, pending refunds), module quick links, and new
pages: **/admin/cohorts** (create + publish/cancel/complete), **/admin/support**
(ticket queue + start/resolve/close), **/admin/lessons** (today's classes).
Sidebar updated with all modules (Users, Tutors, Programmes, Cohorts, Private
Tuition, Lessons, Learning, Reports, Finance, Content, Communications, Support,
System — per §12; remaining deep modules fold into the next admin iteration).

### Vetting (§13) / Scheduling (§14) / Payments (§15) — already in place
- Vetting: staged workflow, attributable + timestamped events, private-bucket
  signed URLs (engineering requirement met — Phases 4/8)
- Scheduling: cohorts/packages/lessons/attendance objects with required fields;
  UTC storage + timezone display (met in portals)
- Payments: order-before-charge, signature-verified webhooks (never trust
  redirect), receipts/references, **manual admin confirmation now added**,
  refund status+reason tracked, escrow+payouts separated from customer payments

## Test results (run in sandbox)
```
go build ./...                  PASS    go vet ./...            PASS
gofmt -l (whole module)         0
go test ./internal/service/...  100 tests PASS   (5 new portal tests:
                                                 availability CRUD + idempotent upsert,
                                                 exceptions validation,
                                                 submission requires content,
                                                 attendance summary math,
                                                 receipt authz 403)
legacy/server: go test ./...    9 packages PASS
client: npx tsc --noEmit        PASS
client: npx next build          PASS  (student-dashboard, dashboard, tutor-dashboard,
                                       admin, admin/cohorts, admin/support, admin/lessons)
API smoke (memory fallback)     PASS
  - stats2 extended KPIs ✅ · support create→queue→IN_PROGRESS ✅
  - cohort create DRAFT → publish ✅ · lessons today ✅
  - availability upsert/list ✅ · exceptions ✅
  - assignments/attendance summary ✅ · manual payment 404 guard ✅ · receipt 404 guard ✅
```

## Manifest
### New backend
- `migrations/000015_portals.{up,down}.sql`
- `internal/repository/postgres/portal_repos.go`, `internal/repository/memory/portal_memory.go`
- `internal/service/portal_service.go`, `internal/service/portal_service_test.go`
- `internal/transport/http/portal_handler.go`
- `internal/domain/{booking,tutor}/repository.go` (Availability/Submission/CohortAdmin/LessonAdmin)
- `internal/domain/admin/stats.go` (Overview2)

### Modified backend
- `internal/service/{payment_service,admin_service,lesson_ops_repo}.go`
- `internal/transport/http/{admin_handler,router}.go`, `cmd/api/main.go`
- `internal/repository/{postgres,memory}/{support_repo,admin_memory,uow,lesson_ops}.go`
- `api/openapi.yaml` (80 paths)

### New frontend
- `client/features/portal/api.ts`
- `client/app/student-dashboard/page.tsx` (full portal rewrite)
- `client/app/dashboard/page.tsx` (parent portal rewrite)
- `client/app/tutor-dashboard/page.tsx` (tutor portal rewrite)
- `client/app/admin/{support,cohorts,lessons}/page.tsx`
- `client/app/admin/page.tsx` (extended KPIs)

### Modified frontend
- `client/app/admin/layout.tsx` (full module sidebar)
- `client/features/admin/api.ts` (portal admin endpoints)
- `docs/PHASE_11B_DELIVERY.md`

## Bundle instructions (PowerShell — `;` not `&&`)
```
git fetch /path/to/ykay-virtual-phase-11b.bundle feature/phase-11b-portals
git checkout -b feature/phase-11b-portals FETCH_HEAD
go run ./cmd/migrate --cmd=up
go run ./cmd/api
npm --prefix client install
npm --prefix client run dev
```
Try: student portal (calendar + assignments), parent portal (learner switcher +
receipts), tutor portal (availability + attendance roster), admin (KPI dashboard
+ support queue + cohort manager + today's classes + manual payment confirm).

## Remaining roadmap
- Phase 12: search ranking polish; Phase 13: observability (OTel + Prometheus);
  Phase 14: k6 load + ZAP security; Phase 15: CI/CD + cloud launch; Phase 16: SEO ops.

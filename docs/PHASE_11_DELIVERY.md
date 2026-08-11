# PHASE 11 — Admin Operations Console — DELIVERY

Branch: `feature/phase-11-admin-console` (contains Phases 3–8 + 11)
Base: `feature/phase-08-auth-completion` @ `9b361f1`
Delivery method: git bundle `ykay-virtual-phase-11.bundle`

---

## What was built

### Backend — admin API (all endpoints admin-gated, session-cookie auth)

| Endpoint | Purpose |
|---|---|
| `GET /admin/stats` | Operations overview — users, active users, tutors (total/approved/pending), orders (total/paid), **revenue held in escrow**, revenue paid out, blog published/drafts, institutions, referrals, reviews pending, support open, escrow disputed |
| `GET /admin/blog` | All posts (any status) with status filter, search, server pagination, sort |
| `POST /admin/blog` | Create post — title/content validation, **auto-slug** (slugify), subject/exam tags, publish sets `published_at` once; audit-logged |
| `PUT /admin/blog/{postId}` | Update fields + tags; audit-logged |
| `POST /admin/blog/{postId}/status` | DRAFT / SCHEDULED / PUBLISHED / ARCHIVED (idempotent publish) |
| `GET /admin/institutions` | B2B accounts (schools/corporate/gov/ngo) with search + type filter |
| `GET /admin/referrals` | Referral programme list with status filter |
| `GET /admin/reviews` | Moderation queue (PENDING/PUBLISHED/HIDDEN/FLAGGED, tutor filter) |
| `POST /admin/reviews/{reviewId}/moderate` | Publish/hide/flag; **publish without `consent_given` → 409** (SEO Review JSON-LD uses consented reviews only) |

Layers: domain interfaces (`content/admin_repository.go`, `institution/repository.go`,
`referral/repository.go`, `review/repository.go`, `admin/stats.go`) → postgres
(`admin_repos.go`, `stats_repo.go` single-pass SQL aggregates) + memory fakes →
`service.AdminService` (validation, audit on every mutation) → `transport/http/admin_handler.go`
→ router + main wiring (both Postgres and memory fallback branches).

### Frontend — `/admin` console (role-gated by the session)
- **`/admin/layout.tsx`** — sidebar shell (Overview, Tutor vetting, Blog CMS, Institutions,
  Referrals, Reviews) + admin gate: non-admins see "Admin access required" (server also enforces 403)
- **`/admin`** — overview dashboard: People / Money / Content & ops stat cards,
  "Needs attention" panel (open support, disputed escrow)
- **`/admin/blog`** — blog CMS: status filter pills, search, server-paginated table,
  publish/archive/restore actions, **create-post form** (title/slug/excerpt/content/SEO/status)
- **`/admin/institutions`** — type-filtered table with active badges
- **`/admin/referrals`** — status-filtered table with reward amounts
- **`/admin/reviews`** — moderation queue: consent flag, publish (disabled without consent) /
  hide / flag / unpublish
- Existing `/admin/vetting` queue integrated into the layout (container adjusted)

### API contract
OpenAPI now **54 paths / 24 schemas** (was 46/22): all admin endpoints documented
with the `sessionCookie` security scheme + `AdminStats` / `BlogDraft` schemas. YAML validated.

---

## Test results (run in sandbox)

```
go build ./...                  PASS    go vet ./...            PASS
gofmt -l (whole module)         0
go test ./internal/service/...  80 tests PASS   (6 new admin tests:
                                                 create+slug+tags+publish,
                                                 validation + slug conflict,
                                                 status transitions,
                                                 review consent gate (409),
                                                 lists (institutions/referrals/overview),
                                                 update)
legacy/server: go test ./...    9 packages PASS
client: npx tsc --noEmit        PASS
client: npx next build          PASS  (/admin, /admin/blog, /admin/institutions,
                                       /admin/referrals, /admin/reviews, /admin/vetting)
API smoke (memory fallback)     PASS
```

### Smoke transcript (excerpt)
```
POST /auth/register (SUPER_ADMIN) + login   → admin cookie
GET  /admin/stats (admin cookie)            200 (users/tutors/orders/escrow)
GET  /admin/stats (no session)              401
POST /admin/blog {"title":"Admin Console Test Post","content":"...","status":"PUBLISHED"}
                                            → slug admin-console-test-post, PUBLISHED
GET  /admin/blog?status=PUBLISHED           1 post
POST /admin/blog/{id}/status {"status":"DRAFT"}   → DRAFT
GET  /admin/institutions / referrals / reviews    → empty (memory mode; real data via Postgres)
GET  /admin/blog (PARENT cookie)            403
```

## Manifest

### New backend
- `internal/domain/content/admin_repository.go`
- `internal/domain/institution/repository.go`
- `internal/domain/referral/repository.go`
- `internal/domain/review/repository.go`
- `internal/domain/admin/stats.go`
- `internal/repository/postgres/admin_repos.go`, `internal/repository/postgres/stats_repo.go`
- `internal/repository/memory/admin_memory.go`, `internal/repository/memory/helpers.go`
- `internal/service/admin_service.go`, `internal/service/admin_service_test.go`
- `internal/transport/http/admin_handler.go`

### Modified backend
- `internal/transport/http/router.go` (+9 admin routes, Admin handler)
- `cmd/api/main.go` (AdminService wiring, Stats/AdminBlog/Institutions/Referrals/Reviews repos, both branches)
- `api/openapi.yaml` (54 paths, sessionCookie scheme)

### New frontend
- `client/features/admin/api.ts`
- `client/app/admin/layout.tsx`
- `client/app/admin/page.tsx`
- `client/app/admin/blog/page.tsx`
- `client/app/admin/institutions/page.tsx`
- `client/app/admin/referrals/page.tsx`
- `client/app/admin/reviews/page.tsx`

### Modified frontend
- `client/app/admin/vetting/page.tsx` (container fits admin layout)
- `docs/PHASE_11_DELIVERY.md`

## PowerShell note
PowerShell 5.1 does not support `&&` — use `;` or separate lines.

## Bundle instructions

```
git fetch /path/to/ykay-virtual-phase-11.bundle feature/phase-11-admin-console
git checkout -b feature/phase-11-admin-console FETCH_HEAD
go run ./cmd/migrate --cmd=up
go run ./cmd/api
npm --prefix client install
npm --prefix client run dev
```

Try it: register a `SUPER_ADMIN` account (or use the dev flow), log in →
`/admin` overview → `/admin/blog` create + publish a post → `/admin/reviews`
moderation queue → `/admin/vetting` queue.

## Known limitations / next phases
- Stats show live Postgres numbers; memory mode returns zeroes (by design)
- Exam/subject tag pickers in the blog form send IDs (list endpoints exist in the
  catalogue API for dropdowns — wire them when subjects are seeded in Postgres)
- Next: **observability (Phase 13)** — OTel/Prometheus dashboards, and
  **load/security testing (Phase 14)** — k6 + ZAP, then CI/CD launch (Phase 15)

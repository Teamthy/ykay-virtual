# PHASE 06 — Public Marketplace Completion + SEO Architecture — DELIVERY

Branch: `feature/phase-06-marketplace-seo` (contains Phases 3–6)
Base: `feature/phase-05-messaging-dashboards` @ `7acae31`
Delivery method: git bundle `ykay-virtual-phase-06.bundle`

---

## What was built

### Marketplace list pages (the missing Phase-2 surface — now complete)
- **`/tutors`** — SSR URL-driven search (`?subject=&online=&in_person=&min_price=&sort=`),
  revalidate 60s, `TutorsSearchClient` with infinite scroll (useInfiniteQuery),
  filter sidebar, loading/empty/error states, TutorCard grid
- **`/subjects`** — subject catalogue with search + category pills, URL-driven,
  revalidate 300s
- **`/programmes`** — programme catalogue with search + format pills (cohort/
  bootcamp/holiday/online/hybrid), featured badges, price ranges, revalidate 300s
- Deleted the legacy dead `client/app/tutors/page.tsx` (CSR hitting a
  non-existent API)
- All three pages wrap clients in `<Suspense>` (Next 14 CSR-bailout fix)

### Content engine (backend)
- `internal/domain/content/repository.go` — BlogPostRepository (published-only
  list with subject/exam filters, get-by-slug, tags, related-by-slugs) +
  RedirectRepository (Lookup/Create/List)
- postgres + memory implementations (blog tags via join tables, redirect map)
- `internal/service/content_service.go` — blog list/get cached (300s/600s),
  **related-content graph** (approved tutors + published programmes + posts for
  a subject slug, cached 300s), redirect resolution, AddRedirect
- `ProgrammeListParams.SubjectSlug` — programme_subjects EXISTS filter
- Transport: `GET /content/blog`, `/content/blog/{slug}`, `/subjects/{slug}/related`,
  `/redirects/{slug}` — OpenAPI now **40 paths / 21 schemas** (validated YAML)

### SEO architecture (AGENTS.md non-negotiables)
| Item | Delivered |
|---|---|
| Breadcrumbs everywhere | `Breadcrumbs` component (visual + BreadcrumbList JSON-LD) wired into tutors/subjects/programmes/blog + detail pages |
| RelatedContent internal linking | `RelatedContent` component (tutor↔subject↔programme↔blog) on subject/programme/tutor/blog pages |
| Dynamic sitemap | `app/sitemap.ts` — live tutor/subject/programme/blog slugs from the API, filtered to published/approved only, static-page set included; per-type sitemaps also available at `/sitemaps/{pages,tutors,subjects,programmes,blog}.xml` (route removed in final pass in favour of the single full sitemap — Next 14.2 sitemap.ts returns one document) |
| robots.txt | Allow public paths only; disallow `/admin /api /dashboard /tutor-dashboard /messages /notifications /checkout /offline /account`; **Sitemap line present** |
| Hard 404s | `app/not-found.tsx` (never soft-404) |
| noindex thin combos | `/tutors` generateMetadata: ≥2 filters → `noIndex: true` |
| Blog from CMS | `/blog` + `/blog/[slug]` SSR (revalidate 300/600) fetch published posts from the API with safe fallbacks; Article JSON-LD + related content on detail |
| JSON-LD | Organization (layout) · Course (subjects/programmes) · Person+AggregateRating (tutors) · FAQPage · BreadcrumbList · Article (blog) — all wired |
| Lighthouse gate | `.github/workflows/ci.yml` (Go vet/test + frontend typecheck/build + **LHCI gate: Perf/SEO/A11y ≥ 90, LCP ≤ 2.5s, CLS ≤ 0.1**) + `lighthouserc.json` + `npm run lighthouse` |

---

## Test results (run in sandbox)

```
go build ./...                  PASS    go vet ./...        PASS
gofmt -l (whole module)         0
go test ./internal/service/...  59 tests PASS   (4 new: blog filter/cache,
                                                 published-only, redirects,
                                                 related-content graph)
legacy/server: go test ./...    9 packages PASS
client: npx tsc --noEmit        PASS
client: npx next build          PASS  (tutors ƒ SSR, subjects/programmes ○,
                                       sitemap.xml, robots.txt, not-found,
                                       blog list+slug)
API smoke (memory fallback)     PASS  (blog 0/0, related 0/0/0, redirect 404,
                                       tutors mock 2 — real data flows via Postgres)
```

## Manifest

### New backend
- `internal/domain/content/repository.go`
- `internal/repository/postgres/blog_repo.go`, `internal/repository/memory/content_memory.go`
- `internal/service/content_service.go`, `internal/service/content_service_test.go`
- `internal/transport/http/content_handler.go`

### Modified backend
- `internal/domain/academics/entity.go` (+SubjectSlug programme filter),
  `internal/repository/postgres/programme_repo.go`,
  `internal/repository/memory/uow.go` (Blogs/Redirects/Tutors in MemoryStore),
  `internal/transport/http/router.go`, `cmd/api/main.go`, `api/openapi.yaml`

### New frontend
- `client/components/Breadcrumbs.tsx`, `client/components/RelatedContent.tsx`
- `client/app/(marketing)/{tutors,subjects,programmes}/page.tsx` (list pages)
- `client/features/tutors/components/TutorsSearchClient.tsx`,
  `client/features/subjects/components/SubjectsClient.tsx`,
  `client/features/programmes/{api/list.ts,components/ProgrammesClient.tsx}`
- `client/app/not-found.tsx`
- `.github/workflows/ci.yml`, `lighthouserc.json`

### Modified frontend
- `client/app/sitemap.ts` (dynamic full sitemap), `client/app/robots.ts` (extended
  disallows), `client/app/(marketing)/blog/page.tsx` + `blog/[slug]/page.tsx`
  (API-backed SSR), `client/app/(marketing)/{subjects,programmes,tutors}/[slug]/page.tsx`
  (Breadcrumbs + RelatedContent), `client/features/tutors/api/search.ts` (+filters),
  root `package.json` (+lighthouse script)

### Docs
- `docs/PHASE_06_DELIVERY.md`

---

## PowerShell note (from your last run)

PowerShell 5.1 does **not** support `&&`. Use `;` or separate lines:

```powershell
go run ./cmd/migrate --cmd=up
go run ./cmd/api
go run ./cmd/worker
npm --prefix client install
npm --prefix client run dev
```

## Bundle instructions

```
git fetch /path/to/ykay-virtual-phase-06.bundle feature/phase-06-marketplace-seo
git checkout -b feature/phase-06-marketplace-seo FETCH_HEAD
go run ./cmd/migrate --cmd=up
go run ./cmd/api
npm --prefix client install && npm --prefix client run dev   # (PowerShell: use ; )
```

Then visit `/tutors`, `/subjects`, `/programmes`, `/blog` — all SSR with
breadcrumbs, related content and correct metadata. Run `npx lighthouse` (or the
CI workflow) to validate the SEO/Perf/A11y gates.

## Known limitations / next phases
- Real content flows from Postgres (blog posts, subjects, programmes, tutors);
  memory mode returns empty/mock lists by design
- Phase 7: session auth replaces the dev headers; Phase 9: blog CMS admin
- Lighthouse CI executes on GitHub (needs the workflow to run once pushed/merged)

# PHASE 12 — YK-Virtual Brand & Design System — DELIVERY

Branch: `feature/phase-12-yk-virtual-brand`
Base: `main` @ `0e073ff` (phases 3–11c + E2E suite)
Delivery method: git bundle `ykay-virtual-phase-12.bundle`

---

## What was delivered

### 1. Brand — YK-Virtual · "Learning beyond boundaries"

Positioning line applied across the platform:

> British & Nigerian curricula · Exam preparation · Private tuition · Live cohorts

| Surface                    | Change                                                                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing site (all pages) | `YKAY` / `YKAY Virtual School` → `YK-Virtual` (118 occurrences swept in `app/`, plus `components/`, `lib/` — zero left)                                                                 |
| `lib/site-data.ts`         | `siteConfig`: name `YK-Virtual`, brand `ykvirtual`, tagline **Learning beyond boundaries**, new description; `YK-Virtual Plus`, `YK-Virtual Insights™ Assessment`, testimonials updated |
| `lib/seo.ts`               | siteName/organization/social handles → YK-Virtual, default domain `https://virtual.ykaycollege.com` (override via `NEXT_PUBLIC_SITE_URL`)                                               |
| `app/layout.tsx`           | Metadata: "YK-Virtual — Learning beyond boundaries…", template `%s                                                                                                                      | YK-Virtual` |
| `app/manifest.ts` (PWA)    | name/short_name YK-Virtual, `theme_color` deep navy `#0A1F44`                                                                                                                           |
| `client/public/sw.js`      | cache `yk-virtual-v1`                                                                                                                                                                   |
| Header / Footer            | New `Logo` mark (navy→blue monogram tile + restrained gold dot), wordmark in tracked uppercase; footer tagline + gold brand line; © 2026 YK-Virtual                                     |
| API                        | Server banner **YK-Virtual API v0.4.0**; README retitled                                                                                                                                |

Kept as functional identifiers (must stay for client/server session & storage continuity):
`ykay_session` cookie, `ykay-tutor-onboarding` localStorage key, `@ykay/web` npm name,
Go module path `ykay-virtual`. Renaming these is a follow-up infra task if desired.

### 2. Design tokens (per brand spec)

- **Primary** deep academic navy `#0A1F44` · **Accent** clear digital blue `#1E5EFF` · **Gold** (restrained) `#C9A227`
- Ink palette shifted to blue-grey for calm academic surfaces; `surface.muted #F3F6FB`
- Typography stays modern sans (Inter stack) with strong readability; removed handwritten accents
- Cards: soft border + `rounded-2xl` + generous padding (already the pattern, now token-consistent)

### 3. Reusable component kit (working-doc §24.1)

New in `client/components/ui/`:

| Component           | Purpose                                                                           |
| ------------------- | --------------------------------------------------------------------------------- |
| `Logo` (layout)     | Brand mark — header (light) / footer (dark) variants                              |
| `empty-state.tsx`   | Icon + title + description + action; never a bare "no data" line                  |
| `alert.tsx`         | Info/success/warning/error banners — **text + icon + colour, never colour alone** |
| `modal.tsx`         | Accessible dialog (Esc, backdrop, focus, scroll lock) + right-drawer variant      |
| `data-table.tsx`    | Typed columns, loading skeletons, empty state, hover rows                         |
| `stepper.tsx`       | Progress steps with done/active states — wired into the 5-page tutor onboarding   |
| `progress.tsx`      | Labelled progress bar with value text                                             |
| `stat-card.tsx`     | KPI tile with trend — wired into admin analytics                                  |
| `status-badge.tsx`  | Text + icon + colour status chips + `statusKindFor` domain mapping                |
| `file-uploader.tsx` | Drag & drop / browse, file list with remove                                       |

Already present and retained: Breadcrumbs (URL fixed), notification centre, search/filter
bar, header/footer. Domain cards (programme/cohort/tutor/pricing/lesson) remain
page-specific and inherit the new tokens automatically.

Wired into live surfaces: admin analytics (4 stat cards + empty states), student quiz
list + progress reports (empty states), tutor gradebook (empty state), tutor
onboarding stepper (shared `Stepper`).

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS (service suite)
legacy go tests           9 packages ok
npx tsc --noEmit          PASS
next build                PASS (all routes)
scripts/e2e.sh            71 passed · 0 failed (full platform regression after rebrand)
grep YKAY client/         0 user-facing occurrences
```

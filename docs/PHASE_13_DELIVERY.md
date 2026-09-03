# PHASE 13 — YK-Virtual Design Rollout II: Typography, Hero & Admin Console — DELIVERY

Branch: `feature/phase-13-yk-virtual-rollout`
Base: `main` @ `d5380f6` (phase 12 — YK-Virtual brand + design system)
Delivery method: git bundle `ykay-virtual-phase-13.bundle`

---

## What was delivered

### 1. Self-hosted typography (per brand spec: modern sans, strong readability)

- Inter now loads via `next/font/google` with `variable: --font-inter` and is
  bundled at build time — **no runtime Google Fonts dependency** (works fully
  offline and in sandboxed previews), with `display: swap` for fast text paint.
- Removed the external `fonts.googleapis.com` links and the now-unused Caveat
  handwritten face; dropped `font-handwritten` from the Tailwind theme and
  globals (no usages remained after phase 12).

### 2. Homepage hero on-brand

All 6 hero slides updated in `lib/site-data.ts`:

- Lead slide now opens with the brand line: **"Learning beyond boundaries"**
  with the full positioning strip as its tag: _British & Nigerian Curricula ·
  Exam Prep · Private Tuition · Live Cohorts_.
- Palette moved from legacy blue/green to the YK-Virtual system:
  deep navy `#0A1F44` and digital blue `#1E5EFF` alternating, with the
  YK-Virtual Plus premium slide on `#060F26` (deep navy-dark).

### 3. Admin console on the design kit (§24.1 components in production)

| Page                  | Upgrade                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/cohorts`      | Full rewrite on **DataTable** + **StatusBadge** (text+icon+colour) + **EmptyState** + capacity **Progress** bars; navy filter pills |
| `/admin/support`      | Rewrite on DataTable + StatusBadge + EmptyState (ticket queue)                                                                      |
| `/admin/vetting`      | Status badges → StatusBadge with domain status mapping; EmptyState for empty queues; navy active filter                             |
| `/admin/lessons`      | Lesson status chips → StatusBadge; EmptyState for "no lessons today"                                                                |
| `/admin/reviews`      | Review status chips → StatusBadge; EmptyState for moderation queue                                                                  |
| `/admin/referrals`    | Referral status chips → StatusBadge; EmptyState                                                                                     |
| `/admin/institutions` | Institution type chips → StatusBadge; EmptyState                                                                                    |

`StatusBadge` carries the brand rule from the working doc: **status is always
text + icon + colour, never colour alone** (`statusKindFor` maps
APPROVED/CONFIRMED/PAID → success, PENDING/UNDER_REVIEW/IN_PROGRESS → pending,
REJECTED/SUSPENDED/CANCELLED → error, DRAFT/HOLD/ARCHIVED → neutral).

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS
npx tsc --noEmit          PASS
next build                PASS (all routes)
scripts/e2e.sh            71 passed · 0 failed (regression after admin rewrites)
```

# PHASE 15 — YK-Virtual Page Heroes & Messaging Surfaces — DELIVERY

Branch: `feature/phase-15-yk-virtual-heroes`
Base: `main` @ `64e6b47` (phase 14)
Delivery method: git bundle `ykay-virtual-phase-15.bundle`

---

## What was delivered

### 1. PageHero — reusable marketing header band

New `components/layout/PageHero.tsx`: full-width navy gradient banner
(`brand-navy-dark → brand-navy → brand-blue`) with decorative glows,
breadcrumbs (light variant), optional gold eyebrow, title, subtitle and a CTA
row slot. Supports left or centered alignment. Consistent with the AuthShell
and checkout panels — every page header now speaks the same YK-Virtual language.

Applied to 8 flagship marketing pages (their flat headers replaced):

| Page               | Eyebrow                | Align  | CTAs kept                               |
| ------------------ | ---------------------- | ------ | --------------------------------------- |
| `/programmes`      | —                      | left   | —                                       |
| `/tutors`          | —                      | left   | —                                       |
| `/subjects`        | —                      | left   | —                                       |
| `/cohorts`         | Learn together         | center | —                                       |
| `/pricing`         | Clear, honest pricing  | center | yes                                     |
| `/private-tuition` | One learner, one tutor | center | yes                                     |
| `/exam-prep`       | Exam season, handled   | center | yes (revision cohort + private support) |
| `/digital-skills`  | The digital academy    | center | yes                                     |

JSON-LD scripts (breadcrumb/course/faq) are preserved on pages that have them.

### 2. Notifications centre on the §24.1 kit

`/notifications` list upgraded: notification rows are now **Card**s with
unread state (navy dot + `bg-brand-blue-light` tint + **StatusBadge "New"**
for unread, click-to-read retained), and the empty state uses **EmptyState**
("No notifications yet — booking updates, messages and payment events will
appear here").

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS
npx tsc --noEmit          PASS
next build                PASS (all routes)
scripts/e2e.sh            71 passed · 0 failed
```

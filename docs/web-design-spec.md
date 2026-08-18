# NUVORA Web — Design Specification & Screen-by-Screen Reference

**Status:** live spec · **Owner:** design-system · **Applies to:** `client/`
Single source of truth for the web product's look, behaviour, states, and
accessibility. Mirrors the mobile design brief so web and mobile stay one
coherent product.

---

## 1. Design Principles
1. **Distinctive brand, not "AI-looking"** — NUVORA uses a real brand:
   neon green `#70F250` + deep green `#013920` + peach `#FFF7E4`, with
   **Anton** (display) + **DM Sans** (body). This is intentional and
   product-specific, not the generic purple/blue AI gradient look.
2. **Light, warm surfaces** — peach-toned light backgrounds, white cards.
3. **Green is the primary accent** for actions/emphasis. Navy for headings.
4. **Consistent tokens** — one radius/spacing/type scale across every page.
5. **No fabricated claims** — real photography, verified metrics, no invented
   stats or press logos. Marketing copy is specific and truthful.
6. **Restrained motion** — subtle reveals/hovers; no decorative animation.

---

## 2. Tokens (source: `tailwind.config.ts` + `globals.css`)
- **Brand:** primary `#70F250`, deep-green `#013920`, peach `#FFF7E4`, black/white.
- **Radius:** rounded (12px) → rounded-2xl (20px) → rounded-3xl (24px).
- **Type:** Anton for display headings, DM Sans for body; sizes via Tailwind.
- **Surfaces:** white cards on peach/muted backgrounds; dark `surface-dark`
  (`#013920`) for contrast sections.

---

## 3. Layout / Navigation
- Public marketing site: header nav + footer, SEO-first.
- App shell (`AppShell`): left sidebar nav (parent/student/tutor/admin
  variants), header with session chip + notifications.
- Route groups: `(marketing)`, `(auth)`, `account`, `admin`, `dashboard`,
  `lms`, `onboarding`.

---

## 4. Reusable Components & States
| Component | States |
|---|---|
| Button | default · hover · active · disabled · loading |
| Card | default · hover (lift) · interactive |
| Skeleton | shimmer pulse, layout-stable |
| EmptyState | icon + title + description + CTA |
| StatusBadge | text + icon + colour (never colour alone) |
| DataTable | loading skeleton · empty state · pagination |
| Modal | open/close, focus |
| Alert | info/success/warning/error |

---

## 5. Screen-by-Screen Spec (abbreviated)
For every screen document: purpose, hierarchy, loading, empty, error, success,
accessibility, responsive.

### 5.1 Home (`/`)
- **Hierarchy:** hero (split) → services → programmes → cohorts → how it
  works → testimonials → exam prep → guarantee → travel/care → FAQ → app CTA →
  tutor CTA.
- **Loading:** SSG/ISR, static; **Empty:** n/a (marketing).

### 5.2 Marketing pages (`/tutors`, `/programmes`, `/cohorts`, ...)
- **Loading:** ISR + `Skeleton` for client-fetched sections.
- **Empty:** `EmptyState` ("No cohorts open").
- **Error:** gracefully degrade to empty + CTA.

### 5.3 Auth (`/login`, `/register`, `/verify-email`, `/reset-password`)
- **States:** loading on submit, inline validation errors, success → redirect.

### 5.4 Admin dashboards (`/admin/*`)
- **Loading:** skeletons (`DataTable` skeleton, `Skeleton`).
- **Empty:** `EmptyState`; **Error:** inline + retry.
- **Access control:** role-gated server-side (SUPER_ADMIN vs ACADEMIC_ADMIN).

### 5.5 Dashboards (parent/student/tutor) + LMS
- **Loading:** skeletons; **Empty:** `EmptyState`; **Error:** inline.
- **Role separation:** each role routes to its own dashboard/LMS.

---

## 6. Accessibility (WCAG-oriented)
- Semantic HTML, skip-link, focus states, `alt` text, contrast AA.
- `axe` + Lighthouse a11y gates run in CI.
- Non-colour-only communication (StatusBadge text+icon+colour).

---

## 7. Responsive
- Mobile-first Tailwind breakpoints; fluid grids; container-x.
- Header → mobile nav; sidebars collapse; marketing stacks.

---

## 8. Do / Don't
**Do:** consistent tokens · real photography · truthful copy · empty/error
states · skeleton loading · role-aware dashboards · subtle motion.

**Don't:** generic AI gradients · invented stats/press · glassmorphism ·
inconsistent radii/spacing · template dashboards · decorative charts ·
arbitrary accent colours · meaningless statistics.

---

## 9. AI-Looking Design Audit Checklist
Before shipping a page, confirm it does NOT have:
- generic gradient hero (purple/blue) — ✗
- excessive rounded-card grids with no hierarchy — ✗
- generic SaaS dashboard template — ✗
- random accent colours — ✗
- fabricated metrics / press logos — ✗
- inconsistent typography/spacing — ✗
- meaningless decorative elements — ✗
If any are present, the page must be revised.

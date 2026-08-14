# NUVORA — Web UI Optimization Plan (all pages)

**Goal:** consistent, fast, accessible surfaces across the 30+ marketing
pages and the app shell. **Status: planning + first wins shipped —
execution next tranche.**

## Already shipped (Phase 47 → 48)

- TestimonialSlider a11y fix (aria-labels + aria-current — the axe gate's
  critical violation).
- **Consent-gated testimonials (Phase 48):** carousel + section now fetch
  /content/testimonials; fixture export deleted; demo/staging seeds carry
  consent evidence. (Finding #2 closed.)
- **Contrast tokens (Phase 48):** ink-500/ink-400 darkened to AA —
  landing serious violations 52 → 31 nodes. (Finding #1 partially —
  remaining 31 are trust-logo spans + italic/font-light accents.)
- Browser E2E proving catalogue → checkout → LMS flows render correctly
  (Phase 47).

## Known findings (measured, not guessed)

| # | Finding | Source | Action |
|---|---|---|---|
| 1 | **52 color-contrast nodes** on the landing page (serious, axe) | e2e/axe.spec.ts | fix text/ink-on-gold combos OR formal acceptance register with dates (G6.2) |
| 2 | Landing testimonial slider uses hard-coded `lib/site-data` | code review | switch to consent-gated `/content/testimonials` (G5.3) — fixtures must not ship in production |
| 3 | Standalone server static assets were uncopied in CI boot | G6 fix | done (layout-tolerant boot + static copy) |
| 4 | Audit remaining icon-only buttons across admin/tutor consoles | axe on 3 pages only | run axe on /admin/*, /lms/*, /tutor-dashboard, /checkout/* |

## Page-by-page pass (next tranche)

1. **Marketing shell** — contrast fixes (#1), testimonial data (#2),
   image `alt`/lazy-load sweep, reduced-motion carousel (already a11y
   audited in docs/A11Y_AUDIT.md — re-run).
2. **App surfaces** — dashboard, lms hub/course, tutor console,
   student-dashboard, checkout: empty states (no learner / no cohort /
   no permission), loading skeletons, error toasts with retry (sonner
   already wired), mobile-first layouts ≤375px.
3. **Perf** — audit bundle (lighthouse byte-weight budgets exist):
   icon imports (lucide per-icon), font preload, image formats (webp),
   above-fold LCP on landing.
4. **Axe sweep** — add /dashboard, /lms, /checkout, /tutors to the axe
   gate (extend axe.spec.ts) and clear every critical + logged serious.

## Done criteria

- axe gate green on the full page matrix (no critical; serious listed
  with owners + dates).
- Lighthouse budgets pass (existing lighthouserc.json) on landing,
  catalogue and dashboard routes.
- 375px / 768px / 1440px manual pass on the conversion path
  (landing → tutor → cohort → checkout).

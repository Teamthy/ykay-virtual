# YK-Virtual — Accessibility Audit & Checklist (P2)

Automated + manual review notes. The Lighthouse CI job already gates
accessibility ≥ 90 on 6 core routes; this document tracks the manual pass
and the fixes shipped in phase 39.

## Shipped in phase 39

- **Skip-to-content link** (`SkipLink` in the root layout) — first
  focusable element, visible on focus, targets `#main-content`.
- **Focus visibility** — global `:focus-visible` gold ring in globals.css.
- **Reduced motion** — `prefers-reduced-motion` disables animations/
  transitions platform-wide.
- **ARIA pass on interactive controls** — icon buttons carry `aria-label`
  (theme toggle, language switcher, chat, close, hearts with
  `aria-pressed`), expanded states on menus, roles on alerts.
- **Color contrast** — gold `#F4B400` on ink-900 text ≈ 9.5:1 (AA/AAA);
  dark mode keeps ≥ 4.5:1 for body text (`#E5E7EB` on `#0B1220` ≈ 13:1).
- **Semantic structure** — landmark `<main id="main-content">`, headings
  ordered per page, tables with headers in admin surfaces, labels bound to
  inputs everywhere (all auth/LMS/account forms use `<label>`).

## Manual checklist (run before each release)

- [ ] Tab through every page — visible focus ring on each stop; no traps
- [ ] Screen-reader smoke (VoiceOver/NVDA): home → onboarding → LMS → chat
- [ ] Forms: label→input association; errors announced (`role="alert"`)
- [ ] Images: meaningful `alt` (decorative = empty alt)
- [ ] Touch targets ≥ 44px on mobile (bottom nav, chat composer)
- [ ] Color-only information has a non-color cue (status badges include text)
- [ ] Keyboard: all modals close with Esc; focus returns on close
- [ ] Zoom to 200% — no horizontal scroll on core flows

## Known follow-ups

- Full WCAG 2.2 AA audit with axe-core in CI (needs a browser runner;
  Lighthouse job covers the top pages today).
- `aria-live` polish on the chat widget (sonner toasts already announce).
- Dynamic focus management in the quiz modal (returns to the trigger).

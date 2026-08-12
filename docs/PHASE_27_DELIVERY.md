# PHASE 27 — Slider Refresh, Preline Heroes, Brand Cleanups — DELIVERY

Branch: `feature/phase-27-brand-refinements`
Base: `main` @ `57f3ed5` (phase 26)
Delivery method: git bundle `ykay-virtual-phase-27.bundle`

---

## What was delivered

### 1. Hero slider — new images + longer timing
- Slide images swapped for fresher, authentic Unsplash photography (teacher
  helping a child at home, graduation caps, exam writing, notes, one-on-one
  tutoring).
- Auto-advance **increased 6.5s → 10s** so captions/CTAs get proper dwell.

### 2. Preline announcement hero (distinct from the slider)
The centered Preline hero (announcement pill → gradient Anton headline →
description → gradient + outline buttons → meta row) applied to
**`/hometutors`** ("Better, Brighter Future For Your Kids." + Top 1% pill +
Get Started/Learn how it works + 1% · 98% · 280k+ meta) and **`/test-prep`**
("ace your exam" + IELTS·GMAT·GRE pill + 95% · 28+ meta) — joining `/gmat`
and `/study-abroad` from phase 26. The homepage keeps the full-bleed slider.

### 3. Header cleanups
- **"Join free" button removed** from the signed-out header nav — replaced
  with a clean **"Sign in"** link.

### 4. Logo → text-only wordmark
- The `Logo` component is now just the **NUVORA** Anton wordmark (navy on
  light, white on dark) — the mark/tile removed until the final design is
  provided. Header, footer and auth shell all update automatically.

### 5. Deep navy, not light navy
- All remaining `…to-brand-blue` background gradients (PageHero, checkout
  header, checkout panel, study-abroad stat card, tutor avatar, progress
  bar) now end in **deep navy `#060F26 → brand-navy`** (progress bar goes
  navy→gold). Bright `#2563EB` remains only as a link/icon accent.

### 6. Yellow testimonials
- `TestimonialSlider` background → **brand gold `#F4B400`** with dark ink
  text, navy names, dark arrows and dark stars — a warm testimonial band
  that pops against the cream page.

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS
npx tsc --noEmit          PASS
next build                PASS (all routes)
scripts/e2e.sh            77 passed · 0 failed
Live render: 4 new slider images + 10s duration, logo tile gone (wordmark
  only), "Join free" absent, yellow testimonial band, hometutors + test-prep
  announcement heroes — all confirmed in served HTML.
```

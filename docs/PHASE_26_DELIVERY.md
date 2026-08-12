# PHASE 26 — Preline Hero Slider, GMAT/Study-Abroad Heroes & Floating-Label Forms — DELIVERY

Branch: `feature/phase-26-preline-heroes-forms`
Base: `main` @ `e77271f` (phase 25)
Delivery method: git bundle `ykay-virtual-phase-26.bundle`

---

## What was delivered

### 1. Homepage hero → full-bleed image slider (Preline slider template)
New `HeroSlider` replaces the static hero on the homepage. Five case-study
slides matching the reference screenshots (003456/003506/003518/003529/
003543), each with real Unsplash photography via next/image (`fill`,
`priority` on slide 1, responsive srcset):

| Slide | Headline | CTA → route |
|---|---|---|
| Home Tutoring | Better, Brighter Future For Your Kids. | Get Started → `/hometutors` |
| International | Foreign-Standard Tutoring without the Foreign Price Tag | Book a Tutor Today → `/nuvora-plus` |
| UTME 2026 | UTME 2026 Prep — Your Child's Best Chance at Admission Success | Enroll for UTME 2026 Prep → `/utme-2026` |
| Test Prep | Study, Work, and Thrive Abroad with Perfect Test Scores | Start your Journey today → `/test-prep` |
| NUVORA Plus | Upgrade Your Child's Learning with NUVORA Plus | Unlock Premium Tutoring → `/nuvora-plus` |

Bottom-left caption treatment (tag pill → Anton headline → description →
gold CTA pill), black→transparent legibility gradient, **prev/next arrows**,
**dot indicators**, 6.5s auto-advance. Verified: all 5 titles + 5 images
render in served HTML.

### 2. `/gmat` — Preline hero (announcement + gradient title + buttons)
Centered hero: **announcement pill** ("GMAT season is here — 95% success
rate · Score 720+"), Anton headline **"Pass your GMAT exam in one sitting"**
with gold gradient span, description, gradient **Get a GMAT tutor** + outline
**See our results** buttons, meta row (Average score 720 · 350+ students).
Stats section given `id="stats"` for the anchor.

### 3. `/study-abroad` — Preline hero (same pattern)
Announcement pill ("Admissions & Travels — 1600+ universities · Apply
today"), **"Live, work and study abroad"** gold-gradient headline, buttons
(Start your journey → services, Test prep → `/gmat`), meta row (1600+ · 95%).

### 4. Floating-label forms (Preline floating-input pattern)
- **`GmatLeadForm`** — first name / country / phone / email converted to
  floating-label inputs (gold focus ring, floating state on focus + fill).
- **PrivateTuitionWizard** ("Get a tutor" 7-step) — learner name, goals,
  email and phone now **floating-label inputs**; gold focus styling;
  multi-step Stepper retained.

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
Live render: HeroSlider 5/5 slides + CTAs, gmat announcement/gradient hero,
  study-abroad hero, floating labels (not-placeholder-shown) on wizard +
  forms — all confirmed in served HTML.
```

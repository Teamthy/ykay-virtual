# PHASE 25 — Preline-Grade Components, Gold Emails & Performance — DELIVERY

Branch: `feature/phase-25-preline-gold-perf`
Base: `main` @ `85e4c8f` (phase 24)
Delivery method: git bundle `ykay-virtual-phase-25.bundle`

---

## What was delivered

### 1. Header v3 — Preline/HS template structure
Clean header: brand · inline links (Programmes, Cohorts, Tutors, How it
works) · **Services mega-menu** (4 grouped columns of icon rows + a customer-
story promo column with image + quote + "Learn more") · vertical divider ·
**Sign in (AuthNav)** + gold **Get started** pill. Mobile: bordered collapse
button (hamburger/X with ARIA), max-height scrollable panel with all links.

### 2. Homepage hero — Tuteria style, no AI-isms
- Removed **"Trusted by 9000+ Parents"** chip entirely.
- Authentic Unsplash image (students studying) via next/image (priority +
  srcset), floating rating card retained.

### 3. "We are backed by" logos
`PressLogos` — grayscale wordmarks for **Forbes · internet.org · BBC ·
Microsoft · TEF** under the "We are backed by" heading in StatsBand (v2 press-
strip treatment).

### 4. Dummy Popular programmes & Upcoming cohorts
When the API returns no rows (dev/preview), the home sections now render
**showcase cards with real links**: 3 programmes (UTME 2026 Prep, IGCSE
Computer Science, Common Entrance Masterclass) + 3 cohorts (UTME Mastery,
IGCSE 2026, WAEC Maths Intensive) with seat bars.

### 5. Section separation — icon-blocks approach
- **"We do home tutoring the right way"** (PartnerSection) stays dark `#111`.
- **"We deliver the best results, period."** (ResultsSection 3x chart) + the
  5-step **ApproachSection** rebuilt on the Preline **icon-blocks template**:
  lucide icon → gold gradient divider line → title → description, in a
  5-column cream grid — visually distinct from the dark partner band.

### 6. UTME hero v3 — Preline hero template
Light purple-gradient hero: gradient eyebrow (purple→orange), Anton
**JAMB 2026 SUCCESS**, "Guarantees 320+ Score", **blockquote** with real
champion (Eghosa 341/400 + avatar), right **form card**: "Start Your JAMB
Prep", **Continue with Google** button, Or-divider, **floating-label inputs**
(parent name / level / phone), terms checkbox, orange Get started (creates a
support ticket). Clients strip: "Join 10,000+ students…" + subject chips.

### 7. Pricing — Preline pricing template
**Per term / Monthly instalments switch** (with "Save up to 10%" badge),
4 plan cards (Cohort ₦35,000 · **Private Tuition ₦8,000/hr (Most popular,
gold border)** · NUVORA Plus ₦52,500 · Schools & Corporate Custom) with
feature checklists + CTAs, and a **comparison table** (desktop matrix + mobile
per-plan sections) with gold checks. Kept the disclaimer, cancellation policy
and FAQ below.

### 8. Gold email templates + order numbers
- `BrandEmail` shell → **gold `#F4B400` header bar with dark NUVORA wordmark**,
  cream background, soft card shadow, muted footer.
- Email CTA buttons → gold (`#F4B400` bg, `#111` text) in verification, reset
  and login-code emails (code tile styling preserved — E2E still parses it).
- Order numbers already `NUVORA-YYYYMMDD-XXXXXXXX` (migration 000017) —
  receipts/emails carry the gold-branded prefix.

### 9. Performance pass
- **next/font preload verified**: Anton + DM Sans self-hosted woff2 emitted
  with `rel="preload" as="font" crossorigin` (no runtime Google dependency).
- Hero image: `priority` + responsive `srcset` via next/image; other images
  `loading="lazy"`.
- HTML payloads: home 195KB / utme 113KB / pricing 81KB; shared JS 87.2 kB
  first load — no large dependencies added.

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
Live render: font preload links present, "Trusted by 9000+" gone, backed-by
  wordmarks, dummy programmes/cohorts, icon-block approach, UTME floating-
  label form, pricing switch + comparison — all confirmed in served HTML.
```

# PHASE 22 — Video Section, Prep Pricing/FAQ, v2 Listing Cards, Tuteria Checkout — DELIVERY

Branch: `feature/phase-22-tuteria-final-surfaces`
Base: `main` @ `6e53aee` (phase 21)
Delivery method: git bundle `ykay-virtual-phase-22.bundle`

---

## What was delivered (all four requested)

### 1. v2 "How it works" video section (home)

New `HowItWorksVideo` component on the homepage: "Learn how it works — How
YK-Virtual works" with a **video thumbnail + large play button** (hover zoom +
scale), and the 3 how-it-works steps beside it (tell us what your child needs
→ get matched with a vetted tutor → watch progress in real time).

### 2. Tuteria Prep dedicated pricing & FAQ sub-pages

Prep-branded sub-site (YK-Virtual **Prep** header nav: Overview · Pricing · FAQ ·
Get Started, purple `#0A033C` + orange `#FF6636`):

- **`/utme-2026/pricing`** — "Choose your package": Mastery Plan
  ₦50,000→₦35,000 · Plus Plan ₦75,000→₦52,500 (30% discount ends soon,
  featured Plus), full feature lists, **instalment table** (3 monthly
  payments), escrow note. Linked from the main utme-2026 packages section.
- **`/utme-2026/faq`** — 8 real tuteriaprep FAQs (subjects, why better than
  1:1, lesson times, attention, effectiveness, boards, requirements, missed
  lessons) as expandable cards + FAQ JSON-LD + "Still have questions?" CTA
  band.

### 3. v2 card treatments for /programmes + /cohorts

- **ProgrammeCard v2**: tinted format banner (colour-coded per format:
  Cohort/Private/Bootcamp/Holiday/Online/Hybrid), display-font title,
  curriculum·level·exam line, subject pills, next-start + price footer with
  arrow CTA — used on home "Popular programmes" and `/programmes`.
- **New shared `CohortCard`**: tinted header with ONLINE/IN_PERSON/HYBRID
  chip, display title, date/timezone line, **seat-availability progress bar**
  (green→amber→red at 90%+), price + Enrol now CTA (disabled when full) —
  used on home "Upcoming cohorts" and `/cohorts`.

### 4. Checkout → Tuteria payment-flow style

`CheckoutClient` upgraded: **navy gradient order-summary header** (display
price), order details panel, **Details → Pay → Confirmation step indicator**,
provider selection (Card·Paystack / Bank·Flutterwave), gold "Pay securely
now" CTA, and a **secure-badges footer** (256-bit SSL · Escrow protected ·
Idempotent orders — lucide icons). Payment-link success card: shield icon
(emoji removed), display heading, order reference.

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS
npx tsc --noEmit          PASS
next build                PASS (all routes incl. /utme-2026/pricing, /faq)
scripts/e2e.sh            77 passed · 0 failed
Live render: home video section, prep pricing (₦35,000 + instalments),
  prep FAQ, v2 programme/cohort cards — all confirmed in served HTML.
```

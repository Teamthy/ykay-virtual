# PHASE 21 — Tuteria Surfaces Complete: Exam Landings, Tutors Listing, Video Band — DELIVERY

Branch: `feature/phase-21-tuteria-surfaces`
Base: `main` @ `5af69f6` (phase 20)
Delivery method: git bundle `ykay-virtual-phase-21.bundle`

---

## What was delivered

### 1. `/entrance-exam` (references 002828 + 003558)
- Hero: **"95% Success Rate — Prepare for Entrance Exams into Top Schools in
  Nigeria & Abroad"** + "Book a Slot" CTA.
- Success-rate band (Math 98% / English 89% / Science 92% via Progress),
  benefits (past papers, mocks, cohorts, reports).
- Exams covered grid: WAEC · IGCSE · GCSE · BECE · 11+ · Common Entrance ·
  SAT · SSCE.

### 2. `/test-prep` (reference 163227)
- Hero: "Get expert help to ace your exam" + Get Started.
- 8-test grid with icons: IELTS · GMAT (→ /gmat) · ICAN · GRE · ACT · SAT ·
  TOEFL · PTE.
- Navy score band: **"Score 28+ for US Undergraduate Admission"**.
- 3-step how-it-works (diagnostic → structured sessions → mocks).

### 3. Tutors listing → v2 style
- **TutorCard v2**: photo avatar (or initial), gold-star rating, green
  ✓ Verified chip, students/lessons stat footer, subject pills, dual CTAs
  (View profile / Request tuition) — mirrors v2 tutor cards.
- Search page: navy display heading on filters, **EmptyState** for no results.

### 4. Home — announcement band (reference 003244)
**"Watch our announcement video"** — large navy play button + award/press
strip (Forbes · internet.org · BBC · ROYAL · Microsoft · Pitch@Palace · TEF ·
Academy of Engineering).

### 5. Navigation + brand claim
- Header dropdown, CategoryRail (Entrance Exams → /entrance-exam, new Test
  Prep entry), footer updated with both new pages.
- Footer brand blurb now leads with **"Africa's largest & most trusted
  tutoring platform"** (v2 claim).

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS
npx tsc --noEmit          PASS
next build                PASS (all routes incl. /entrance-exam, /test-prep)
scripts/e2e.sh            77 passed · 0 failed
Live render: both new landings HTTP 200 with hero band + real copy
  (95% Success Rate / WAEC / IELTS / Score 28+), home announcement band
  present.
```

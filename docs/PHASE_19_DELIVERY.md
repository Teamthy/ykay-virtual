# PHASE 19 — Tuteria Visual Brand & Pixel-Faithful Pages — DELIVERY

Branch: `feature/phase-19-tuteria-brand`
Base: `main` @ `c2728c5` (phase 18)
Delivery method: git bundle `ykay-virtual-phase-19.bundle`

Reference (live, fetched + palette-extracted):

- https://v2.tuteria.com/ · /hometutors · https://tuteriaprep.com/utme
- https://www.tuteria.com/users/bookings/ · https://tutors.tuteria.com/steps/personal-info

---

## 1. Tuteria colour scheme (extracted from live CSS)

| Token                                | Value                         | Role                   |
| ------------------------------------ | ----------------------------- | ---------------------- |
| `brand.navy`                         | `#194F82`                     | Primary (Tuteria navy) |
| `brand.blue`                         | `#056FD2`                     | Bright blue accent     |
| `brand.blue-light`                   | `#E6F0FA`                     | Light blue surface     |
| `brand.sky`                          | `#56ACE0`                     | Sky                    |
| `brand.gold`                         | `#FFC10D`                     | Ratings/accent         |
| `brand.orange`                       | `#ED6D20` (+ `#FDF0E8` light) | Secondary accent       |
| `brand.green`                        | `#009A49` (+ `#F2F9EE` light) | Success                |
| `brand.purple` / `brand.prep-orange` | `#0A033C` / `#FF6636`         | tuteriaprep hero + CTA |
| ink scale                            | `#001028`→`#F7FAFC`           | Text/surfaces          |

All token names preserved → the whole platform (header, PageHero, cards,
badges, dashboards) re-skins automatically.

## 2. Typography — exactly per spec

- **Anton** (display) + **DM Sans** (body) via `next/font` (`--font-display`,
  `--font-body`), wired into Tailwind (`font-display`, `font-body`).
- `globals.css` typography defaults verbatim from the spec: all h1–h6 →
  display font, `line-height:1.1`, `letter-spacing:0.02em`, weight 400
  (+ `font-synthesis:none` so single-weight Anton never gets fake-bold);
  `p` → secondary colour 1.7 line-height; `a` link colours with hover;
  buttons/disabled/img rules as given.
- Logo wordmark, hero headline, section headings all on Anton display.

## 3. Homepage — v2.tuteria.com structure (real copy)

- **Hero**: "Trusted by 9000+ Parents" → **"Better, Brighter Future For Your
  Kids."** (Anton) → personalized home tutoring copy → **Get Started** +
  **Learn how it works** + image with floating rating/verified chips.
- **Popular services** rail (6 tiles: Home Tutoring, International, UTME 2026,
  Test Prep, YK-Virtual Plus, Entrance Exam — real v2 copy, tinted surfaces).
- **Stats**: "Learn From The Largest Community Of Professional Tutors In
  Africa" — 10k+ / 280k+ / 38k+ / 98% + "We are backed by" press strip.
- **"We do home tutoring the right way"** partner band (real bullets).
- **"We deliver the best results, period."** 3x chart + **5-step innovative
  approach** (Insights Assessment → Adaptive Plans → Child-Centered →
  Periodic Evaluation → Progress Reports, real copy).
- **"Parents love YK-Virtual"** — real v2 testimonials (Mrs. Soetan, Mrs. Alice,
  Mrs Ayowunmi, Pamilerin, Daniel).
- Hero slides re-cut to v2 real copy/palette (International 4 continents,
  UTME 345, Test Prep 95%, Plus, Entrance Exams 95%).

## 4. New `/hometutors` (v2 hometutors, pixel-faithful)

Hero (same headline) + stats (98%) + **"No Matter The Learning Need"** — five
needs with real descriptions (Physical, Online, Homeschooling, Early Years,
Exam Prep) + **"Meet Some Of Our Tutors"** — real tutor cards (Oluwatobi
4.6/20 reviews/37 students/680 lessons, Olanike 5/8) with review quotes +
approach + testimonials + guarantee.

## 5. `/utme-2026` rebuilt as tuteriaprep.com/utme

Deep-purple `#0A033C` + orange `#FF6636` prep branding: "ONLINE PREP ·
JAN–APR 2026" → **"JAMB 2026 SUCCESS"** (Anton) → "Guarantees 320+ Score",
Science/Arts/Commercial chips, **Start My UTME Prep**, "Join 10,000+ students"

- **phone capture** → **real champions** (Eghosa 341/400, Chinonso 338/400,
  Princess 317/400 + real quotes) → **AI-powered prep** (20,000 questions /
  15 years) → what's included (4 cards) → **₦20M scholarships** prize list →
  **packages** (Mastery ₦50,000→₦35,000 · Plus ₦75,000→₦52,500, 30% discount,
  featured Plus) → guarantee.

## 6. Tutor application — "You belong here!"

Become-a-tutor step 1 header matches tutors.tuteria.com personal-info vibe
("You belong here! Create your tutor profile and start earning money teaching
what you love"). Tutor steps/login-code flows already match the reference
email-code login.

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS
npx tsc --noEmit          PASS
next build                PASS (all routes incl. /hometutors, /utme-2026)
scripts/e2e.sh            77 passed · 0 failed
Live render: hero + services + stats + approach + real testimonials on home,
  hometutors needs/tutors cards, utme purple hero/packages/scholarships —
  all confirmed in served HTML; Anton display font applied globally.
```

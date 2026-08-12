# PHASE 18 — Premium Polish, Motion & Next-4 — DELIVERY

Branch: `feature/phase-18-premium-motion`
Base: `main` @ `76fc2a0` (phase 17)
Delivery method: git bundle `ykay-virtual-phase-18.bundle`

---

## 1. Senior-designer premium look (no AI-isms)

- **HeroReference v2** — restrained navy surface with a hairline topo grid,
  hand-drawn gold underline accent on the headline, glass stat chips, soft
  layered shadows, one focal image. No gradient-on-gradient stacks.
- **Emoji purged from UI** (the classic "AI-ish" tell): footer advisor band,
  AuthShell trust points, checkout benefits, home trust chips → all now
  **lucide icons** (Phone, Mail, GraduationCap, BadgeCheck, ShieldCheck,
  LineChart, BookOpen…).
- **Competitor-mention copy removed**: for-schools ("Tuteria serves individual
  families…") and corporate-training ("Tuteria has generic 'Training'…")
  rewritten on-brand; online-classes copy was already fixed in phase 17.

## 2. Optimized imagery + motion system

- Hero image now via **next/image**: `priority`, responsive `sizes`,
  inline SVG `blurDataURL` placeholder, and served through the optimized
  `/_next/image` pipeline (verified in served HTML: 640w–3840w srcset).
- **Motion system** (dependency-free, `prefers-reduced-motion` safe):
  - `components/ui/reveal.tsx` — IntersectionObserver scroll-reveal with
    stagger (`.reveal` CSS transitions).
  - Global keyframes: `heroIn` staged entrance, `floatY` gentle float,
    `hover-lift` micro-interactions.
  - Hero entrance: staged fade-up on headline/badge/chips; floating rating
    card animation.

## 3. The next four

### a) Magic-link login (backend + frontend + tests + E2E)
- `POST /auth/login-code/request` — 6-digit code email, 10-min TTL, single
  active code per user, **anti-enumeration** (always 200 for valid-looking
  emails), branded email with monospace code tile.
- `POST /auth/login-code/confirm` — hashed lookup (`sha256(userID:code)`),
  consumes the token, starts a session through the same path as password
  login (audit trail included).
- Frontend: new `/login-code` page (email → code steps, resend cooldown) on
  the AuthShell + "Log in with a code" link on `/login`.
- New token purpose `LOGIN_CODE`; service test covers anti-enumeration, wrong
  code 401, success + session, single-use. E2E extracts the code from the
  console email log and completes the flow (77 checks total).

### b) UTME 2026 landing (`/utme-2026`)
Reference-grade landing: navy PageHero ("Your child's best chance at a 300+
score", Jan–Apr 2026, CTA "Get a callback"), stats strip (345 / 98% / 200+ /
₦20M scholarship), **phone-capture callback form** (creates a real support
ticket → admin queue), SuccessChampions, 3-step band, GuaranteeBand. SEO
Course JSON-LD.

### c) PageHero across all remaining flat pages (11)
about ("A school without walls"), contact, resources, blog, success-stories,
how-it-works, careers, curricula/british, curricula/nigerian (CTAs kept),
for-schools, corporate-training — all on the navy band with gold eyebrows
and breadcrumbs.

### d) Worker cron — expire stale learning attempts
- Migration `000018_attempt_expiry`: status CHECK now allows `EXPIRED`.
- `ExpireStaleAttempts` on the AssessmentRepository (postgres UPDATE +
  memory impl); worker runs it at boot + every 15 min.
- **Bug found by the new test**: `SubmitAssessment` didn't reject EXPIRED
  attempts — fixed (409 conflict).
- Console email sender now logs up to 3000 chars (codes/links visible in dev).

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS (incl. magic-link + expiry tests)
npx tsc --noEmit          PASS
next build                PASS (all routes incl. /utme-2026, /login-code)
scripts/e2e.sh            77 passed · 0 failed (magic-link flow verified)
Live render: 11 heroized pages + utme-2026 all HTTP 200 with hero band;
  next/image srcset 640w–3840w; entrance animations present.
```

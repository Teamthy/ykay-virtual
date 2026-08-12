# PHASE 29 — Form Tidy, Password Toggles, Google Auth & Stateful Onboarding — DELIVERY

Branch: `feature/phase-29-forms-google-onboarding`
Base: `main` @ `46db0d2` (phase 28)
Delivery method: git bundle `ykay-virtual-phase-29.bundle`

---

## What was delivered

### 1. Tidy forms + show/hide passwords
- New **`PasswordInput`** component (eye/eye-off toggle, ARIA labels, consistent
  `h-11` sizing) — applied to **login, register (×2), reset-password (×2)**.
- Shared `INPUT_CLS` standard: `h-11 rounded-lg border-ink-200 px-4 text-sm`,
  gold focus ring — applied across login, register, forgot-password, login-code,
  reset-password and the learner onboarding form (uniform spacing, inline
  error text, consistent labels).
- All auth forms now use gold pill CTAs (`h-11 w-full rounded-lg bg-brand-gold`).

### 2. Google auth (real OAuth)
**Backend**
- `GoogleAuthService`: `BuildAuthURL` (state nonce, 10-min TTL), `ExchangeCode`
  (token exchange → userinfo → **upsert user as email-verified ACTIVE** →
  session via the same path as password login). Google-sourced users get the
  PARENT role by default; tutors add TUTOR via vetting.
- Routes: `GET /auth/google/url`, `GET /auth/google/callback`.
- Config: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL`
  envs; returns 409 "not configured" when absent (verified live).
- Test: `TestAuth_GoogleOAuth_Config` (disabled state, URL building, bad-state
  rejection).

**Frontend**
- `GoogleButton` ("Continue with Google" with official multi-colour G icon) on
  **login + register**; fetches the consent URL and redirects; graceful toast
  when unconfigured. `getGoogleAuthURL` client helper.

### 3. Stateful, role-specific onboarding (Preline split-panel template)
- **`AuthShell` v2** — the template: left 30% cream panel (logo header +
  language chip + **education image** with caption + trusted strip), right 70%
  white panel (Skip link, form, chat button). The "simplest way to manage your
  workforce" illustration is replaced with real NUVORA education imagery.
- Applied to **login, register, forgot-password, reset-password, login-code,
  verify-email, onboarding, onboarding/learner** — brand-consistent everywhere.
- **`/onboarding`** — Preline role-selection template: "How are you planning to
  use NUVORA?" with role chips (Parent / Student / Tutor / School-Company),
  choice persisted to localStorage (stateful across screens), Continue routes
  by role: TUTOR → `/become-tutor/apply`, INSTITUTION → `/for-schools`,
  PARENT/STUDENT → `/onboarding/learner`. Skip goes to the right dashboard.
- Register now routes to `/onboarding?role=…` (or tutor application) after
  account creation; `/onboarding/learner` rebuilt on the shell with the shared
  Stepper (Account → Learner → Dashboard) + tidy form + level chips.

---

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS (incl. Google OAuth config test)
npx tsc --noEmit          PASS
next build                PASS (all routes)
scripts/e2e.sh            77 passed · 0 failed
Live: all 8 auth/onboarding pages 200 on the split-panel shell; google
  endpoints return 409 when unconfigured; bundle contains role chips,
  password toggles, onboarding copy.
```

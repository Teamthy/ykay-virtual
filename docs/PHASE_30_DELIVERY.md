# PHASE 30 — Login fix, full-bleed auth shell, nav & stateful 7-step onboarding — DELIVERY

Branch: `feature/phase-30-onboarding-flow`
Base: `main` @ `ceb4d8c` (phase 29)
Delivery method: git bundle `ykay-virtual-phase-30.bundle`

---

## 1. "Failed to fetch" on login — FIXED

Root cause: the browser client fetched the API via an **absolute
`http://localhost:8080`** URL. From the visitor's browser (live preview /
another port) that host is unreachable → `Failed to fetch`.

- `lib/api.ts` — browser fetches now use a **relative `/api/v1`** base;
  server-side (SSR/SSG) fetches keep the absolute URL (`NEXT_PUBLIC_API_URL`
  override still honoured).
- `next.config.js` — added a **rewrite** `/api/v1/:path*` →
  `http://localhost:8080/api/v1/:path*` (`API_PROXY_TARGET` env for prod).
- Verified live: seed login (`parent@nuvora.com` / `password123`) through the
  rewrite returns 200 + `ykay_session` cookie; `/auth/me` works with it.

## 2. Full image on the left panel

`AuthShell` left panel is now a **full-bleed education photo**
(Unsplash `photo-1522202176988-66273c2fd55f`) with a gradient overlay and
on-image content: white logo header + language pill, "Learning beyond
boundaries" headline, "Join 30,000+ families" line and the trusted strip.
The old 30%-cream-with-inset-image layout is gone.

## 3. Navigation on auth + onboarding pages; Skip only where needed

- **Every** auth/onboarding page now has: logo → home, a **"← Back to home"**
  link (top-left of the form panel), and the chat FAB.
- **Skip is opt-in** (`skip` prop): removed from all auth pages (login,
  forgot-password, reset-password, login-code, verify-email) — they now show
  zero Skip links. Onboarding passes it only on steps where it makes sense
  (see below); never on account-creation or verification steps.
- Onboarding steps have **Back to previous step** navigation + the shared
  Stepper (Account → Verify → Role → Path → Profile → About → Done).

## 4. Stateful, role-specific onboarding — 7 steps

`/onboarding?step=1..7` — state machine persisted to localStorage
(`nuvora-onboarding`), URL carries the step, refresh-safe, role-specific:

1. **Account** — full name + email (Google continue on top). Creates the
   account with a generated password (roles `PARENT` placeholder).
2. **Verify email** — 6-digit code via the login-code channel
   (send/resend with 30s cooldown). **Backend change:** a successful code
   sign-in now proves email ownership — the account is marked email-verified
   and activated (`PENDING_VERIFICATION → ACTIVE`), and a session starts.
3. **Select role** — Parent / Student / Tutor / School-Company plan-cards.
   Persisted via the new **`POST /auth/me/role`** endpoint (replaces the
   user's role grants; unknown roles rejected).
4. **Your path (role-specific)** — Parent: who's learning + child name/level;
   Student: prep goals multi-select + level; Tutor: subjects + levels (link to
   `/become-tutor/apply`); Institution: kind + city (link to `/for-schools`).
5. **Complete your profile** — phone (optional) + set a real password
   (**`POST /auth/me/password`**; optional — email codes keep working).
6. **About you** — bio + preferred language chips.
7. **Done** — personalised success screen → role-based dashboard
   (`/dashboard`, `/student-dashboard`, `/tutor-dashboard`).

Skip targets: step 1 (only when already signed in) → role; step 3 → dashboard;
steps 4–6 → next step. A session guard bounces step 3+ without a session back
to verification.

### Related routing changes
- `/register` → server 307 redirect to `/onboarding` (create account now lives
  in the stateful flow; header "Get started" + login footer link updated).
- `/onboarding/learner` → 307 redirect to `/onboarding?step=4`.
- Google sign-in users who land on onboarding skip past verification (their
  email is already proven) and jump to role selection.

## 5. Backend additions

- `POST /auth/me/role` `{role}` — session-required; `SetPrimaryRole` service
  (validates against roles table, replaces grants, audits).
- `POST /auth/me/password` `{new_password}` — session-required;
  `ChangePassword` service (bcrypt, ≥8 chars, audits).
- `RoleRepository.RemoveAllForUser` (memory + postgres).
- `ConfirmLoginCode` marks the email verified + activates pending accounts.
- Tests: `TestAuth_OnboardingBackend` (code-login verification/activation,
  role swap incl. unknown-role rejection, password change + re-login).

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./internal/...    PASS (incl. TestAuth_OnboardingBackend)
tsc --noEmit              PASS
next build                PASS
scripts/e2e.sh            77 passed · 0 failed
Live: seed login through the rewrite 200 + cookie; full onboarding API flow
  register → code → ACTIVE → role TUTOR → password → login with it; all
  auth/onboarding pages 200; /register + /onboarding/learner 307; skip
  absent from auth pages; full-bleed image + Back-to-home in the shell.
```

Demo accounts and phase-28 content unchanged.

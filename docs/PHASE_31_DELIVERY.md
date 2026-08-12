# PHASE 31 — SECURITY HARDENING (audit remediation: P0 + quick P1) — DELIVERY

Branch: `feature/phase-31-security-hardening`
Base: `main` @ `9528aba` (phase 30)
Delivery method: git bundle `ykay-virtual-phase-31.bundle`

## Context

An external production-readiness audit (OWASP-style, 100 phases) was run
against the repo. Its claims were verified against the code first; several
were factually wrong (E2E suite, CI pipeline, `.env.example`, JWT usage all
exist/differ), and those are corrected below. This phase ships fixes for
every REAL finding in the "P0 blockers + quick P1s" scope.

### Audit claims corrected (verified false)
- "No E2E tests / e2e.sh is a placeholder" — FALSE: boots the API and runs
  77 assertions; CI now runs it explicitly (see below).
- "No CI/CD" — FALSE: `.github/workflows/ci.yml` existed (Go + frontend
  gates); an explicit E2E job was added.
- "DOC-001: .env.example missing" — FALSE: exists; updated with new vars.
- "Predictable JWT secret" — MOOT: `JWT_SECRET` was dead config (sessions
  are opaque SHA-256-hashed tokens; no JWTs anywhere). The dead field is
  removed.

## What was fixed

### SEC-001 (P0) — Dev auth bridge REMOVED
`AuthBridge` (trusted `X-User-ID` / `X-User-Roles` headers → full auth
bypass) is **deleted**. Actors now come only from the httpOnly session
cookie via `SessionAuth`. `requireActor`/`ActorFromContext` unchanged (401
when absent). Verified live: forged `SUPER_ADMIN` headers → 401 on
`/auth/me/password` and `/admin/vetting/queue`; real session → 200.
Tests: `TestNoAuthBridge_HeadersDoNotAuthenticate`.

### SEC-002 (P0) — CORS fail-closed
Default `ALLOWED_ORIGINS` is now **empty** (was `*`); cross-origin headers
(including `Allow-Credentials`) are emitted only for explicitly allowed
origins. The web app is unaffected (same-origin via Next.js rewrite).
Tests: `TestCORS_FailClosed` (no-allowlist, allowed, unknown, preflight).

### SEC-003 (P1) — Demo credentials
Seeding is dev-only (never in production — production now **fails fast**
instead of silently falling back to the in-memory store), and the demo
password is env-overridable (`DEMO_PASSWORD`, default `password123` for
local dev only).

### SEC-004 (P1) — Insecure defaults → production fail-fast
`config.Validate()` refuses to start in production with: wildcard/empty
`ALLOWED_ORIGINS`, default `DATABASE_URL`/`SITE_URL`/`PORT`, or missing
Google OAuth creds. Dead `JWT_SECRET` config removed.
Tests: `TestValidate_ProductionFailFast` (6 cases).

### SEC-005 (P1) — Auth rate limiting
New per-IP limiter (40 req/min, sliding window) on the brute-force surface:
`/auth/login`, `/auth/register`, `/auth/login-code/request|confirm`,
`/auth/password-reset/request|confirm`, `/auth/verify-email/request`.
The rate limiter now keys on the bare IP (previously `ip:port` — a
connection-per-request client could bypass it entirely).
Verified live: 429 after budget exhausted, reset after window.
Tests: `TestRateLimiter_EnforcesLimit` incl. same-IP/different-port bypass.

### P1/P2 extras shipped with the scope
- **Security headers** middleware: `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy`; frame blocking
  (`X-Frame-Options: DENY` + `frame-ancestors 'none'`) in production only
  (dev/preview embeds the site in an iframe). Full CSP deferred (needs
  nonce plumbing in the Next build).
- **Health endpoints**: `/health/live` (process) and `/health/ready`
  (postgres ping in prod; memory mode always ready).
- **CI**: new `e2e` job in `.github/workflows/ci.yml` running
  `scripts/e2e.sh 8099`.
- **.env.example**: `ALLOWED_ORIGINS` (explicit list), `DEMO_PASSWORD`,
  removed `JWT_SECRET`.

## Verification

```text
gofmt                     clean
go build ./...            PASS
go vet ./...              PASS
go test ./...             PASS (incl. new config/middleware hardening tests)
tsc --noEmit              PASS
scripts/e2e.sh            77 passed · 0 failed
Live (rebuilt API + site):
  X-User-ID/Super-Admin forgery → 401 on protected endpoints
  Real session cookie       → 200
  Unknown Origin / preflight→ no CORS headers
  Auth burst                → 429 after 40/min, recovers after window
  /health, /health/live, /health/ready → 200
  Security headers present  → nosniff/referrer/permissions
  Seed login via rewrite    → 200
```

## Deferred (documented, not in this scope)
Full CSP with nonces; structured logging/metrics/alerting; worker
processing; pgx migration; backups/DR runbook; LICENSE/CONTRIBUTING;
distributed (Redis) rate limiting — noted for later phases.

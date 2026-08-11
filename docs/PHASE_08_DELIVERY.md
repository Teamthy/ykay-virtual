# PHASE 08 — Email Verification & Password Reset — DELIVERY

Branch: `feature/phase-08-auth-completion` (contains Phases 3–8)
Base: `feature/phase-07-auth-sessions` @ `71ee735`
Delivery method: git bundle `ykay-virtual-phase-08.bundle`

---

## What was built

### Migration `000014_auth_tokens`
- `auth_tokens` — user_id, purpose (`VERIFY_EMAIL` | `PASSWORD_RESET`),
  **token_hash UNIQUE** (only the SHA-256 hash is stored), expires_at (24h),
  consumed_at (single-use); indexes on (user, purpose) and hash

### Domain + repositories
- `internal/domain/identity/token.go` — `AuthToken` entity with
  `IsExpired`/`IsConsumed` rules + `AuthTokenRepository` interface
- `postgres/token_repo.go` + `memory/token_memory.go` implementations
  (Create/FindByHash/Consume/InvalidateAllForUser)

### Email adapter (`internal/notification/email.go`)
- `EmailSender` interface with two implementations:
  - **ConsoleEmailSender** — dev default: logs the email (with the clickable
    link) to stdout
  - **SMTPEmailSender** — production via `SMTP_HOST/PORT/USER/PASS/EMAIL_FROM`
    env vars (net/smtp)
- Selected automatically by `NewEmailSender()` based on `SMTP_HOST`

### AuthService extensions (`auth_verification.go`)
- **RequestEmailVerification** — invalidates outstanding tokens, creates a
  24h single-use token, emails the link. **Never reveals account existence**
  (unknown email → 200, silent)
- **VerifyEmail** — consumes the token, sets `email_verified_at`, flips
  status `PENDING_VERIFICATION → ACTIVE`, audits; already-verified users get an
  idempotent success; consumed → 409; expired/invalid → 400
- **RequestPasswordReset** — same token pattern, same anti-enumeration rule
- **ResetPassword** — bcrypt re-hash, consumes the token, invalidates all
  outstanding reset tokens, and **rotates ALL sessions** (credential change →
  session rotation per AGENTS.md), audits
- Injectable seams: `WithAuthTokens`, `WithEmailSender` (test hooks)

### Transport + frontend
- New endpoints (OpenAPI now **46 paths**): `POST /auth/verify-email/request`,
  `POST /auth/verify-email/confirm`, `POST /auth/password-reset/request`,
  `POST /auth/password-reset/confirm`
- **`/verify-email`** — auto-confirms via `?token=`, success state, resend form
  when no token, error states
- **`/forgot-password`** — request form → "check your inbox" screen
- **`/reset-password`** — TanStack Form + Zod (min 8 chars, match confirm),
  success state with "all other sessions signed out" note
- **Register** now sends new users to `/verify-email?sent=1`; **Login** routes
  unverified accounts (`PENDING_VERIFICATION`) to the verification page;
  login page gains a "Forgot your password?" link

---

## Test results (run in sandbox)

```
go build ./...                  PASS    go vet ./...            PASS
gofmt -l (whole module)         0
go test ./internal/service/...  74 tests PASS   (5 new: verify flow,
                                                 expired/unknown token,
                                                 unknown-email silence,
                                                 reset flow + session rotation
                                                 + hash change, validation)
legacy/server: go test ./...    9 packages PASS
client: npx tsc --noEmit        PASS
client: npx next build          PASS  (/verify-email, /forgot-password,
                                       /reset-password, /login, /register)
API smoke (memory fallback)     PASS
```

### Smoke transcript (excerpt)
```
POST /auth/register                   → status PENDING_VERIFICATION
POST /auth/verify-email/request       200  (token emailed to console log)
POST /auth/verify-email/confirm       → {"verified":true,"status":"ACTIVE"}
POST /auth/verify-email/confirm (reuse)  409
POST /auth/password-reset/request     200  (token emailed)
POST /auth/password-reset/confirm     → {"reset":true}
POST /auth/login (old password)       401
POST /auth/login (new password)       200
POST /auth/password-reset/request (unknown email)  200 (no account leak)
```

## Manifest

### New backend
- `migrations/000014_auth_tokens.{up,down}.sql`
- `internal/domain/identity/token.go`
- `internal/repository/postgres/token_repo.go`, `internal/repository/memory/token_memory.go`
- `internal/notification/email.go`
- `internal/service/auth_verification.go`, `internal/service/auth_verification_test.go`

### Modified backend
- `internal/service/auth_service.go` (tokens + email fields, seams)
- `internal/transport/http/auth_handler.go` (siteURL, 4 new endpoints)
- `internal/transport/http/router.go`, `cmd/api/main.go` (token repo wiring, siteURL)
- `api/openapi.yaml` (46 paths), `.env.example` (+SMTP_*)

### New frontend
- `client/app/(auth)/verify-email/page.tsx`
- `client/app/(auth)/forgot-password/page.tsx`
- `client/app/(auth)/reset-password/page.tsx`
- `client/features/auth/api.ts` (+4 functions)

### Modified frontend
- `client/app/(auth)/login/page.tsx` (unverified redirect + forgot link)
- `client/app/(auth)/register/page.tsx` (→ verify-email prompt)
- `docs/PHASE_08_DELIVERY.md`

## Environment variables (new)
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` — leave
`SMTP_HOST` empty for console email logging in dev (links printed to the API
terminal).

## PowerShell note
PowerShell 5.1 does not support `&&` — use `;` or separate lines.

## Bundle instructions

```
git fetch /path/to/ykay-virtual-phase-08.bundle feature/phase-08-auth-completion
git checkout -b feature/phase-08-auth-completion FETCH_HEAD
go run ./cmd/migrate --cmd=up
go run ./cmd/api
npm --prefix client install
npm --prefix client run dev
```

Try it: `/register` → you land on `/verify-email`; the link is printed in the
API terminal (dev email logging) → click/confirm → account ACTIVE. Then
`/forgot-password` → reset link from the terminal → new password → all old
sessions invalidated.

## Known limitations / next phases
- Email HTML templates are inline strings — move to `notification_templates`
  table content (Phase 9 content engine)
- Rate limiting per-email address (e.g. 5 resets/hour) — global limiter applies
  today; per-key limiting lands with the Redis rate-limit hardening (Phase 13)
- Next: **Admin console (Phase 11)** — full operations UI with TanStack Table

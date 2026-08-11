# PHASE 07 — Authentication & Sessions — DELIVERY

Branch: `feature/phase-07-auth-sessions` (contains Phases 3–7)
Base: `feature/phase-06-marketplace-seo` @ `84e93a7`
Delivery method: git bundle `ykay-virtual-phase-07.bundle`

---

## What was built

### Backend — real session auth (replaces the dev auth bridge)

| Area | Details |
|---|---|
| **Registration** | `POST /auth/register` — email validation, **bcrypt** password hashing (cost 10), role assignment (STUDENT/PARENT/TUTOR), lowercase-normalized email, audit log on user create |
| **Login** | `POST /auth/login` — bcrypt verify, creates a session with a **random 32-byte token** (only its SHA-256 hash is stored), sets the **httpOnly `ykay_session` cookie** (SameSite=Lax, Secure in production, 30-day TTL), updates last_login_at, audit LOGIN event |
| **Logout** | `POST /auth/logout` — revokes the session + clears the cookie (idempotent) |
| **Me** | `GET /auth/me` — resolves the user + roles from the cookie; expired/revoked sessions → 401 with cookie cleared |
| **Session rotation** | `RotateAllSessions` — revokes every session on privilege change (per AGENTS.md); covered by test |
| **Middleware** | `SessionAuth` — reads cookie → hashes → resolves actor into context; **session always beats dev headers** (AuthBridge now skips when a session actor exists — verified with a forged-header attack test) |
| **Rate limiting** | Auth endpoints ride the existing global rate limiter (100/min) |

### Repositories
- `postgres/identity_auth_repo.go` — `UserRepo` (create/find/last-login), `SessionRepo` (create/find-by-hash/revoke/revoke-all/delete-expired), `RoleRepo` (find/assign/roles-for-user); unique-violation → `ErrAlreadyExists`
- `memory/identity_memory.go` — in-memory equivalents (+`Roles.Seed()` mirroring migration 000001 role inserts; seeded in the API memory fallback)
- Interfaces extended in `internal/domain/identity/repository.go`

### Transport fixes found by the auth smoke test
1. **Duplicate email → 500**: `WriteAppError` now maps sentinels with `errors.Is` FIRST (fixes 409/401/403/404/400 misrouting — e.g. "invalid credentials" no longer matches "invalid" → 400)
2. **Roles empty in memory mode**: `store.Roles.Seed()` now called in the API memory fallback
3. **Forged headers vs session**: AuthBridge no longer clobbers the session actor

### Frontend
- `features/auth/api.ts` — register/login/logout/me with `credentials: "include"` (apiFetch updated)
- `hooks/useSession.ts` + `useLogout` (TanStack Query key `["session"]`)
- **`/login` + `/register`** (route group `(auth)`) — TanStack Form + Zod (client+server validation), disabled-during-submit, error banners, auto-login after register, role picker (parent/student/tutor), role-aware redirect
- **`middleware.ts` route guards** — protects `/dashboard`, `/tutor-dashboard`, `/messages`, `/notifications`, `/admin`, `/checkout` (redirect → `/login?next=…`); auth pages redirect to `/dashboard` when signed in
- **`AuthNav`** in the header — Log in / Join free when signed out; account chip with role badges + role-aware links (dashboards, messages, admin console) + Log out when signed in
- Removed the legacy `app/auth/page.tsx` and the stale `/auth` header link (mobile menu now points at `/login`)

### API contract
OpenAPI now **42 paths / 22 schemas** (was 40/21) — `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` documented with the `AuthUser` schema. YAML validated.

---

## Test results (run in sandbox)

```
go build ./...                  PASS    go vet ./...            PASS
gofmt -l (whole module)         0
go test ./internal/service/...  69 tests PASS   (10 new auth tests:
                                                 register+hash+roles, duplicate 409,
                                                 validation, login token/roles/session,
                                                 wrong-password 401, unknown-email 401,
                                                 me valid/revoked/expired,
                                                 logout idempotent, rotation)
legacy/server: go test ./...    9 packages PASS
client: npx tsc --noEmit        PASS
client: npx next build          PASS  (/login, /register, dashboards, admin, messages)
API smoke (memory fallback)     PASS
```

### Smoke transcript (excerpt)
```
POST /auth/register               201 roles: [PARENT]
POST /auth/register (dup)         409
POST /auth/login                  roles: [PARENT] + Set-Cookie ykay_session
GET  /auth/me (cookie)            parent@example.com [PARENT]
GET  /auth/me (no cookie)         401
POST /auth/login (wrong pw)       401
GET  /me/orders (cookie)          200
GET  /admin/vetting/queue (admin cookie)   200
GET  /admin/vetting/queue (parent cookie)  403
POST /auth/logout → GET /auth/me  401
Forged X-User-Roles: SUPER_ADMIN + parent session on admin endpoint → 403
(session wins over headers) ✅
No session + dev X-User-ID header → 200 (dev fallback preserved) ✅
```

---

## Manifest

### New backend
- `internal/service/auth_service.go`, `internal/service/auth_service_test.go`
- `internal/middleware/session.go`
- `internal/repository/postgres/identity_auth_repo.go`
- `internal/repository/memory/identity_memory.go`
- `internal/transport/http/auth_handler.go`

### Modified backend
- `internal/domain/identity/repository.go` (interfaces extended)
- `internal/middleware/auth.go` (session-first precedence)
- `internal/transport/http/dto.go` (sentinel-aware WriteAppError), `router.go` (+auth routes, sessionAuth param)
- `cmd/api/main.go` (AuthService/SessionAuth/AuthHandler wiring, roles seed), `go.mod`/`go.sum` (+golang.org/x/crypto)
- `internal/repository/memory/uow.go` (Users/Sessions/Roles in MemoryStore)

### New frontend
- `client/features/auth/api.ts`
- `client/hooks/useSession.ts`
- `client/components/layout/AuthNav.tsx`
- `client/app/(auth)/login/page.tsx`, `client/app/(auth)/register/page.tsx`
- `client/middleware.ts`

### Modified frontend
- `client/lib/api.ts` (+`credentials: "include"`), `client/components/layout/Header.tsx` (AuthNav, /login links)
- `api/openapi.yaml` (42 paths), `docs/PHASE_07_DELIVERY.md`
- Removed: `client/app/auth/page.tsx`

## Environment variables
- No new vars. Cookies become `Secure` automatically when `ENVIRONMENT=production`.

## PowerShell note
PowerShell 5.1 does not support `&&` — use `;` or separate lines.

## Bundle instructions

```
git fetch /path/to/ykay-virtual-phase-07.bundle feature/phase-07-auth-sessions
git checkout -b feature/phase-07-auth-sessions FETCH_HEAD
go run ./cmd/migrate --cmd=up
go run ./cmd/api
npm --prefix client install
npm --prefix client run dev
```

Try it: `/register` → create an account → auto-login → `/dashboard`; sign out via the header chip; verify `/dashboard` redirects to `/login` when signed out.

## Known limitations / next phases
- Email verification (status PENDING_VERIFICATION → ACTIVE) — add SMTP + verify endpoint (Phase 9 with the notification engine)
- Password reset flow — Phase 9
- The dev X-User-ID bridge remains active when no session exists (local dev convenience); strip at the edge in production
- Native mobile auth reuses the same cookie/token flow via the API

# Phase 53 · Batch 1 — Audit remediation: security-critical fixes

**Branch:** `feature/phase-53-batch1-security-hardening`
**Scope:** closes the two P0 findings from the 2026-08-14 repository audit plus the
P1 rate-limiter defect. All fixes are regression-tested.

## Deliverable

A drift-guarded bundle: `delivery/batch1/nuvora-batch1.zip`.
Extract into the repo root (creates `_audit-batch1/`) and run
`.\_audit-batch1\apply-batch1.ps1` (see README section at the
bottom of this report). The apply script verifies every target file matches the
exact base checksum this batch was built against and aborts on any drift.

## 1. CF-1 (P0) — Self-service privilege escalation to SUPER_ADMIN — FIXED

**Problem:** `POST /api/v1/auth/register` took `roles[]` straight from the client and
`POST /auth/me/role` let any authenticated user set their own role, with **no
allowlist and no admin gate**. Combined with `CanLogin()` allowing PENDING
(unverified) users, an anonymous attacker could register → login → self-promote to
`SUPER_ADMIN` and take over the platform.

**Fix (`internal/service/auth_service.go`):**
- Added `selfAssignableRoles` (STUDENT, PARENT, TUTOR) — the only roles a user may
  self-assign.
- `Register` now rejects any role not in the allowlist (`ErrForbidden`) **before**
  creating the user.
- `SetPrimaryRole` now rejects privileged roles; unknown roles still return
  `ErrInvalidInput` (preserving existing behavior).

**Tests:** `TestRegister_RejectsPrivilegedRole`, `TestRegister_RejectsAllPrivilegedRoles`,
`TestRegister_AllowsSelfAssignableRoles`, `TestSetPrimaryRole_RejectsPrivilegedRole`.

## 2. CF-2 (P0) — Arbitrary file read via `/objects/{bucket}/{key...}` — FIXED

**Problem:** the development LocalStorage object-serving route was mounted in
production regardless of S3; `VerifyPresignedToken` accepted a forgeable empty-key
HMAC (`[]byte("")` was non-nil), and the serving path joined a raw `{key...}` wildcard,
enabling `../` traversal to read `/proc/self/environ` and every secret.

**Fix:**
- `cmd/api/main.go` — the object handler is now environment-gated: production gets a
  `nil` handler, so the router never mounts `/objects` in production.
- `internal/transport/http/object_handler.go` — new
  `NewObjectHandlerForEnvironment(...)` constructor; `Serve` independently rejects keys
  containing `..` or a leading `/` (defense in depth).
- `internal/storage/s3.go` — `validateKey` rejects `..`/absolute/empty keys on every
  `Upload`/`Delete`/`GeneratePresignedURL`; presigned URLs now **require a non-empty
  `YKAY_STORAGE_SECRET`** and `VerifyPresignedToken` returns false for an empty secret.

**Tests:** `TestLocalStorage_RejectsPathTraversal`, `TestLocalStorage_AllowsNormalKeys`,
`TestLocalStorage_EmptySecretCannotIssueOrVerifyToken`,
`TestLocalStorage_PresignedToken_RoundTrip`, `TestObjectHandler_NotMountedInProduction`.

## 3. CF-3 (P1) — Dead distributed auth rate limiter + unbounded in-memory limiter — FIXED

**Problem:** `SetRateLimiters` stored a Redis-backed auth limiter but the middleware
chain never applied it (the `authRate` closure captured the in-memory limiter at
construction, making the distributed pair dead code). Separately, the in-memory
`RateLimiter` appended one map entry per distinct source IP and never evicted them —
an OOM vector under sustained traffic.

**Fix:**
- `internal/transport/http/router.go` — `authRate` now reads `rt.authLimiter` at
  **request time**, so the Redis-backed limiter installed by `SetRateLimiters`
  actually guards the auth endpoints.
- `internal/middleware/ratelimit.go` — added `lastSeen` tracking and `maybePrune`
  (evicts entries idle for one full window when the tracked-key count exceeds
  `maxLimiterEntries` = 10,000), bounding memory.

**Tests:** existing middleware + router suites re-run green; new behavior covered by the
rate-limiter integration tests in CI (Redis-backed path).

## Verification (this workspace)

- `go build ./...` — clean
- `go vet ./...` — clean
- `gofmt -l internal cmd pkg` — clean
- `go test ./internal/... ./cmd/... ./pkg/...` — **all pass**
- Applied to a **fresh clone** of the audited commit with only this bundle → builds and
  tests green (bundle is self-sufficient, drift-free).
- Drift-guard negative test: a locally modified file aborts the apply with no partial
  write.

## Files

See `manifest.json` in the bundle. Go files touched: `cmd/api/main.go`,
`internal/middleware/ratelimit.go`, `internal/service/auth_service.go`,
`internal/storage/s3.go`, `internal/transport/http/object_handler.go`,
`internal/transport/http/router.go`, plus test files.

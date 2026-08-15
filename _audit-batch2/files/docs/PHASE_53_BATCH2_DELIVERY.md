# Phase 53 · Batch 2 — Audit remediation: hardening & CI

**Branch:** `feature/phase-53-batch2-hardening-ci`
**Scope:** closes CF-4 (type gate in the deploy path), adds a request-body size cap,
and adds the `user_roles(role_id)` index. Lower-risk hardening; no behavioral risk to
existing flows.

## Deliverable

A drift-guarded bundle: `delivery/batch2/nuvora-batch2.zip`.
Extract into the repo root (creates `_audit-batch2/`) and run
`.\_audit-batch2\apply-batch2.ps1` (same drift-guard mechanics as
batch 1).

## 1. CF-4 (P1) — Type errors ignored in the production build path — FIXED

**Problem:** `next.config.js` sets `typescript.ignoreBuildErrors` and
`eslint.ignoreDuringBuilds` to keep constrained CI builds fast, and the Vercel deploy
job ran `vercel build --prod` **without** running `tsc` first. The only type gate was the
CI frontend job, so type errors could ship to production via the deploy workflow.

**Fix (`.github/workflows/deploy.yml`):** the `deploy-web` job now runs
`npx tsc --noEmit` as an explicit, authoritative type gate **before** `vercel build`.
CI already runs the same gate; the deploy path now cannot skip it.

## 2. JSON request body size cap — added

`internal/transport/http/dto.go` — `DecodeJSON` now wraps the body in
`http.MaxBytesReader` with a 1 MiB limit before decoding, rejecting oversized payloads
instead of buffering them unboundedly. Rejected bodies surface as a 400 via the existing
error envelope.

## 3. `user_roles(role_id)` index — added

New migration `000033` adds `idx_user_roles_role_id ON user_roles(role_id)`. Role-scoped
queries (e.g. "list admins", admin inbox/audit joins) previously scanned the table
because only the composite `UNIQUE(user_id, role_id)` index existed.

**Rollback:** `migrations/000033_user_roles_role_index.down.sql` drops the index.
Run with `go run ./cmd/migrate --cmd=up` / `--cmd=down`.

## Verification (this workspace)

- `go build ./...`, `go vet ./...`, `gofmt -l internal cmd pkg` — clean
- `go test ./internal/... ./cmd/... ./pkg/...` — all pass
- `deploy.yml` parsed as valid YAML
- Applied to a fresh clone with batch 1 + this bundle → builds and tests green.

## Files

`.github/workflows/deploy.yml`, `internal/transport/http/dto.go`,
`migrations/000033_user_roles_role_index.up.sql`, `migrations/000033_user_roles_role_index.down.sql`.

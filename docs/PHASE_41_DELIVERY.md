# PHASE 41 — FIRST REAL-POSTGRES DEPLOYMENT + ALL SCHEMA/REPO BUGS FIXED — DELIVERY

Branch: `feature/phase-41-deploy-real-pg`
Base: `main` @ `f5de21c` (phase 40)
Delivery method: git bundle `ykay-virtual-phase-41.bundle`

---

## What happened

**We actually deployed.** This phase stood up the production stack in the
sandbox with **real PostgreSQL 17** (previously every run used the in-memory
fallback — the postgres repositories had NEVER executed against a real
database). The full E2E suite now passes **141/141 against real Postgres**
and **141/141 in memory mode** (same suite, both modes).

## Migrations fixed (found only by running against a real DB)

| File | Bug | Fix |
|---|---|---|
| `000001_identity.up.sql` | Inline `UNIQUE (email) WHERE …` is **invalid Postgres** (partial unique constraints don't exist) | Replaced with `CREATE UNIQUE INDEX users_email_unique … WHERE deleted_at IS NULL` |
| `000015_portals.up.sql` | Index predicate `WHERE start_at >= NOW() - INTERVAL` — NOW() is not IMMUTABLE | Dropped the predicate (plain index) |
| `000024_schema_fixes` (new) | `subjects` missing `updated_at` (repo scans it); `auth_tokens` purpose CHECK lacked `LOGIN_CODE` | Added column + extended CHECK |
| `000025_tutor_subjects_unique` (new) | `tutor_subjects` had no unique constraint for the repo's `ON CONFLICT (tutor_profile_id, subject_id)` | Added unique index |
| `000026_enrollment_updated_at` (new) | `cohort_enrollments` missing `updated_at` (status update sets it) | Added column |

> These are safe to edit in place because no production database had ever
> applied them (pre-launch). From here on, forward-only migrations.

## Code fixes (latent real-DB bugs)

- **`clientIP`**: IPv6 `[::1]` failed the `inet` column → now uses
  `net.SplitHostPort` + bracket trim.
- **Tutor search**: queried non-existent `locations.area/city/state` →
  searches `locations.name` (hierarchical schema).
- **`scanTutor`**: 25 columns selected, 24 scanned → now scans the derived
  `location_label`.
- **Vetting `GetProfileBy*`**: raw `sql.ErrNoRows` → mapped to
  `domain.ErrNotFound` (services depend on it).
- **Vetting document events**: `ToStatus: "DOC_"+status` is not a valid
  `tutor_status` enum → uses `status`; **swallowed event errors now
  propagate** (was: commit-fails-with-vague-error).
- **Orders admin list**: referenced non-existent `orders.deleted_at`.
- **Payouts admin list**: empty status crashed the enum → lists all.
- **Payments.metadata** (jsonb): manual-confirm stored plain text →
  marshals `{"type":"manual","note":…}`; Initiate path unchanged.
- **`RefundOrder`/`refundEscrowInUOW`**: helper still committed internally →
  double-commit on refunds; helper now leaves commit to callers.
- **Memory wiring parity**: memory branch never wired `StudentLink` (booking
  authz silently skipped in memory mode) → wired + added
  `StudentExistsForParent` to `ParentStudentLinkMemory`.
- **Server-side 5xx logging**: `WriteAppError` now logs the real cause
  (client still gets a generic message) — production observability win.

## New tooling

- **`scripts/e2e-pg.sh`** — full E2E against real Postgres: resets the DB
  (destructive), migrates, seeds reference rows, boots the API in postgres
  mode, runs the suite. The definitive release gate.
- **`scripts/seed-refs.sql`** — deterministic reference rows the suite
  hardcodes (cohort c010 + lessons, tutor profile 0102, programmes,
  deterministic competency bank for Mathematics, assignments, quiz,
  learner) — mirrors the memory seeds for FK resolution.
- **E2E hardening**: subject id resolved dynamically (works in both modes);
  booking uses the real parent id from `/auth/me` instead of a hardcoded
  seed id.

## Verification

```text
gofmt / go build / go vet     PASS
go test ./...                 PASS
tsc / next build              PASS (unchanged client surface)
scripts/e2e.sh (memory)       141 passed · 0 failed
scripts/e2e-pg.sh (real PG)   141 passed · 0 failed   ← the headline
Live stack (this sandbox):
  PostgreSQL 17.10 · 26 migrations applied · 75+ tables
  API (postgres mode) :8080 · web (Next standalone) :3100
  login via rewrite → real DB · cohorts/orders served from Postgres
  data persisted across restarts (users/orders/sessions in PG)
```

## How to run the release gate anywhere

```bash
DATABASE_URL="postgres://user:pass@host:5432/db" bash scripts/e2e-pg.sh
```

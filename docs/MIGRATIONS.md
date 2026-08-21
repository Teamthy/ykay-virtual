# Migrations — repeatable workflow

The one-off PowerShell repair scripts (`FIX_*.ps1`, `SEED_ADMINS.ps1`,
`FINALIZE_GIT_STATE.ps1`) were removed. Database changes go through the
numbered, embedded migration chain — nothing else.

## Chain rules

- Files live in `migrations/` as `NNNNNN_name.up.sql` + `NNNNNN_name.down.sql`.
- Numbers are strictly increasing; every version must have an `.up.sql`
  (missing `.down.sql` is reported, not fatal — see `migrations_test.go`).
- `migrations.TestChainStatic` runs in CI and fails on duplicate numbers or
  git conflict markers — the two conditions that broke a live deploy before.
- Never edit a migration that has already run in an environment. Add a new
  numbered pair instead.

## Apply

```bash
# Local (needs Postgres + the standard DATABASE_URL):
go run ./cmd/migrate --cmd=up

# Render: the API applies pending migrations at boot when
# MIGRATE_ON_BOOT=true (set in render.yaml), gated by the readyCheck.
```

Roll back one step: `go run ./cmd/migrate --cmd=down`.

## Seeding

- Roles seed via `internal/repository/memory` (dev) and migration `000001`.
- Curricula + levels seed via migration `000052_curriculum_levels`.
- Demo content is opt-in dev fixture data (`SEED_DEMO_DATA=true`) — never in
  production (config.Validate refuses demo seeds in production).

## Known cosmetic gap

Version `000020` is absent from the chain (a historical renumbering) — this
is harmless: versions are only required to be strictly increasing, and the
static gate validates that. Do not try to "fill" the gap by renumbering
applied migrations; that breaks environments.

## Adding a migration

1. Pick the next free number (currently `000059` is the latest).
2. Write `up` (idempotent where possible: `IF NOT EXISTS`, `ON CONFLICT DO
   NOTHING`) and a `down` that removes exactly what `up` added.
3. Run `go test ./migrations/` — the static gate verifies the chain.
4. Run `go run ./cmd/migrate --cmd=up` against local Postgres and spot-check
   with `psql`; then `--cmd=down` and `--cmd=up` again for reversibility.
5. Commit both files in the same change as the code that uses the schema —
   never ship code that depends on an unmerged migration (see the cohort-join
   P0: transport + service shipped before the domain/repository layer).

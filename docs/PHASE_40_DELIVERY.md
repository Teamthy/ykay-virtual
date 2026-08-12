# PHASE 40 — Production deployment stack + runbook — DELIVERY

Branch: `feature/phase-40-deploy`
Base: `main` @ `f4a5989` (phase 39)
Delivery method: git bundle `ykay-virtual-phase-40.bundle`

---

## What shipped

### Containerization
- **`Dockerfile`** (API) — multi-stage: Go 1.22 alpine build → `scratch`
  runtime, **non-root** (uid 65532), `-trimpath -ldflags "-s -w"` static
  binaries for `api`, `migrate`, `worker`; HEALTHCHECK via new
  **`-healthcheck`** flag on the API (scratch has no curl).
- **`client/Dockerfile`** — multi-stage: deps → build (`output:
  "standalone"` added to `next.config.js`) → standalone runner as non-root
  `nextjs`; `API_PROXY_TARGET` build arg bakes the rewrite target.
- **`docker-compose.prod.yml`** — full prod stack: postgres:16-alpine
  (healthcheck, **no host port exposure**), redis:7-alpine (AOF), a
  `migrate` job (runs `cmd/migrate up` before the API starts), `api`
  (depends on migrate success + redis healthy; healthcheck), `web`
  (depends on api healthy; binds `127.0.0.1:3000` for a TLS proxy in
  front), and a **`backup` service** (pg_dump every N hours → `./backups/`
  with retention).

### Ops tooling (scripts/ + Makefile targets)
- **`scripts/deploy.sh`** — one-command deploy: build → migrate → up →
  wait-for-healthy → smoke `/api/v1/health` + home. `--skip-migrate`
  variant for code-only releases.
- **`scripts/backup.sh`** — custom-format `pg_dump` + retention pruning.
- **`scripts/restore.sh`** — typed-confirmation restore (drop/recreate →
  pg_restore).
- Makefile: `deploy`, `backup`, `restore`, `prod-infra`.

### Configuration & docs
- **`.env.production.example`** — every production variable with fail-fast
  guidance (payments live keys, Google OAuth, Gemini, Expo push, SMTP, S3,
  backup cadence); `.env.production` + `backups/` gitignored.
- **`docs/PRODUCTION_DEPLOY.md`** — the full runbook: architecture
  diagram, first-time setup (Caddy TLS one-liner), everyday ops, health
  endpoints, **rollback rules** (never roll back migrations),
  **backups & DR** (RPO ≤ 24h, RTO 10–30 min, quarterly restore drill,
  off-site copy requirement), scaling notes, monitoring/alerting,
  production security checklist, one-page first-release checklist.

## Verification
```text
gofmt / go build / go vet     PASS
go test ./...                 PASS
tsc --noEmit                  PASS
next build                    PASS → .next/standalone/server.js produced
docker-compose.prod.yml       YAML valid
Standalone boot test          node server.js → home 200, /api/v1 rewrite
                              + login 200 (proxied to the API)
scripts/e2e.sh                139 passed · 0 failed
Live preview site             200
```

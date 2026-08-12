# NUVORA — Production Deployment Runbook (Phase 40)

The complete "what if the developer disappears" guide: architecture,
one-command deploy, rollback, backups/DR, scaling and operational checks.

---

## 1. Architecture

```
                         ┌────────────────────────────┐
  Browser / PWA / App → │  Reverse proxy (TLS)       │
                         │  Caddy / Traefik / Nginx   │
                         └─────────────┬──────────────┘
                                       │ https://app.nuvora.com
                    ┌──────────────────┴───────────────────┐
                    │  web (Next.js standalone, :3000)      │
                    │  • SSR + static + ISR                │
                    │  • /api/v1 → rewrite → api:8080      │
                    └──────────────────┬───────────────────┘
                                       │ http://api:8080
                    ┌──────────────────┴───────────────────┐
                    │  api (Go, :8080)                      │
                    │  • sessions (httpOnly cookie)         │
                    │  • escrow payments, LMS, chat, admin  │
                    │  • /health /health/live /health/ready │
                    └──────┬───────────────────┬───────────┘
                           │                   │
                 ┌─────────┴────────┐  ┌───────┴───────┐
                 │ postgres:16      │  │ redis:7       │
                 │ (vol: postgres_  │  │ (vol: redis_) │
                 │  data)           │  │  data)        │
                 └─────────┬────────┘  └───────────────┘
                           │ nightly pg_dump (backup service)
                 ┌─────────┴────────┐
                 │ ./backups/*.dump │  ← 14-day retention
                 └──────────────────┘
```

Two containers only are exposed: none. Postgres/Redis are internal;
the proxy fronts `web:3000`; the browser never calls the API directly
(same-origin rewrite).

## 2. First-time setup

```bash
# 1. Host prerequisites
apt install docker docker-compose-plugin   # or your distro's equivalent

# 2. Config
cp .env.production.example .env.production
$EDITOR .env.production                    # fill EVERY value (fail-fast validates)

# 3. TLS in front
#    Caddy one-liner (recommended): Caddyfile →
#      app.nuvora.com { reverse_proxy 127.0.0.1:3000 }
#    or Traefik/Nginx with certbot. Ports: web binds 127.0.0.1:3000 only.

# 4. Deploy
bash scripts/deploy.sh
```

`deploy.sh` = build images → run migrations (`cmd/migrate up`) →
start api+web → wait for healthy → smoke `/api/v1/health` + home.

## 3. Everyday operations

```bash
make migrate            # apply pending migrations (against local dev)
DATABASE_URL="postgres://…" bash scripts/e2e-pg.sh   # release gate: full E2E on real Postgres
bash scripts/deploy.sh  # deploy (migrations included)
bash scripts/deploy.sh --skip-migrate   # code-only deploy
bash scripts/backup.sh  # manual backup → ./backups/
bash scripts/restore.sh backups/nuvora-<ts>.dump   # DR restore (asks to confirm)
docker compose -f docker-compose.prod.yml logs -f api web   # logs
docker compose -f docker-compose.prod.yml ps                # status
```

Health endpoints: `/health` (basic) · `/health/live` (process) ·
`/health/ready` (postgres ping; 503 when the DB is unreachable).

## 4. Rollback

```bash
# Revert to the previous images (kept by docker)
docker compose -f docker-compose.prod.yml up -d --no-deps \
  --force-recreate api web
# if images were retagged, rebuild from the previous git tag:
git checkout <previous-tag> && bash scripts/deploy.sh --skip-migrate
```

Rules:
- **Never roll back migrations.** Migrations are forward-only (up/down
  files exist for dev, but in prod prefer "migrate forward" over "down").
  If a release needs a schema change, ship the code that tolerates both
  schemas, deploy code, then migrate.
- If a deploy fails the health gate, `deploy.sh` exits non-zero and the
  previous containers keep running (compose doesn't auto-remove on failure
  of `up`).

## 5. Backups & DR

| Item | Value |
|---|---|
| Cadence | `backup` service runs pg_dump every `BACKUP_INTERVAL_HOURS` (24h) |
| Format | custom (`-Fc`) → `./backups/nuvora-<ts>.dump` |
| Retention | `BACKUP_RETENTION_DAYS` (14) |
| RPO | ≤ 24h (tighten to 6h or hourly by lowering the interval) |
| RTO | ≈ 10–30 min (restore + migrate + deploy) |
| Off-site | copy `./backups/` to object storage nightly (rclone/restic) — **required for real DR** |

Restore drill (do this quarterly):
```bash
docker compose -f docker-compose.prod.yml stop api web
bash scripts/restore.sh backups/nuvora-<ts>.dump
docker compose -f docker-compose.prod.yml up -d api web
```

## 6. Scaling notes

- **api** is stateless except the in-memory rate limiter + memory cache
  (dev fallback only). With Postgres configured, `--scale api=2` works;
  for multiple replicas in production, move rate limiting + cache to Redis
  (documented follow-up).
- **web** (Next standalone) scales horizontally behind the proxy; ISR
  pages are shared via the same origin — no sticky sessions needed
  (sessions are API cookies).
- **postgres** — the 25-connection pool bounds per-instance load; raise
  `MaxOpenConns` only after measuring. Add PgBouncer for high concurrency.
- Capacity estimate: ~10k registered users fits one 2 vCPU / 4 GB box;
  grow vertically first, then horizontally with the Redis-backed limiter.

## 7. Monitoring & alerting

- Health endpoints behind the proxy → UptimeRobot / Better Stack / Grafana
  (free tiers suffice at launch).
- `OTEL_EXPORTER_OTLP_ENDPOINT` — the API is OpenTelemetry-instrumented;
  point it at a collector (Grafana Tempo / Jaeger) for traces.
- Watch: `/health/ready` 503s, 5xx rate in logs, disk on `postgres_data`
  and `./backups`, backup file freshness (alert if the newest dump is
  older than `2×BACKUP_INTERVAL_HOURS`).
- Logs: `docker compose ... logs`; add a log shipper (Loki/CloudWatch)
  when volume justifies it.

## 8. Security checklist (production)

- [ ] `.env.production` gitignored; secrets rotated on staff changes
- [ ] `ALLOWED_ORIGINS` explicit (wildcard rejected by config.Validate)
- [ ] TLS via the proxy; HSTS once confirmed stable
- [ ] Paystack/Flutterwave **live** keys (never test keys in prod)
- [ ] Google OAuth redirect URL registered with Google
- [ ] `GEMINI_API_KEY` set (or `CHATBOT_ENABLED=false`)
- [ ] `EXPO_ACCESS_TOKEN` set for push
- [ ] Backups off-site + a tested restore (quarterly drill)
- [ ] Postgres on a private network (no host port exposure) — compose does this
- [ ] Alert on backup freshness + readiness

## 9. First-release checklist (one-page)

```text
□ .env.production filled   □ DNS → proxy   □ TLS green
□ deploy.sh green          □ /health/ready 200
□ seed check: no demo users in prod (seed only runs on memory fallback,
  which production never uses — it fails fast instead)
□ payment test order (live key, then refund it)
□ Google sign-in round trip  □ push notification on device
□ backup ran + off-site copy   □ restore drill passed
```

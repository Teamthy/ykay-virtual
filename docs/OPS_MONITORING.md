# NUVORA — Operations Monitoring (G3.3)

**Status:** implemented · **Owner:** engineering on-call · **Severity ladder:** `page` (respond now) / `ticket` (next working slot)

## Architecture

```
                    ┌──────────┐  :8080 /metrics   ┌─────────────┐
                    │  api     ├───────────────────►             │
                    └──────────┘                    │ Prometheus  │
                    ┌──────────┐  :8081 /metrics    │ (rules +    │──alertmanager/…→ pager
                    │  worker  ├───────────────────►│  30d TSDB)  │
                    └──────────┘                    └──────┬──────┘
                    ┌──────────────┐  :9100 textfile        │
                    │node-exporter │◄── backup/drill ───────┘
                    └──────────────┘  heartbeats      Grafana (dashboards,
                                                      provisioning auto-loads)
```

- **API** exposes `GET /metrics` on its normal port. When `METRICS_TOKEN` is set, scrapes require `Authorization: Bearer <token>` (fail-closed); unset = open (dev only — set it in production).
- **Worker** serves cron heartbeats + queue depths on `WORKER_METRICS_PORT` (default 8081; `0` disables). It has no other HTTP surface.
- **node-exporter** adds host metrics and scrapes the `./metrics-textfile` directory, where the backup service / scripts write heartbeats (`nuvora_backup.prom`, `nuvora_dr_drill.prom`).

## Metrics contract

| Metric | Labels | Meaning |
|---|---|---|
| `nuvora_build_info` | `version` | deployed API version |
| `nuvora_http_requests_total` | `method, route, code` | requests by normalized route (UUID/ID segments → `:id`) |
| `nuvora_http_request_duration_seconds` | `method, route` | latency histogram |
| `nuvora_jobs_enqueued_total` | `type, backend` | durable-queue enqueues |
| `nuvora_jobs_completed_total` | `type, backend` | successful handler runs |
| `nuvora_jobs_retried_total` | `type, backend` | failed attempts scheduled for retry |
| `nuvora_jobs_dead_lettered_total` | `type, backend` | jobs moved to the dead-letter list |
| `nuvora_jobs_dropped_total` | `type, backend` | malformed / unregistered job types |
| `nuvora_queue_depth` | `backend, state` | ready / processing / delayed / dead depth |
| `nuvora_worker_cron_runs_total` | `cron, result` | cron invocations |
| `nuvora_worker_cron_last_success_timestamp` | `cron` | last success (staleness alerting) |
| `nuvora_backup_last_success_timestamp` | — | textfile heartbeat from backup |
| `nuvora_dr_drill_last_success_timestamp` | — | textfile heartbeat from the restore drill |

Changing a metric name/help requires updating `deploy/prometheus/alerts.yml` and the Grafana dashboard together.

## Dashboards

`deploy/grafana/dashboards/nuvora-api.json` (auto-provisioned as **NUVORA — API & Jobs**):

1. Request rate, 5xx error rate, p50/p95/p99 latency, API/worker liveness
2. Queue depth by state, enqueue/complete rates by job type, dead letters + retries, top routes
3. Cron freshness table, backup age, drill age, build info

## Alerts (deploy/prometheus/alerts.yml)

| Alert | Severity | Fires when |
|---|---|---|
| NuvoraApiDown | page | API unscrapeable 2m |
| NuvoraHigh5xxRate | page | >5% 5xx over 5m |
| NuvoraHighLatency | ticket | p95 > 1s for 10m |
| NuvoraQueueBacklog | page | >100 ready jobs 15m |
| NuvoraDeadLetterBuildup | page | >10 dead jobs 15m |
| NuvoraJobErrorSpike | ticket | sustained retry rate |
| NuvoraCronStale_Holds | page | hold-expiry cron silent 2h |
| NuvoraCronStale_Payouts | page | payout cron silent 8d |
| NuvoraCronStale_Ranking | ticket | ranking cron silent 30h |
| NuvoraBackupStale | page | no backup 26h |
| NuvoraDrillOverdue | ticket | no drill 8d |

### Runbook snippets

**API down** — `docker compose ps` → is `api` healthy? Check `docker compose logs api` for config validation, DB/Redis errors. Verify the reverse proxy in front of `web:3000`.

**High 5xx** — correlate with the last deploy (`nuvora_build_info`), DB/Redis health (`/health/ready`), and the recover middleware logs. OTel traces (Tempo/Jaeger — `OTEL_EXPORTER_OTLP_ENDPOINT`) give per-request detail.

**High latency** — check slow queries (pg_stat_statements), Redis round-trips, and the top-route panel to localize.

**Queue backlog** — is the worker up (`up{job="nuvora-worker"}`)? Scale workers or drain via the queue's operator tooling.

**Dead letters** — inspect via the worker's dead-letter list (RedisQueue.DeadLetters / `nuvora:jobs:dead`), fix the handler, replay the job. Don't delete dead jobs without triage: they represent lost money/access work (payouts, reminders).

**Stale cron** — worker logs the last cron error; restarting the worker re-runs boot recovery (expire holds + learning attempts run once at boot).

**Job errors** — usually a provider outage (email/SMS). Check SMTP logs / provider status pages.

## Wiring check (staging)

```bash
make obs-validate                       # config/rules/dashboard validation
curl -H "Authorization: Bearer $METRICS_TOKEN" localhost:8080/metrics | head
docker compose -f docker-compose.prod.yml logs prometheus | grep -i error
# Grafana: http://<host>:3001 (admin / GRAFANA_ADMIN_PASSWORD) → NUVORA dashboard
```

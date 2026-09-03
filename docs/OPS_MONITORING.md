# YK-Virtual — Operations Monitoring (G3.3)

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
- **node-exporter** adds host metrics and scrapes the `./metrics-textfile` directory, where the backup service / scripts write heartbeats (`ykv_backup.prom`, `ykv_dr_drill.prom`).

## Metrics contract

| Metric                                   | Labels                | Meaning                                                 |
| ---------------------------------------- | --------------------- | ------------------------------------------------------- |
| `ykv_build_info`                         | `version`             | deployed API version                                    |
| `ykv_http_requests_total`                | `method, route, code` | requests by normalized route (UUID/ID segments → `:id`) |
| `ykv_http_request_duration_seconds`      | `method, route`       | latency histogram                                       |
| `ykv_jobs_enqueued_total`                | `type, backend`       | durable-queue enqueues                                  |
| `ykv_jobs_completed_total`               | `type, backend`       | successful handler runs                                 |
| `ykv_jobs_retried_total`                 | `type, backend`       | failed attempts scheduled for retry                     |
| `ykv_jobs_dead_lettered_total`           | `type, backend`       | jobs moved to the dead-letter list                      |
| `ykv_jobs_dropped_total`                 | `type, backend`       | malformed / unregistered job types                      |
| `ykv_queue_depth`                        | `backend, state`      | ready / processing / delayed / dead depth               |
| `ykv_worker_cron_runs_total`             | `cron, result`        | cron invocations                                        |
| `ykv_worker_cron_last_success_timestamp` | `cron`                | last success (staleness alerting)                       |
| `ykv_backup_last_success_timestamp`      | —                     | textfile heartbeat from backup                          |
| `ykv_dr_drill_last_success_timestamp`    | —                     | textfile heartbeat from the restore drill               |

Changing a metric name/help requires updating `deploy/prometheus/alerts.yml` and the Grafana dashboard together.

## Dashboards

`deploy/grafana/dashboards/yk-virtual-api.json` (auto-provisioned as **YK-Virtual — API & Jobs**):

1. Request rate, 5xx error rate, p50/p95/p99 latency, API/worker liveness
2. Queue depth by state, enqueue/complete rates by job type, dead letters + retries, top routes
3. Cron freshness table, backup age, drill age, build info

## Alerts (deploy/prometheus/alerts.yml)

| Alert                       | Severity | Fires when                 |
| --------------------------- | -------- | -------------------------- |
| YK-VirtualApiDown           | page     | API unscrapeable 2m        |
| YK-VirtualHigh5xxRate       | page     | >5% 5xx over 5m            |
| YK-VirtualHighLatency       | ticket   | p95 > 1s for 10m           |
| YK-VirtualQueueBacklog      | page     | >100 ready jobs 15m        |
| YK-VirtualDeadLetterBuildup | page     | >10 dead jobs 15m          |
| YK-VirtualJobErrorSpike     | ticket   | sustained retry rate       |
| YK-VirtualCronStale_Holds   | page     | hold-expiry cron silent 2h |
| YK-VirtualCronStale_Payouts | page     | payout cron silent 8d      |
| YK-VirtualCronStale_Ranking | ticket   | ranking cron silent 30h    |
| YK-VirtualBackupStale       | page     | no backup 26h              |
| YK-VirtualDrillOverdue      | ticket   | no drill 8d                |

### Runbook snippets

**API down** — `docker compose ps` → is `api` healthy? Check `docker compose logs api` for config validation, DB/Redis errors. Verify the reverse proxy in front of `web:3000`.

**High 5xx** — correlate with the last deploy (`ykv_build_info`), DB/Redis health (`/health/ready`), and the recover middleware logs. OTel traces (Tempo/Jaeger — `OTEL_EXPORTER_OTLP_ENDPOINT`) give per-request detail.

**High latency** — check slow queries (pg_stat_statements), Redis round-trips, and the top-route panel to localize.

**Queue backlog** — is the worker up (`up{job="yk-virtual-worker"}`)? Scale workers or drain via the queue's operator tooling.

**Dead letters** — inspect via the worker's dead-letter list (RedisQueue.DeadLetters / `ykvirtual:jobs:dead`), fix the handler, replay the job. Don't delete dead jobs without triage: they represent lost money/access work (payouts, reminders).

**Stale cron** — worker logs the last cron error; restarting the worker re-runs boot recovery (expire holds + learning attempts run once at boot).

**Job errors** — usually a provider outage (email/SMS). Check SMTP logs / provider status pages.

## Wiring check (staging)

```bash
make obs-validate                       # config/rules/dashboard validation
curl -H "Authorization: Bearer $METRICS_TOKEN" localhost:8080/metrics | head
docker compose -f docker-compose.prod.yml logs prometheus | grep -i error
# Grafana: http://<host>:3001 (admin / GRAFANA_ADMIN_PASSWORD) → YK-Virtual dashboard
```

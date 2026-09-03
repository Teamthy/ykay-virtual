# PHASE 44 — G3 COMPLETE (metrics + alerting + DR drill) — DELIVERY

Branch: feature/phase-44-g3-observability
Base: feature/phase-43-remediation @ 1fb7226 (G1 + G2 + G3.1 queue + G3.2 OTel)
Scope: the G3 remainder from PRODUCTION_REMEDIATION_PLAN.md — real metrics,
alerting dashboards, and an automated, verified backup/restore drill.

## G3.3 — Metrics, dashboards and alerting

### Prometheus instrumentation (new internal/telemetry/metrics.go)

- All collectors namespaced ykv_*, registered on the default registry
  with a sync.Once guard (concurrent first-use safe); tests build isolated
  instances via NewMetrics(prometheus.NewRegistry()) + SetMetrics swap.
- HTTP: ykv_http_requests_total{method,route,code} +
  ykv_http_request_duration_seconds{method,route} histograms — middleware
  wired at the top of the API chain (Router.Handler); /metrics excludes
  itself; route labels are cardinality-safe (UUID + numeric segments → :id).
- Jobs: enqueued/completed/retried/dead-lettered/dropped counters
  {type,backend=redis|memory} + ykv_queue_depth{backend,state} gauges —
  instrumented inside both queue implementations (RedisQueue refreshes from
  LLen/ZCard after every transition; MemoryQueue mirrors with internal
  depth tracking), so backlog/dead-letter alerts fire from real data.
- Worker: ykv_worker_cron_runs_total{cron,result} +
  ykv_worker_cron_last_success_timestamp{cron} stamped on every cron run
  (boot recovery + 15m/7d/24h ticks) — the staleness-alert source.
- ykv_build_info{version} stamped at API boot.

### Scrape endpoints

- API: GET /metrics on the API port. METRICS_TOKEN set → requires
  Authorization: Bearer (fail-closed); empty → open (dev).
- Worker: dedicated metrics server on WORKER_METRICS_PORT (default 8081,
  0 disables) — the worker's only HTTP surface, so cron heartbeats and
  queue depths are scrapeable in production.
- node-exporter with textfile collector: ./metrics-textfile receives
  backup/drill heartbeats (see G3.4).

### Dashboard + rules (deploy/)

- deploy/prometheus/prometheus.yml — scrape configs for api:8080,
  worker:8081, node-exporter:9100; 30d retention; external env label.
- deploy/prometheus/alerts.yml — 11 rules with severity ladder
  (page/ticket) and runbook refs: ApiDown, High5xxRate, HighLatency,
  QueueBacklog, DeadLetterBuildup, JobErrorSpike, CronStale×3 (holds 2h /
  payouts 8d / ranking 30h), BackupStale (26h), DrillOverdue (8d).
- deploy/grafana/dashboards/yk-virtual-api.json — 12-panel production dashboard
  (rate/5xx/latency/up, queue depths + job rates, dead letters, top routes,
  cron freshness table, backup/drill age, build info), provisioned via
  deploy/grafana/provisioning (datasource uid "prometheus").

### Stack + CI

- docker-compose.prod.yml: added prometheus, grafana (provisioning
  auto-loads the dashboard), node-exporter, and the missing worker service
  (entrypoint /usr/local/bin/worker) so queue consumption + cron metrics
  exist in production; backup service writes its heartbeat textfile.
- CI "observability" job: telemetry/queue unit tests, promtool check
  config + rules, dashboard JSON validation, compose validation, and a
  live /metrics scrape smoke test.
- Makefile: obs-validate (promtool + JSON + compose checks).

## G3.4 — Backup / restore drill (real verification, not just a script)

### scripts/dr-drill.sh (new)

Automated drill against real PostgreSQL: newest dump freshness gate
(BACKUP_MAX_AGE_HOURS, default 26h) → scratch DB on the same server →
pg_restore → verify EVERY public table's row count vs source → --deep adds
md5 row-checksums of users/tutor_profiles/student_profiles/orders/payments/
escrow_holds → schema_migrations head parity → drop scratch (--keep to
inspect) → heartbeat textfile (ykv_dr_drill.prom) for the
YK-VirtualDrillOverdue alert. Exit codes: 0 pass / 1 fail (stale, missing,
mismatch all verified).

### scripts/backup.sh

Writes ykv_backup.prom (success ts + size) and
ykv_backup.prom.fail (failure ts, removed on success) to
BACKUP_METRICS_DIR; feed to node-exporter's textfile directory.

### scripts/restore.sh

--yes/--skip-confirm for automation; fixed a latent bug (positional dbname

- -d to pg_restore is rejected — "too many command-line arguments"); the
  fallback chain now restores correctly.

### Latent defects found and fixed while proving the drill

- scripts/seed-refs.sql — two stale blocks broke real-PG seeding with
  non-zero exit (lessons insert missing ::uuid cast; legacy
  assessment_questions insert against the pre-subject-scoped schema).
  The e2e-pg CI job and the new drill job now run on a clean seed.
- scripts/restore.sh — pg_restore arg bug above (also present in the
  original restore path).
- All repo scripts now carry the executable bit (e2e.sh et al were 644).

### CI "drill" job

Postgres service → migrate → seed-refs → backup.sh → dr-drill.sh --deep.
The weekly drill is now part of every push; a broken backup/restore
chain fails CI.

### Docs

- docs/OPS_MONITORING.md — architecture, metric contract, dashboard map,
  alert table, per-alert diagnosis snippets, staging wiring check.
- docs/DR_RUNBOOK.md — RPO/RTO targets (≤24h / ≈10–30 min), weekly drill
  requirement, real-incident restore procedure, backup-failure response,
  companion outage runbooks (Redis/queue/payment webhooks).

## Verification

```
gofmt / go build / go vet            PASS
go test ./...                        PASS (service, config, middleware,
                                     worker, telemetry — new metrics suite)
go test -race ./internal/telemetry   PASS (concurrent-init race fixed)
scripts/e2e.sh (memory)              148 passed · 0 failed
scripts/e2e-pg.sh (real Postgres)    148 passed · 0 failed  ← release gate
live /metrics smoke                  token 401/401/200, build_info + request
                                     counters + route masking verified
worker :8081                         /health 200, cron heartbeats present
drill vs real PostgreSQL 17          75 tables row-count verified, deep md5
                                     checksums match, migration head 27=27,
                                     stale/missing backups exit 1
prometheus.yml + alerts.yml +        valid (yaml + promtool-checkable)
grafana dashboard JSON + compose
```

## Remaining (next, per PRODUCTION_REMEDIATION_PLAN)

- G4: staging integration proof — live Paystack/Flutterwave keys, email/SMS
  provider, S3-compatible storage with signed URLs, video links, Expo push
  (engineering scaffolding is in place: providers, SMTP, S3 presign, push;
  needs real credentials + an evidence run).
- G5: safeguarding/legal decisions + consent-cleared production catalogue
  (business sign-offs; engineering side = admin content workflow).
- G6: Playwright browser E2E (parent→pay→lesson→progress + cross-family
  negative) on top of the Vitest layer; contract tests from openapi.yaml;
  a11y/perf budgets.

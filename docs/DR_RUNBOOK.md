# YK-Virtual — Backup & Disaster Recovery Runbook (G3.4)

**Owner:** engineering on-call (primary), founder (escalation).
**Targets (from docs/PRODUCTION_DEPLOY.md):** RPO ≤ 24h (backup every 24h; tighten to ≤6h for pilot), RTO ≈ 10–30 min (restore + migrate + deploy).
**Alerting:** `YK-VirtualBackupStale` (page) and `YK-VirtualDrillOverdue` (ticket) fire automatically — see deploy/prometheus/alerts.yml.

## 1. Routine backups

The compose `backup` service dumps the database every `BACKUP_INTERVAL_HOURS` (default 24h) into `./backups` with `BACKUP_RETENTION_DAYS` (default 14) retention, and writes a success/failure heartbeat to `./metrics-textfile`. Manual backup anywhere:

```bash
DATABASE_URL=postgres://... BACKUP_METRICS_DIR=./metrics-textfile bash scripts/backup.sh
```

Off-site: copy `./backups` to a second region/store (S3 lifecycle, rclone, …) — local disk is not a backup.

## 2. The weekly restore drill (required)

An untested backup is not a backup. Every week (or after any schema/backup-tooling change):

```bash
make drill            # picks the newest backup, restores + verifies, drops scratch
# or manually:
bash scripts/dr-drill.sh --deep
```

What the drill proves:

- the newest dump is fresher than `BACKUP_MAX_AGE_HOURS` (26h),
- `pg_restore` succeeds into a scratch database on the same server,
- **every** public table's row count matches the source,
- `--deep` adds md5 checksums of `users, tutor_profiles, student_profiles, orders, payments, escrow_holds`,
- migration head (`schema_migrations`) matches the source.

Pass → the drill writes `ykv_dr_drill.prom` (keeps `YK-VirtualDrillOverdue` quiet). Fail → it exits 1 and the scratch DB is dropped automatically; use `--keep` to inspect.

**Drill log:** record date, dump used, result and any follow-ups in the ops journal. A failed drill is a page-worthy event: treat as “we have no backups”.

## 3. Restore procedure (real incident)

1. Stop write traffic (scale API to 0 or maintenance mode on the proxy).
2. Restore the newest good dump into a scratch DB first (`dr-drill.sh --dump … --keep`) to confirm it is intact.
3. Restore into production:
   ```bash
   bash scripts/restore.sh --yes backups/yk-virtual-<ts>.dump "$DATABASE_URL"
   ```
4. Run migrations (`make migrate`) if the dump predates newer ones — the drill checks migration-head parity.
5. Health-check (`/health/ready`), spot-check key screens, re-enable traffic.
6. Post-incident: verify the backup service resumes, write up the incident, and re-run the drill.

**RTO clock starts at detection; target ≤30 min including verification.**

## 4. Backup failure response (`YK-VirtualBackupStale`)

1. Check the backup service logs: `docker compose -f docker-compose.prod.yml logs backup`.
2. Common causes: disk full (`df -h` on the backups volume), DB down, credentials changed.
3. Fix, then run a manual backup and a drill in the same sitting.
4. If a restore is ever needed while backups are stale, **stop deployments and DB writes** and page the engineering owner — data loss risk.

## 5. Provider outage / rollback runbooks (companion)

- **Deploy rollback:** `scripts/deploy.sh` is idempotent; to roll back, redeploy the previous image tag (`docker compose -f docker-compose.prod.yml up -d --no-build` with the prior image, or re-run the CI deploy for the last good commit). Migrations are forward-only by policy — see PRODUCTION_DEPLOY.md.
- **Redis outage:** API degrades to in-memory cache; the worker drops to cron-only mode (logged at boot). Payout/reminder jobs queue in Postgres outbox where implemented — verify each handler's idempotency contract before re-running.
- **Payment provider outage:** webhooks are verified and queued (`process_payment_webhook_async`); Paystack/Flutterwave retry their webhooks — never clear a dead-lettered webhook job without reconciling the order/ledger first.

# Ykay Virtual production stack checklist

Minimum launch stack:

- Go API behind TLS with `ENVIRONMENT=production`, `TRUST_PROXY=true`, `SITE_URL`, `COOKIE_DOMAIN`, and locked CORS origins.
- Next.js client with `NEXT_PUBLIC_API_URL` pointed at the public API origin.
- PostgreSQL with daily backups and restore drill.
- Redis for rate limits / transient queues where configured.
- S3-compatible public/private buckets plus a quarantine bucket; never use local disk in production.
- Worker/cron process for notifications, payment reconciliation and operational jobs.
- EAS production mobile builds with explicit `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SITE_URL`.
- Monitoring/alerts for 5xx, payment webhooks, transfer failures, AI budget exhaustion, queue backlog and storage errors.

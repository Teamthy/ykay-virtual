# YK-Virtual on OCI (frontends on Vercel, API/worker/state on OCI)

Production topology:

```
Browser / Expo apps
        │  HTTPS
        ▼
Vercel (Next.js BFF, client/)  ── same-origin /api/v1 proxy ──┐
        ▲                                                       │
        │  static pages, session cookies                        ▼
                                              Caddy (TLS) → api:8080  (Go)
                                                              │
                                              Redis · worker · Postgres · ClamAV
                                                              │
                                                        S3/R2 + Paystack…
                                              All on one OCI Ampere VM (pilot)
```

The Vercel app's `client/app/api/v1/[...path]/route.ts` proxies API calls to
`API_PROXY_TARGET`; set that to `https://$API_HOST`. Cookies are re-bound to
the Vercel host by the proxy (it strips Domain from Set-Cookie), so there is
no cross-site cookie problem.

## 1. One-time VM setup

OCI Always Free Ampere A1 (start 2 OCPU / 12 GB), Ubuntu 22.04/24.04 aarch64,
public IP in the **home region**. Security list / NSG: allow inbound
**22 (your IP), 80, 443 only**. Postgres/Redis are never exposed.

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 fail2ban
sudo usermod -aG docker $USER && newgrp docker
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw --force enable

sudo mkdir -p /opt/ykay/virtual/backups
# Authenticate the VM to pull PRIVATE GHCR images (GitHub PAT with read:packages):
echo "ghp_PAT" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
```

Put the deploy files on the server (the `Deploy OCI` workflow syncs these
automatically; for the first boot copy them manually):

```
/opt/ykay/virtual/
  docker-compose.oci.yml
  Caddyfile
  deploy.sh
  env.production.template
  .env          # copy from template, fill every CHANGE_ME, then: chmod 600 .env
  backups/
```

## 2. First boot (staging first — always)

1. Provision storage buckets (R2/S3): public, private, quarantine; restricted
   credentials; CORS on the bucket allows the Vercel origin for presigned PUTs.
2. Use **Paystack test keys**, a staging `API_HOST`
   (`api-staging.virtual.ykaycollege.com`) and staging Vercel env.
3. From `/opt/ykay/virtual`:
   ```bash
   IMAGE_TAG=latest docker compose -f docker-compose.oci.yml up -d migrate
   docker compose -f docker-compose.oci.yml up -d postgres redis clamav
   # wait for clamav health (start_period 3 min), then:
   IMAGE_TAG=latest docker compose -f docker-compose.oci.yml up -d api worker caddy
   docker compose -f docker-compose.oci.yml logs -f api
   curl -fsS https://api-staging.../health/ready
   ```
   The API refuses to boot in `ENVIRONMENT=production` on test credentials,
   wildcard CORS, open /metrics, a stub meeting provider, missing
   CBT_ATTEMPT_SECRET, etc. — read the fatal error and fix the env.
4. Seed the LMS catalogue: run `seedlms` as a one-off task
   (`docker compose run --rm --entrypoint /usr/local/bin/seedlms api …`).

## 3. Cut the Vercel side

Vercel project for `client/` (see `.github/workflows/deploy.yml`):

- `API_PROXY_TARGET=https://api.virtual.ykaycollege.com`
- `NEXT_PUBLIC_API_URL=https://<vercel-app>/api/v1`
- `NEXT_PUBLIC_SITE_URL=https://<vercel-app>`
- Caddy/CORS `ALLOWED_ORIGINS` on OCI must list the exact Vercel origin(s).

Mobile EAS builds: `EXPO_PUBLIC_API_URL=https://<vercel-app>/api/v1`.

## 4. Go-live drills (must pass before pointing production DNS)

Run these against staging and record results (see root `GO-LIVE-CHECKLIST.md`):

- Fee/webhook: pay in test mode; POST the same webhook 50× → exactly 1
  settlement; amount/currency mismatch rejected.
- Escrow: complete → hold → auto-expire/release → payout OTP; one refund
  (then set `PAYMENT_REFUNDS_ENABLED=true` in production deliberately).
- Cohort oversell race; 60-student exam burst (`scripts/loadtest.sh`).
- Upload EICAR → quarantine; clean file passes.
- Kill Redis / Postgres / S3 one at a time; verify `/health/ready`, restart
  recovery, DLQ behavior.
- **Restore drill:** restore a `backups/*.dump.gz` into a scratch database.
- SSE: an EventSource against `/api/v1/me/events` stays open past 60s and
  receives `: ping` frames (validates the WriteTimeout fix).
- College SSO: login from the EduPortal, suspended-account denial, and the
  503 message while the College portal is down.

## 5. Production deploy

After a merge to `main`, CI must pass; the **Deploy OCI** workflow then builds
a multi-arch GHCR image (`sha-<short>`), syncs `deploy/oci`, and runs
`deploy.sh`, which: pulls the new image → runs migrations (`service_completed_successfully`
gates api/worker) → restarts api/worker → waits for container health **and**
`https://$API_HOST/health/ready` → otherwise **automatically rolls back** to
the previous image and prints logs.

Manual rollback:

```bash
cd /opt/ykay/virtual
IMAGE_TAG=sha-known-good ./deploy.sh
```

## 6. Day-2 operations

- Logs: `docker compose -f docker-compose.oci.yml logs -f api worker`
  (Caddy access log in the caddy_data volume at /data/access.log).
- Metrics: `curl -H "Authorization: Bearer $METRICS_TOKEN" https://$API_HOST/metrics`
  (point a Prometheus/Vercel-side scraper; alerts in deploy/prometheus).
- Backups land in `./backups` daily, retained 14 days; copy off-box
  (object storage) and monitor that files appear.
- Keep the VM at **one api replica** until you confirm distributed rate
  limiting, the Redis session cache, and the shared AI token budget
  (currently per-process — see `internal/service/chat_gemini.go`) all use
  Redis; they already wire automatically when `REDIS_URL` is set, but verify
  before `--scale api=2`.
- Resource sharing with the EduPortal stack (same VM): leave headroom for
  the second Postgres + backup jobs; prefer Upstash for the EduPortal
  limiter instead of running a third Redis, and schedule backup windows off
  peak.

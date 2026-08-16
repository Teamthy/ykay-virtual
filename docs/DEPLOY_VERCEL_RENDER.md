# NUVORA Production Deploy — Vercel (web) + Render (API/data)

Pilot target architecture. Everything below was verified against the local
production-shaped stack (Dockerfile image, production config validation,
e2e-web with real Postgres + Redis).

---

## 0. Monorepo — how the split works (read this first)

The repo is one git repository with three deployables:

```
ykay-virtual/
├── cmd/ internal/ migrations/  → Render   (Go API + worker)
├── client/                     → Vercel   (Next.js web app)
└── mobile/                     → EAS/Expo (mobile app)
```

Each platform builds ONLY its slice — you configure which slice once:

| | Vercel | Render |
|---|---|---|
| What it builds | `client/` only | Go backend only |
| How it knows | **Root Directory = `client`** (set in the Vercel UI during import) | Blueprint at repo root reads `render.yaml`; each Docker service builds the root `Dockerfile` (the image compiles the Go binaries — nothing else) |
| Config files | `client/vercel.json` (regions, install cmd, deploys on `main` only) | `render.yaml` (services + databases) |
| Monorepo gotchas handled | `next.config.js` auto-detects Vercel (`process.env.VERCEL`) and skips the standalone-output + single-CPU workarounds that exist for low-memory hosts | `.dockerignore` keeps `client/node_modules`, `.next`, mobile, `.env*` out of the build context; migrations are EMBEDDED in the binaries (scratch image has no files) |
| Deploy trigger | auto on push to `main` | auto on push to `main` |

**Why the client uses a proxy instead of calling the API directly:**
session cookies. The browser only talks to the web origin (Vercel);
`/api/v1/*` is rewritten server-side to `API_PROXY_TARGET` (the Render
API). `SITE_URL` must therefore be the WEB origin — it sets the cookie
Domain and the links inside emails. `ALLOWED_ORIGINS` (fail-closed,
required in production) lists the web origin.

---

```
                         ┌──────────────────────────────┐
   Browser (Lagos …) ───▶│  VERCEL — Next.js client     │
                         │  nuvora.vercel.app (or your  │
                         │  domain)  Root Directory:    │
                         │  client/                    │
                         └──────────────┬───────────────┘
                                        │ rewrite /api/v1/* → API_PROXY_TARGET
                                        ▼
                         ┌──────────────────────────────┐
                         │  RENDER — nuvora-api (Docker)│
                         │  Go API :8080                │
                         └──────┬──────────────┬────────┘
                                │              │
                 ┌──────────────▼──┐    ┌──────▼───────────────┐
                 │ nuvora-db       │    │ nuvora-redis         │
                 │ PostgreSQL      │    │ sessions/cache/queue │
                 └─────────────────┘    └──────────┬───────────┘
                                                   │ BRPOPLPUSH
                                    ┌──────────────▼───────────┐
                                    │ nuvora-worker (Docker)   │
                                    │ outbound email/SMS/push  │
                                    └──────────────────────────┘

   Mobile app (Expo) ── bearer token ──▶ nuvora-api directly
```

Key wiring facts (why the config below is shaped this way):

- **Session cookies**: the browser only ever talks to the *web origin*
  (Vercel); `/api/v1` is proxied server-side. `SITE_URL` must therefore be
  the WEB origin — it sets the cookie Domain and the links inside emails.
- **ALLOWED_ORIGINS** is fail-closed and REQUIRED in production: list the
  web origin (and the API host if you call it directly from a browser).
- **Worker**: in production, outbound email is routed through the
  Redis-backed dispatch queue — deploy `nuvora-worker` or receipts,
  reminders and invite emails will never leave the queue.
- **Migrations**: the chain is embedded in both the `migrate` and `api`
  binaries. `render.yaml` ships `MIGRATE_ON_BOOT=true`, so the FIRST API
  deploy creates the schema automatically. Set it to `false` afterwards.

---

## 0. Prerequisites — secrets to create BEFORE you start

| Secret | Where to get it | Notes |
|---|---|---|
| Paystack keys | dashboard.paystack.com → Settings → API Keys | **Use TEST keys first** (sk_test_…). The pilot gate requires a real test-key transaction before live keys. |
| Flutterwave keys | dashboard.flutterwave.com → Settings → API | Test keys first (FLWSECK_TEST-…). |
| SMTP (Postmark/Brevo/Resend) | e.g. account.postmarkapp.com | Free tiers are fine for pilot volume. |
| Termii API key | termii.com → dashboard | SMS provider; optional but configured. |
| Whereby | whereby.com → developer | Meetings; optional — `MEETING_PROVIDER=stub` works without it. |
| Google OAuth | console.cloud.google.com → OAuth client | Optional. Redirect URL: `https://<web origin>/auth/google/callback`. |
| Gemini API key | aistudio.google.com | Optional (chat assistant). |
| EXPO_ACCESS_TOKEN | expo.dev → Access tokens | Optional (push notifications). |
| METRICS_TOKEN | generate: `openssl rand -hex 32` | Bearer token required to scrape `/metrics`. |
| PAYSTACK_SECRET / FLUTTERWAVE_SECRET | your gateway secret keys | Double as the webhook HMAC secret — must match the live/test key on the gateway. |

---

## 1. Render — backend (do this FIRST)

1. Push `main` to GitHub (the CI run must be green first — see the
   checklist gates).
2. Render → **New → Blueprint** → select the repo → it reads `render.yaml`
   and creates: `nuvora-db`, `nuvora-redis`, `nuvora-api`, `nuvora-worker`.
   - If you forked the repo, edit the `repo:` lines in `render.yaml` to your
     GitHub path.
3. Open `nuvora-api` → **Environment** and fill every `sync:false` value:
   - `SITE_URL` = `https://nuvora.vercel.app` (use the *actual* Vercel URL
     from step 2 — you can update it after the first deploy)
   - `ALLOWED_ORIGINS` = `https://nuvora.vercel.app`
   - the payment/email/SMS/webhook secrets from the table above.
4. Migrations — automatic on the first deploy: `render.yaml` ships
   `MIGRATE_ON_BOOT=true`, so the first `nuvora-api` boot applies the
   embedded chain and creates the schema. After the first successful
   deploy, set it to `false` in the dashboard (prevents concurrent-boot
   races if you ever scale to multiple replicas).
   - Manual fallback (any time): Render → `nuvora-api` → **Shell** →
     `/usr/local/bin/migrate --cmd=up` (the chain is embedded in the
     binary; no filesystem needed).
5. Health checks:
   - `https://nuvora-api.onrender.com/health` → `200 ok`
   - `https://nuvora-api.onrender.com/health/ready` → `200` (Postgres
     reachable). First hit may take 30–60s if the free instance slept.

> Upgrade path for the pilot: Postgres `starter` ($7/mo) before day 30 of
> the free tier; keep Redis free; API/worker `starter` if cold starts hurt.

---

## 2. Vercel — web client

1. vercel.com → **Add New Project** → import the same repo.
2. Settings to set during import:
   - **Root Directory**: `client`
   - Framework: Next.js (auto-detected; `client/vercel.json` sets `fra1`
     region — Frankfurt, best latency to Lagos).
3. **Environment Variables** (Project → Settings → Environment Variables,
   apply to Production):
   | Key | Value |
   |---|---|
   | `API_PROXY_TARGET` | `https://nuvora-api.onrender.com` |
   | `NEXT_PUBLIC_API_URL` | `https://nuvora-api.onrender.com/api/v1` |
   These are read at BUILD time (rewrites + SSR fetches) — changing them
   triggers a redeploy.
4. Deploy. Then **update Render** `SITE_URL` + `ALLOWED_ORIGINS` to the
   real `https://<project>.vercel.app` URL and let the API redeploy.

---

## 3. Post-deploy smoke tests (run every one — 10 minutes)

```bash
API=https://nuvora-api.onrender.com
WEB=https://<project>.vercel.app

# 1. liveness + readiness
curl -s $API/health && curl -s $API/health/ready

# 2. catalogue renders (public, cached)
curl -s $API/api/v1/subjects | head -c 200; echo
curl -s $WEB/tutors -o /dev/null -w "tutors=%{http_code}\n"

# 3. signup + emailed verification code (proves SMTP end to end)
curl -s -X POST $API/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"pilot1@yourdomain.com","password":"password123","roles":["PARENT"]}' -w "\nregister=%{http_code}\n"
curl -s -X POST $API/api/v1/login-code/request -H 'Content-Type: application/json' \
  -d '{"email":"pilot1@yourdomain.com"}' -w "\ncode-sent=%{http_code}\n"
# → the 6-digit code must arrive in the inbox, then:
curl -s -X POST $API/api/v1/auth/login-code/confirm -H 'Content-Type: application/json' \
  -d '{"email":"pilot1@yourdomain.com","code":"123456"}' -w "\nconfirm=%{http_code}\n"

# 4. browser: /login?next=/cohorts → login → returns to /cohorts
# 5. browser: /onboarding → full 7-step signup → dashboard
# 6. payments: initiate a checkout (test key) and confirm the sandbox
#    authorization page opens (Paystack test card 4084 0840 8408 4081)
```

---

## 4. Custom domain (when ready)

1. **Vercel** → Project → Settings → Domains → add `www.yourdomain.com`
   (+ root). Update your DNS CNAME/ALIAS as Vercel instructs. SSL is
   automatic.
2. **Render** → `nuvora-api` → Settings → Custom Domain → add
   `api.yourdomain.com` → CNAME in your DNS → SSL auto-provisions.
3. Update EVERYTHING that references the old origins, then redeploy both:
   - Render: `SITE_URL`, `ALLOWED_ORIGINS`, `GOOGLE_REDIRECT_URL`
   - Vercel: `API_PROXY_TARGET`, `NEXT_PUBLIC_API_URL`
   - Mobile app: `apiUrl` (below)

---

## 5. Mobile app (NUVORA on the go)

The app reads its API base from Expo config
(`mobile/app.json` → `expo.extra.apiUrl`):

```json
{ "expo": { "extra": { "apiUrl": "https://api.yourdomain.com/api/v1" } } }
```

Build via EAS (`eas build --profile production`). The API allows the app
because it authenticates with bearer tokens (`/auth/login/mobile`) — no
CORS/origin work needed; no cookie involved.

---

## 6. Rollback + day-2 ops

- **Vercel**: Deployments tab → ⋯ → *Promote/Rollback* (instant).
- **Render**: `nuvora-api` → Manual Deploy → *Deploy latest commit* or pick
  a previous successful deploy.
- **Database**: Render PG takes automatic daily snapshots; restore from
  the dashboard (or use the repo's `scripts/backup.sh` against
  `BACKUP_METRICS_DIR`-style paths if self-hosting ops).
- **Monitor**: `nuvora-api` logs + `/metrics` (bearer = `METRICS_TOKEN`).
  Grafana/Prometheus are in `docker-compose.prod.yml` if you later move to
  a VPS.

## 7. Pilot cost (free/cheap tiers)

| Item | Plan | Cost |
|---|---|---|
| Vercel | Hobby | $0 |
| Render API + worker + Redis | Free (sleeps) | $0 |
| Render Postgres | Starter (before day 30) | ~$7/mo |
| SMTP (Postmark) | Free tier | $0 |

Total ≈ **$7/mo** for the pilot. Upgrade API to `starter` ($7/mo) when
cold starts annoy real users; move to the VPS compose stack
(`docker-compose.prod.yml`) when volume justifies it.

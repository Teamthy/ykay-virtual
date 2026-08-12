# NUVORA — Deploy: Vercel (web) + Render/Fly (API) + Cloudflare + .com domain

The exact plan, verified against how the codebase works. TL;DR: **yes, it
works** — with the caveats below and the CI/CD already wired in
(`.github/workflows/deploy.yml`).

---

## 1. Architecture (what actually happens)

```
            Cloudflare (DNS + CDN + WAF, free)
            ├── app.yourdomain.com ──► Vercel (Next.js, free hobby)
            │        └── /api/v1/*  ──► rewritten server-side to the API
            └── api.yourdomain.com ──► Render web service (Go API)
                     └── postgres (Render managed, or Supabase/Fly)
```

Key point: **the browser only ever talks to Vercel** — the Next.js rewrite
in `next.config.js` (`API_PROXY_TARGET`) proxies `/api/v1` to the API
server-side. That means:

- **No CORS headaches** — same-origin from the browser's perspective.
- **Cookies work** — the `ykay_session` httpOnly cookie is set on your
  domain (through the proxy) and sent same-origin.
- **No IP exposure** — your API origin stays behind Cloudflare.

## 2. Vercel (frontend) — free hobby is fine

1. Push the repo to GitHub and **Import** in Vercel (Framework: Next.js).
2. Set project env vars (Build):

| Variable | Value |
|---|---|
| `API_PROXY_TARGET` | `https://api.yourdomain.com` (or the Render `.onrender.com` URL) |
| `NEXT_PUBLIC_API_URL` | same API origin (used by SSR fetches) |
| `NEXT_PUBLIC_SITE_URL` | `https://app.yourdomain.com` |

3. Build command `npm run build` (already configured) — the rewrite picks
   up `API_PROXY_TARGET` at build time.
4. Custom domain: add `app.yourdomain.com` in Vercel → DNS (see §4).

> Free hobby limits: 100 GB bandwidth/mo, 10s function duration — fine for
> this app (mostly static/ISR + small API calls). The rewrite counts toward
> bandwidth, not function time.

## 3. Backend — Render (free) vs Fly.io (cheap, always-on)

### Option A — Render (free, but with gotchas)

| Gotcha | Impact | Mitigation |
|---|---|---|
| **Free Postgres expires after 30 days** | Total data loss | Use `starter` Postgres ($7/mo) OR Supabase/Neon free PG (never expires; set `DATABASE_URL` with `sslmode=require`) |
| **Free web service sleeps after 15 min idle** | First request after sleep takes ~30–60 s | Free UptimeRobot ping every 10 min (keeps it warm enough); or `starter` |
| Free tier = 1 instance | In-memory rate limiter fine (single instance) | Don't `--scale` until Redis-backed limiting ships |
| No custom domain on free? | — | Free services DO support custom domains |

Setup: push to GitHub → Render dashboard → **New + → Blueprint** →
paste `render.yaml` (in repo) → it creates the API service + Postgres and
asks for the `sync:false` secrets (SITE_URL, ALLOWED_ORIGINS, PAYSTACK,
GOOGLE, GEMINI, EXPO, SMTP). Or create the web service manually: runtime
**Docker**, repo root, `Dockerfile`.

Deploy automation: dashboard → service → **Events → Deploy Hook** → copy
the URL into the repo secret `RENDER_DEPLOY_HOOK`; the `deploy` workflow
fires it on every push to main.

### Option B — Fly.io (no free tier, but ~$3–6/mo, always-on)

```bash
fly launch --name nuvora-api --dockerfile Dockerfile   # from repo root
fly secrets set ENVIRONMENT=production SITE_URL=https://app.yourdomain.com \
  ALLOWED_ORIGINS=https://app.yourdomain.com DATABASE_URL=...
fly deploy
# Postgres: fly postgres create --name nuvora-db   (~$15/mo) — or keep
# Render/Supabase Postgres and point DATABASE_URL at it.
```

Deploy automation: add `FLY_API_TOKEN` secret and a step in
`deploy.yml`:
```yaml
- uses: superfly/flyctl-actions/setup-flyctl@master
- run: flyctl deploy --remote-only
```

### Which one?
- **Demo / pre-launch:** Render free + Supabase free Postgres (no expiry)
  — zero cost, accept cold starts.
- **Semi-serious:** Render `starter` web + `starter` postgres — ~$14/mo,
  no sleep, no expiry, one click.
- **You like Fly:** Fly machines (~$3/mo) + Supabase PG — always-on, cheap.

## 4. Cloudflare + the .com domain

1. Buy the domain at **Cloudflare Registrar** (at-cost, no markup) or any
   registrar, then move nameservers to Cloudflare (free plan).
2. DNS records (proxy ON / orange cloud):

| Type | Name | Target |
|---|---|---|
| CNAME | app | `cname.vercel-dns.com` |
| CNAME | api | `<your-service>.onrender.com` (or Fly `.fly.dev`) |

3. SSL/TLS: **Full (strict optional)** — Cloudflare terminates TLS and
   re-encrypts to Vercel/Render (both provide valid certs).
4. Vercel: add `app.yourdomain.com` as the custom domain (it verifies
   via the CNAME).
5. Render: add `api.yourdomain.com` under Settings → Custom Domains.
6. Wait 5–30 min for DNS propagation, then:

```bash
curl https://app.yourdomain.com/api/v1/health/ready   # → {"status":"ready"}
```

## 5. Google OAuth (when you're ready)

- `GOOGLE_REDIRECT_URL=https://app.yourdomain.com/auth/google/callback`
  (the Next.js callback route sets the cookie on your domain — this is the
  fixed phase-38 flow).
- Register that exact URL in Google Cloud Console → OAuth consent screen →
  Authorized redirect URIs. Add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  secrets on Render/Fly.

## 6. Android APK — local download (no Play Store)

1. Build the APK:
   ```bash
   cd mobile
   npx eas build -p android --profile preview   # → .apk (internal)
   ```
   (or `expo run:android` / `gradlew assembleRelease` with a keystore).
2. Download the artifact from Expo → rename to `nuvora-app.apk`.
3. Host it: drop it in `client/public/` (served by Vercel — this is what
   `/download` links to), or Cloudflare R2/Drive for bigger files.
4. The `/download` page explains sideloading ("Install unknown apps").
5. Point the app at production: `mobile/app.json` → `extra.apiUrl` →
   `https://api.yourdomain.com/api/v1`.

> iOS: no store, no sideload on iPhones — web app only until TestFlight/
> App Store (kit in `docs/STORE_SUBMISSION.md`).

## 7. CI/CD — already fixed and wired

- **`ci.yml`**: `e2e-pg` job now runs the FULL suite against a real
  Postgres 16 service container (was memory-only); the Lighthouse job was
  broken (API died between steps) — now boots API + web + lhci in one step
  and serves the web via the standalone server; prompt evals + Go + TS
  gates unchanged.
- **`deploy.yml`** (new): push to main → deploy web to Vercel (via
  `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets) and trigger
  Render via `RENDER_DEPLOY_HOOK` (skips gracefully if unset). Manual run
  supported.
- **`render.yaml`** (new): Render Blueprint for API + Postgres with the
  secret placeholders.

## 8. First-launch checklist (this plan)

- [ ] Cloudflare nameservers active; DNS records live (app + api)
- [ ] Vercel project imported, env vars set, domain verified
- [ ] Render service up (`/health/ready` = ready) or Fly deployed
- [ ] `https://app.yourdomain.com` loads; login through the proxy works
- [ ] `ALLOWED_ORIGINS` = your web origin (required by fail-fast config)
- [ ] Postgres: Supabase/Neon or paid Render (never the 30-day free one)
- [ ] Backup: `scripts/backup.sh` on a cron (or managed PG backups)
- [ ] APK built, hosted, `/download` works on a phone
- [ ] CI green on main; deploy workflow triggers both targets

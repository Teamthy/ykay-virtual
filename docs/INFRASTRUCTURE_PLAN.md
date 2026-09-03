# YK-Virtual Infrastructure Plan (₦50k / 3 months, domain included)

> Answers: where the API/DB live, how the APK is hosted, how updates ship
> without re-downloads, what to do about Cloudflare/Oracle/VPS, and the full
> budget. Target: **10,000 users** with **~₦6–8k total spend** (the domain).

## 1. Target architecture (all free except the domain)

```
                        Cloudflare (free tier)
                  DNS · CDN · DDoS shield · SSL edge
                              │
        ┌─────────────────────┼──────────────────────┐
        ▼                     ▼                      ▼
  Vercel (free)        Oracle Cloud VM        GitHub Releases / R2
  Next.js web app      ALWAYS FREE tier       APK hosting (free)
                       API · Postgres ·
                       Redis · worker ·
                       ClamAV (docker compose)
```

| Layer                                 | Host                                                                                                                  | Cost           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------- |
| Domain + DNS + CDN + SSL              | Cloudflare (registrar or external .ng registrar, DNS on Cloudflare)                                                   | ₦6–8k / year   |
| Web app (Next.js)                     | Vercel (already live)                                                                                                 | ₦0             |
| API + DB + Redis + worker + antivirus | **One Oracle Cloud Always Free VM** (4 Arm cores / 24 GB RAM / 200 GB disk) running the existing `docker-compose.yml` | ₦0             |
| APK hosting                           | GitHub Releases (primary) or Cloudflare R2 (10 GB free, no egress fees)                                               | ₦0             |
| OTA app updates                       | EAS Update (wired in `mobile/app.json` + `UpdateBanner`; CI publishes on every push)                                  | ₦0 (free tier) |
| CI                                    | GitHub Actions (free)                                                                                                 | ₦0             |
| Monitoring                            | UptimeRobot free (50 monitors) + `GET /health`                                                                        | ₦0             |

## 2. Do we need a VPS if we use Cloudflare? — YES, exactly one (free)

Cloudflare hosts **edges**: DNS, CDN, caching, SSL, DDoS protection. It does
**not** host a Postgres database or a long-running Go API (Workers are
serverless functions, not a DB server). So the shape is:

- **1 VPS** (Oracle Always Free) → the API, Postgres, Redis, worker, ClamAV.
- **Cloudflare in front** → your domain resolves there; it proxies + caches
  traffic to the VM and hides the VM's IP. You never pay for a commercial
  VPS — Oracle's free tier is permanent ("Always Free", not a trial).
- The web app can stay on Vercel; the mobile app and web both call the API
  through `api.yourdomain.ng` (Cloudflare proxy → VM).

## 3. Can the free tier really hold 10k users?

Yes, comfortably. 10,000 registered users on a tutoring marketplace means
maybe 150–400 concurrent requests at peak (logins, catalogue reads, chat
polls). The free VM is **4 Arm vCPUs / 24 GB RAM / 200 GB SSD**:

- Postgres: 24 GB RAM is far more than the current ~100 MB dataset needs;
  a 200 GB disk covers years of lessons/orders at this scale.
- API: the Go service handles 1,200 req/min per IP comfortably (its own
  rate-limit default); on this VM it serves thousands/min.
- `docker-compose.yml` already defines postgres + redis + api + worker +
  clamav — deploy it unchanged.

**Growth path:** if you ever exceed the free VM, move Postgres to a paid
managed tier then; nothing in the code changes.

**Fallbacks if Oracle signup is rejected** (it asks for a card for identity
verification but charges nothing): Hetzner CX22 (~€4/mo ≈ ₦6.5k/mo — would
exceed the budget, so prefer Oracle; a ₦1,500/month Contabo VPS is the
cheapest fallback). Free DB tiers (Neon 0.5 GB, Supabase 0.5 GB) are NOT
enough for 10k users — only the VM's own Postgres qualifies.

## 4. APK hosting + download section (item 5)

- The web already has **/download** (footer link "Android App") reading
  `NEXT_PUBLIC_APK_URL` — set it once in Vercel.
- **Primary: GitHub Releases.** Upload the ~100 MB APK to a release on your
  existing repo. Free, no bandwidth limits for public repos, and the URL
  (`https://github.com/Teamthy/ykay-virtual/releases/latest/download/ykvirtual.apk`)
  is permanent — users download directly.
- **Scale-up: Cloudflare R2.** 10 GB storage + **zero egress fees** (GitHub
  is also fine, but R2 gives you your own branded URL like
  `https://apk.ykvirtual.ng/ykvirtual.apk`). Both work with the same env var.

## 5. Updates without re-download (item 4)

The app already ships this machinery:

- `expo-updates` is configured (`updates.url` = your EAS project,
  `runtimeVersion: sdkVersion`) and the **UpdateBanner** prompts users to
  apply new bundles on launch.
- The new **`.github/workflows/mobile-release.yml`** publishes an EAS Update
  on every push to `main` that touches `mobile/**` (needs one repo secret:
  `EXPO_TOKEN` from expo.dev/settings/access-tokens). Users get every JS/UI
  change on their next app open — **no re-download**.
- A **new APK is only needed when native dependencies change** (rare). The
  same workflow has a manual "Build APK" button for that; download the APK
  from the EAS build page and attach it to a GitHub Release.

## 6. Google Drive materials (item 7) — done in this batch

Teachers paste a Google Drive share link (or any https link) as a course
resource; the backend normalises drive links to `/preview` and the mobile
course player opens them in one tap. Drive links work because Drive hosts
the file; YK-Virtual stores only the link.

## 7. Migration steps (Render → Oracle)

1. Buy the domain (e.g. `virtual.ykaycollege.com.ng` at Whogohost/QServers/Web4Africa,
   ~₦5–8k/year) and add the domain to **Cloudflare** (free plan).
2. Oracle Cloud → create account → **Create VM instance**: Ubuntu 22.04,
   shape **VM.Standard.A1.Flex**, 4 OCPU / 24 GB, region **Johannesburg**
   (closest to Lagos). Always Free.
3. `apt install docker.io docker-compose-plugin`, open ports 22/80/443 in
   the security list (or only 80/443 + SSH).
4. Clone the repo, create `.env.production` (same values as Render + new
   `SITE_URL`, `API_BASE_URL`), then `docker compose up -d`.
5. Migrate data: `pg_dump` on Render → `psql` on the VM
   (`docker compose exec postgres ...`).
6. Cloudflare DNS: `A api.ykaycollege.com.ng → VM-IP` (proxied, orange cloud).
7. Point Vercel's `NEXT_PUBLIC_API_URL` (and mobile `EXPO_PUBLIC_API_URL`
   in EAS) at `https://api.ykaycollege.com.ng/api/v1`.
8. UptimeRobot on `https://api.ykaycollege.com.ng/health` + the Vercel site.

## 8. Budget (₦50,000 for 3 months)

| Line                                                                     | ₦                                     |
| ------------------------------------------------------------------------ | ------------------------------------- |
| Domain `.com.ng` (year, covers 3 months easily)                          | 6,000 – 8,000                         |
| Oracle VM · Cloudflare · Vercel · GitHub · EAS Update · CI · UptimeRobot | 0                                     |
| **Total**                                                                | **≈ ₦6–8k — ~₦42k remains as buffer** |

The buffer covers: a one-month cheap VPS if Oracle verification fails, or a
premium domain (.ng) if you prefer it. Paystack/WhatsApp costs are
per-transaction/per-message (operational, not hosting).

## 9. Done in this batch (code)

- Google sign-in on mobile (WebView OAuth; `GET /auth/google/url?mobile=1`,
  `GET /auth/google/callback-mobile` — token posted into the app).
- Dynamic-type scaling (all `AppText` respects OS font scale, capped 1.4×).
- Bank picker + account-name auto-resolve (Paystack) on mobile.
- Drive-link normalisation + one-tap open in the course player.
- `mobile-release.yml` CI (OTA on push + manual APK build).

## 10. One-time manual steps for you

1. Google Console → your OAuth client → add redirect URIs:
   `https://ykay-virtual.onrender.com/api/v1/auth/google/callback-mobile`
   and `http://localhost:8080/api/v1/auth/google/callback-mobile` (dev).
2. GitHub repo → Settings → Secrets → add `EXPO_TOKEN`.
3. After the first `eas build --profile preview`: attach the APK to a GitHub
   Release and set `NEXT_PUBLIC_APK_URL` in Vercel.

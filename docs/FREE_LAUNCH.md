# YK-Virtual — free launch (₦50–70k, including domain)

This is the account-and-keys checklist for **this repo** (`ykay-virtual`).
It matches the env names the API actually reads (`internal/config/config.go`,
`internal/notification/email.go`, `client/lib/api.ts`).

**Budget:** spend cash on a **domain only**. Everything else below is a free
tier. **pgAdmin 4 is a GUI, not a database.** You still need Neon (or similar).

**Target:** ~5,000 registered users over 3 years. Free tiers are enough if you
do not store video or large files in Postgres.

Do **not** set `SEED_DEMO_DATA=true` or `MEETING_PROVIDER=stub` in production
(the API will refuse or crash).

---

## 0. Order of work (one evening)

1. Buy domain
2. GitHub (already have `Teamthy/ykay-virtual`)
3. Neon Postgres + copy `DATABASE_URL`
4. Render API — set env, first boot with `MIGRATE_ON_BOOT=true`
5. Vercel web — set `NEXT_PUBLIC_API_URL`
6. Point domain at Vercel
7. Resend SMTP
8. Paystack **test** keys + webhook
9. Flutterwave **test** keys + webhook
10. Optional: Upstash Redis, Google OAuth, Cloudinary

Live money (Paystack/Flutterwave **live** keys) waits until CAC/KYC. Use test
keys until then.

---

## 1. Domain (the only paid item)

**Buy:** `virtual.ykaycollege.com.ng` (~₦6–8k/yr) or `ykvirtual.ng` (~₦13–15k). `.com` is
~₦18–22k.

**Where:** WhoGoHost, Web4Africa, or Namecheap (naira card or transfer).

**After purchase — do not point DNS yet.** Finish Vercel first, then:

- Type **A** / **CNAME** as Vercel shows (Project → Settings → Domains).
- Optional later: `api.yourdomain.com` CNAME → `ykay-virtual.onrender.com`.

Until the custom domain works, keep using:

- Web: `https://ykay-virtual-wtar.vercel.app`
- API: `https://ykay-virtual.onrender.com`

---

## 2. GitHub

1. Sign in at [github.com](https://github.com).
2. Repo is already `https://github.com/Teamthy/ykay-virtual`.
3. You need **admin** on the repo to connect Vercel/Render.

No API key from GitHub is required for deploy.

---

## 3. Postgres — Neon (free) + optional pgAdmin

**pgAdmin 4 does not host data.** Install it later to _look_ at Neon.

### Create Neon

1. Open [https://console.neon.tech](https://console.neon.tech).
2. Sign up with GitHub.
3. **New project** → name `ykvirtual` → region closest to Europe/US East
   (Render/Vercel sit there). Postgres version default is fine.
4. After create: **Dashboard → Connection details**.
5. Copy the **pooled** URI (has `-pooler` in the host). It looks like:

   `postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`

6. That string is **`DATABASE_URL`**. Never commit it.

Free tier (2026): ~0.5 GB / project, compute scales to zero when idle.
Do **not** use Render’s free Postgres (deleted after 30 days).

### Optional: pgAdmin 4 (client only)

1. Download [pgAdmin 4](https://www.pgadmin.org/download/).
2. Register → Server → Connection:
   - Host = Neon host (without `postgresql://`)
   - Port `5432`
   - Database `neondb` (or the name Neon shows)
   - Username / password from the URI
   - SSL = **Require**
3. You can browse tables after the first Render migrate.

---

## 4. Metrics token (required or API will not boot)

On any computer:

```powershell
# PowerShell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```

Save the output. That is **`METRICS_TOKEN`**.

---

## 5. Render — API

You already have `https://ykay-virtual.onrender.com`.

1. [dashboard.render.com](https://dashboard.render.com) → sign in with GitHub.
2. Open the **existing** web service (`ykay-virtual` / `yk-virtual-api`).
3. **Environment** → add/replace (Save + manual deploy):

| Key                  | Value                                                                                  | How you get it                         |
| -------------------- | -------------------------------------------------------------------------------------- | -------------------------------------- |
| `ENVIRONMENT`        | `production`                                                                           | type it                                |
| `PORT`               | `8080`                                                                                 | type it                                |
| `DATABASE_URL`       | Neon pooled URI                                                                        | Â§3                                    |
| `SITE_URL`           | `https://ykay-virtual-wtar.vercel.app` then later `https://virtual.ykaycollege.com.ng` | your web origin, **no trailing slash** |
| `ALLOWED_ORIGINS`    | same as `SITE_URL` (comma-separate if both old + new)                                  | must be exact origin, no `*`           |
| `COOKIE_DOMAIN`      | leave **empty** until a custom domain                                                  | then `.virtual.ykaycollege.com.ng`     |
| `METRICS_TOKEN`      | random string                                                                          | Â§4                                    |
| `MEETING_PROVIDER`   | `jitsi`                                                                                | type it — **do not leave stub**      |
| `MIGRATE_ON_BOOT`    | `true` **first** deploy only                                                           | then set `false`                       |
| `TRUST_PROXY`        | `true`                                                                                 | type it                                |
| `SEED_DEMO_DATA`     | `false` or unset                                                                       | never true in prod                     |
| `PAYMENT_PROVIDER`   | `PAYSTACK`                                                                             | type it                                |
| `PAYSTACK_SECRET`    | `sk_test_…`                                                                          | §8                                    |
| `FLUTTERWAVE_SECRET` | Flutterwave secret                                                                     | Â§9                                    |
| `SMTP_HOST`          | `smtp.resend.com`                                                                      | Â§7                                    |
| `SMTP_PORT`          | `587`                                                                                  | Â§7                                    |
| `SMTP_USER`          | `resend`                                                                               | Â§7                                    |
| `SMTP_PASS`          | Resend API key                                                                         | Â§7                                    |
| `EMAIL_FROM`         | `YK-Virtual <beth.t@example.com>`                                                      | Â§7                                    |
| `REDIS_URL`          | Upstash URL or omit                                                                    | §10 — omit is OK (in-memory)        |

4. **Do not** create Render Postgres on the free plan.
5. After first healthy boot (`/health` returns ok), set `MIGRATE_ON_BOOT=false`.
6. Confirm `https://ykay-virtual.onrender.com/health`.

**Jitsi:** no account, no key. Rooms are public `meet.jit.si` links.

---

## 6. Vercel — website

1. [vercel.com](https://vercel.com) → GitHub → import `Teamthy/ykay-virtual`
   (already done: `ykay-virtual-wtar`).
2. **Settings → Environment Variables** (Production):

| Key                    | Value                                                   |
| ---------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | `https://ykay-virtual.onrender.com/api/v1`              |
| `NEXT_PUBLIC_SITE_URL` | `https://ykay-virtual-wtar.vercel.app` then your domain |

3. Redeploy.
4. **Settings → Domains** → add `virtual.ykaycollege.com.ng` → copy the DNS records to
   the registrar.

Root directory must stay `client` if that is how the project is set (check
Project Settings). This repo’s Next app lives in `client/`.

---

## 7. Email — Resend (free)

Login codes never arrive until SMTP works. Prod does **not** print OTPs.
The API now **sends SMTP immediately** (it does not wait for a worker).
If SMTP is missing, Render logs `smtp not configured` and the login-code
request fails instead of pretending success.

1. [https://resend.com/signup](https://resend.com/signup).
2. **API Keys → Create** → copy `re_…` = `SMTP_PASS`.
3. SMTP (Resend):

   - Host `smtp.resend.com`
   - Port `587`
   - User `resend`
   - Pass = API key

4. **Before you own a domain:** `EMAIL_FROM` must be a Resend test sender
   they show in the dashboard (often `beth.t@example.com`).
5. **After domain:** Domains → Add `virtual.ykaycollege.com.ng` → add the DNS TXT/MX/CNAME
   they list → then `EMAIL_FROM=YK-Virtual <leo.a@example.org>`.

**Brevo** (Sendinblue) is the naira-friendly alternative: SMTP host
`smtp-relay.brevo.com`, user = your Brevo login, pass = SMTP key from
Settings → SMTP.

Do **not** set `AUTH_LOG_CODES=true` once real parents exist.

---

## 8. Paystack (test first — free)

1. [https://dashboard.paystack.com/#/signup](https://dashboard.paystack.com/#/signup).
2. Business type can start as **starter**; live payouts later need BVN/NIN/CAC.
3. **Settings → API Keys & Webhooks**.
4. Copy **Test Secret Key** `sk_test_…` → Render `PAYSTACK_SECRET`.
5. Webhook URL:

   `https://ykay-virtual.onrender.com/api/v1/webhooks/paystack`

6. Leave **Test** mode until KYC is done. Then switch to **Live Secret Key**
   and a live webhook (same path).

Paystack charges a **% of each payment**, not a monthly fee.

---

## 9. Flutterwave (test first — free)

1. [https://dashboard.flutterwave.com/signup](https://dashboard.flutterwave.com/signup).
2. **Settings → API Keys** → **Test** secret → Render `FLUTTERWAVE_SECRET`.
3. **Settings → Webhooks**:

   URL: `https://ykay-virtual.onrender.com/api/v1/webhooks/flutterwave`  
   Copy the **secret hash** if the dashboard shows one (keep it aligned with
   whatever Flutterwave signs with — this API accepts verif-hash or HMAC).

4. Go live only after Flutterwave KYC.

---

## 10. Optional free extras

### Redis — Upstash

1. [https://console.upstash.com](https://console.upstash.com) → Redis → Create
   (region us-east).
2. Copy **Redis URL** (`rediss://…`) → Render `REDIS_URL`.
3. If you skip this, the API logs “redis unavailable — in-memory cache—.
   Fine until you have real traffic.

### Google login

1. [https://console.cloud.google.com](https://console.cloud.google.com) →
   New project `ykvirtual`.
2. **APIs & Services → OAuth consent screen** → External → app name YK-Virtual.
3. **Credentials → Create OAuth client ID** → Web application.
4. Authorized redirect URIs:

   `https://ykay-virtual-wtar.vercel.app/auth/google/callback`  
   and later `https://virtual.ykaycollege.com.ng/auth/google/callback`

5. Copy Client ID / Secret → Render `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL` (the **web** callback URL
   above).

Skip until email login works.

### Cloudinary (avatars / homework later)

1. [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free).
2. Not wired as a first-class env in this API yet — keep using
   `client/public/tutors/*.jpg` until you add S3/Cloudinary code.

### Gemini chatbot

1. [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Render: `GEMINI_API_KEY`, `CHATBOT_ENABLED=true`.
3. Or `CHATBOT_ENABLED=false` to turn the widget off.

---

## 11. What you paste where (cheat sheet)

### Render (API)

```
ENVIRONMENT=production
PORT=8080
DATABASE_URL=postgresql://…neon…?sslmode=require
SITE_URL=https://ykay-virtual-wtar.vercel.app
ALLOWED_ORIGINS=https://ykay-virtual-wtar.vercel.app
METRICS_TOKEN=your-long-random
MEETING_PROVIDER=jitsi
MIGRATE_ON_BOOT=true
TRUST_PROXY=true
PAYMENT_PROVIDER=PAYSTACK
PAYSTACK_SECRET=sk_test_…
FLUTTERWAVE_SECRET=FLWSECK_TEST-…
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_…
EMAIL_FROM=YK-Virtual <beth.t@example.com>
```

### Vercel (web)

```
NEXT_PUBLIC_API_URL=https://ykay-virtual.onrender.com/api/v1
NEXT_PUBLIC_SITE_URL=https://ykay-virtual-wtar.vercel.app
```

After the custom domain, change `SITE_URL`, `ALLOWED_ORIGINS`, and
`NEXT_PUBLIC_SITE_URL` to `https://virtual.ykaycollege.com.ng` (same on both sides).

---

## 12. Smoke test

1. `https://ykay-virtual.onrender.com/health` → `{"status":"ok",…}`
2. Open the Vercel site → `/tutors` (API must not CORS-fail).
3. `/register` → check Resend dashboard for the OTP email.
4. Paystack test card on a â‚¦100 checkout (test mode).
5. Create a lesson → meeting URL should look like `https://meet.jit.si/yk-virtual-…`.

---

## 13. Do not do on this budget

| Skip                       | Why                       |
| -------------------------- | ------------------------- |
| Render Postgres free       | Deleted after 30 days     |
| `MEETING_PROVIDER=stub`    | API fatals in production  |
| Whereby                    | Needs a paid key          |
| Termii SMS                 | Email OTP is enough       |
| Live Paystack before KYC   | Settlements will fail     |
| `AUTH_LOG_CODES=true`      | Leaks login codes in logs |
| Treating pgAdmin as the DB | No data, no backups       |

---

## 14. When 5k users actually show up

Move off free **only** when something hurts:

- Neon storage > ~0.5 GB → paid Neon or a ₦ cheap VPS Postgres
- Render sleep annoys parents → Render Starter API
- Need private lesson rooms → Whereby or self-hosted Jitsi

Until then, keep the â‚¦ leftover for domain renewal and CAC, not a “server.—

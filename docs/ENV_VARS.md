# YK-Virtual — Complete Environment Variables (Render + Vercel)

> Every variable below is read by the actual code (verified against
> `internal/config/config.go` + all `os.Getenv` call sites + the client).
> Values marked **"GO-LIVE"** are the ones you must fill for launch.
> Copy-paste friendly: Render → your service → Environment; Vercel →
> Project → Settings → Environment Variables.

---

## 1. RENDER — API service (`ykay-virtual`)

### 1.1 Required for production boot (fail-fast guards)

| Key               | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| `ENVIRONMENT`     | `production`                                                                  |
| `PORT`            | `8080`                                                                        |
| `SITE_URL`        | `https://ykay-virtual-wtar.vercel.app` (→ later `https://www.yourdomain.com`) |
| `ALLOWED_ORIGINS` | `https://ykay-virtual-wtar.vercel.app` (comma-separated; no wildcards)        |
| `COOKIE_DOMAIN`   | `.vercel.app` (later: `.yourdomain.com` — never `*`)                          |
| `DATABASE_URL`    | _(from Render Postgres — already wired)_                                      |
| `REDIS_URL`       | _(from Render Redis — already wired)_                                         |
| `METRICS_TOKEN`   | **GO-LIVE** — any long random string (e.g. 32 hex chars)                      |
| `MIGRATE_ON_BOOT` | `true`                                                                        |

### 1.2 Payments (Paystack — the default provider)

| Key                         | Value                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `PAYMENT_PROVIDER`          | `PAYSTACK`                                                                                        |
| `PAYSTACK_SECRET`           | **GO-LIVE** — `sk_live_...` (also powers bank-list resolution + webhook verification + transfers) |
| `PAYSTACK_TRANSFER_ENABLED` | `false` → **`true`** once you run the ₦1,000 payout test                                          |
| `FLUTTERWAVE_SECRET`        | _(leave empty — not used)_                                                                        |

### 1.3 Email (Resend — recommended) — **GO-LIVE**

| Key                                                   | Value                                  |
| ----------------------------------------------------- | -------------------------------------- |
| `EMAIL_PROVIDER`                                      | `resend`                               |
| `RESEND_API_KEY`                                      | `re_...`                               |
| `EMAIL_FROM`                                          | `YK-Virtual <no-reply@yourdomain.com>` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | _(delete all four when using Resend)_  |

Boot log must print `email provider active: resend`; verify with the super
admin's "Send test email to myself" button.

### 1.4 WhatsApp + SMS — **GO-LIVE**

Two WhatsApp paths — pick ONE:

**A. Meta WhatsApp Cloud API (FREE — recommended at your budget)**

| Key                          | Value                                                                 |
| ---------------------------- | --------------------------------------------------------------------- |
| `WHATSAPP_CLOUD_TOKEN`       | permanent token from Meta developers dashboard (WhatsApp → API Setup) |
| `WHATSAPP_CLOUD_PHONE_ID`    | the phone number id from the same screen                              |
| `WHATSAPP_CLOUD_API_VERSION` | _(optional — default `v21.0`)_                                        |

Meta's own tier includes **1,000 free service conversations/month** — no
prepaid bundle, no $50. Setup: business.facebook.com → create business →
WhatsApp Manager → add your number → developers.facebook.com → WhatsApp →
API Setup → copy the token + phone id.

**B. Termii WhatsApp (paid bundle)**

| Key                      | Value                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `TERMII_WHATSAPP_SENDER` | numeric WhatsApp sender id — **Termii charges a ~$50 prepaid WhatsApp bundle for this; skip it and use path A** |

Common to both paths:

| Key                        | Value                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `TERMII_API_KEY`           | your Termii API key (SMS still uses this)                                                                                  |
| `TERMII_SENDER_ID`         | your SMS sender id (e.g. `YK-Virtual`)                                                                                     |
| `TERMII_FROM`              | _(optional — overrides the SMS "from" label)_                                                                              |
| `WHATSAPP_BUSINESS_NUMBER` | business WhatsApp number shown to users (e.g. `2348012345678`) — the wa.me chat button works with JUST this, no API at all |
| `WHATSAPP_ADMIN_NUMBER`    | YOUR number, international format, digits only — ops alerts land here                                                      |

Boot logs now print `whatsapp provider active: meta-cloud | termii | none`.
With no WhatsApp provider configured the app still works — SMS/email carry
the notifications and the boot log shows `none`.

### 1.5 Google sign-in (optional but wired)

| Key                    | Value                                                       |
| ---------------------- | ----------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | from Google Cloud Console                                   |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console                                   |
| `GOOGLE_REDIRECT_URL`  | `https://ykay-virtual-wtar.vercel.app/auth/google/callback` |

Mobile OAuth needs no extra env — the mobile callback URL is derived from
the request host. Add BOTH of these to the Google OAuth client's allowed
redirect URIs:
`https://ykay-virtual.onrender.com/api/v1/auth/google/callback-mobile` and
`http://localhost:8080/api/v1/auth/google/callback-mobile` (dev).

### 1.6 AI assistant + meetings + push

| Key                 | Value                                                         |
| ------------------- | ------------------------------------------------------------- |
| `CHATBOT_ENABLED`   | `true`                                                        |
| `GEMINI_API_KEY`    | _(optional — AI chat upgrades; degrades gracefully if empty)_ |
| `GEMINI_MODEL`      | `gemini-2.0-flash`                                            |
| `MEETING_PROVIDER`  | `jitsi` (free; `whereby` later)                               |
| `WHEREBY_API_KEY`   | _(optional)_                                                  |
| `EXPO_ACCESS_TOKEN` | _(optional — needed for push notifications from a dev build)_ |

### 1.7 Tuning / ops (optional, safe defaults exist)

| Key                                                                                                        | Value                                                         |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `RATE_LIMIT_PER_MINUTE`                                                                                    | `1200`                                                        |
| `AUTH_RATE_LIMIT_PER_MINUTE`                                                                               | `20`                                                          |
| `TRUST_PROXY`                                                                                              | `1`                                                           |
| `LOG_LEVEL`                                                                                                | `info`                                                        |
| `AUDIT_RETENTION_DAYS`                                                                                     | `90`                                                          |
| `AI_MAX_TOKENS_PER_REQUEST`                                                                                | `1024`                                                        |
| `AI_DAILY_BUDGET_TOKENS`                                                                                   | `200000`                                                      |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                              | _(optional — tracing backend)_                                |
| `S3_ENDPOINT` / `S3_PUBLIC_BUCKET` / `S3_PRIVATE_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` | _(optional — object storage; app falls back to local disk)_   |
| `SEED_OPERATOR_PASSWORD`                                                                                   | only for `seedusers` / `seedlms` runs (not needed at runtime) |

---

## 2. RENDER — worker service (`yk-virtual-worker`)

Same as the API minus the HTTP-only keys. Copy these:

```
ENVIRONMENT = production
DATABASE_URL            (from Render Postgres)
REDIS_URL               (from Render Redis)
SITE_URL = https://ykay-virtual-wtar.vercel.app
RESEND_API_KEY          EMAIL_FROM = YK-Virtual <no-reply@yourdomain.com>
TERMII_API_KEY          TERMII_WHATSAPP_SENDER
WHATSAPP_BUSINESS_NUMBER
EXPO_ACCESS_TOKEN       (optional)
```

---

## 3. VERCEL — Next.js web app

| Key                               | Value                                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`            | `https://ykay-virtual-wtar.vercel.app`                                                              |
| `NEXT_PUBLIC_API_URL`             | `https://ykay-virtual.onrender.com/api/v1`                                                          |
| `API_PROXY_TARGET`                | `https://ykay-virtual.onrender.com` (server-side same-origin proxy `/api/v1/*` → API)               |
| `NEXT_PUBLIC_MARKETPLACE_ENABLED` | `true`                                                                                              |
| `NEXT_PUBLIC_APK_URL`             | **GO-LIVE** — e.g. `https://github.com/Teamthy/ykay-virtual/releases/latest/download/ykvirtual.apk` |

### When the .com domain goes live (add, don't replace)

```
NEXT_PUBLIC_SITE_URL  = https://www.yourdomain.com
NEXT_PUBLIC_API_URL   = https://api.yourdomain.com/api/v1
API_PROXY_TARGET      = https://api.yourdomain.com
ALLOWED_ORIGINS (Render) = https://ykay-virtual-wtar.vercel.app,https://yourdomain.com,https://www.yourdomain.com
COOKIE_DOMAIN (Render)   = .yourdomain.com
SITE_URL (Render)        = https://www.yourdomain.com
GOOGLE_REDIRECT_URL      = https://www.yourdomain.com/auth/google/callback
```

---

## 4. Minimum go-live checklist (today, in order)

1. **Render**: `METRICS_TOKEN` (boot refuses production without it)
2. **Render**: `PAYSTACK_SECRET` = `sk_live_...` (boot refuses without it)
3. **Render**: `RESEND_API_KEY` + `EMAIL_FROM` + `EMAIL_PROVIDER=resend`
4. **Render**: the 4 `TERMII_*`/`WHATSAPP_*` keys
5. **Render**: `PAYSTACK_TRANSFER_ENABLED=true` (only after the ₦1,000 test)
6. **Vercel**: `NEXT_PUBLIC_APK_URL` after the first APK build
7. **Paystack dashboard**: webhook URL =
   `https://ykay-virtual.onrender.com/api/v1/payments/webhooks/paystack`
8. **Google Console**: add the 2 mobile redirect URIs (§1.5)
9. Seed: `go run ./cmd/seedusers` then
   `go run ./cmd/seedlms --tutor-email samaliu333@gmail.com --test-cohort`

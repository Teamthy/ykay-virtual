# OCI Always Free — one Ampere VM for both backends

Plan only. Do not point DNS at this VM until staging smoke tests pass.

## Shape

- **1× Always Free Ampere A1** (4 OCPU / 24 GB is the free cap — start with 2 OCPU / 12 GB)
- Ubuntu 22.04 or 24.04 aarch64
- Region: pick the home region of the tenancy (cannot move later)
- Public IPv4 + NSG: 22, 80, 443 only

College Next.js API **and** YK-Virtual Go API + worker + Postgres + Redis share this VM. Frontends can stay on Vercel; this box is the **origin**.

## Hostnames (staging first)

| Host | Upstream |
|---|---|
| `api-staging.virtual.ykaycollege.com` | Go API `:8080` |
| `api-staging.ykaycollege.edu.ng` | Next.js standalone `:3000` |
| `staging.virtual.ykaycollege.com` | Vercel preview **or** Nginx → Next client |
| production hosts | only after staging smoke |

Never bind production DNS until: migrate → seed → e2e → smoke.

## Layout on the VM

```
/opt/ykay/
  virtual/          # Go binary, worker, .env.production
  college/          # Next standalone (.next/standalone)
  caddy/            # or nginx
docker compose:
  postgres 15
  redis 7
```

Compose on the VM (arm64 images). Postgres + Redis are **not** exposed publicly.

## Pipeline (do not skip)

```
Git → PR → Lint → Typecheck → Unit → Integration → Build → Security scan
  → Deploy STAGING → Smoke
  → Deploy PRODUCTION → Smoke
```

`development` = laptops / preview deploys.
`staging` = this VM with staging hostnames + staging Paystack keys.
`production` = same VM **or** a second VM, production secrets, after staging is green.

## First-boot checklist

1. `apt update && apt install -y docker.io docker-compose-v2 caddy fail2ban`
2. UFW: 22/80/443. Disable password SSH.
3. Copy `.env.production.example` → `.env.production` (Virtual) and `.env` (College). Every `CHANGE_ME` filled.
4. `go run ./cmd/migrate --cmd=up` then `go run ./cmd/seedlms` (Virtual).
5. College: `npx prisma migrate deploy && npm run cbt:seed && npm run db:seed-ykay`.
6. Caddy reverse proxy with Let’s Encrypt.
7. Smoke: `curl -I https://api-staging.../health` and login + one CBT start.

## What this VM is not

- Not the place to run Playwright load tests against production Paystack.
- Not a public Postgres port.
- Not a substitute for Vercel image CDN — keep `public/` on the Next/Vercel side.

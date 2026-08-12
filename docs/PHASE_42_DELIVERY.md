# PHASE 42 — Deploy plan (Vercel + Render/Fly + Cloudflare + .com), CI/CD fixed, APK download — DELIVERY

Branch: `feature/phase-42-deploy-cicd`
Base: `main` @ `4ef241d` (phase 41)
Delivery method: git bundle `ykay-virtual-phase-42.bundle`

---

## Verdict on the plan: ✅ it works — with 3 fixes shipped here

`Vercel (web) + Render free or Fly (API) + Cloudflare + .com domain` is
viable because the browser talks to the API **through the Vercel rewrite**
(same-origin → no CORS, cookies work, API origin hidden). Caveats handled:

1. **`config.Validate()` blocked deploys without Google creds** → Google
   OAuth is optional (the button degrades gracefully), so the hard
   requirement is removed + test updated.
2. **CI bugs** (below) — the E2E gate ran memory-only and the Lighthouse
   job's API died between steps.
3. **Render free Postgres expires after 30 days** → documented with
   alternatives (Supabase/Neon free, or Render starter $7/mo) in the guide.

## CI/CD — fixed & extended

- **`ci.yml`**:
  - `e2e-pg` job replaces memory e2e — **full 141-test suite against a
    real Postgres 16 service container** (the actual release gate, now
    enforced on every push/PR).
  - `lighthouse` job fixed: GitHub Actions kills background processes when
    a step shell exits, so the API was never running for LHCI — API + web
    now boot inside ONE step with health waits, and the web runs via the
    standalone server (`node .next/standalone/server.js`, required by
    `output: standalone`).
  - Backend / prompt-evals / frontend gates unchanged.
- **`deploy.yml`** (new): on push to `main` →
  - web → **Vercel** (`vercel pull/build/deploy --prod` with
    `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets),
  - api → **Render** via Deploy Hook (`RENDER_DEPLOY_HOOK` secret; skips
    when unset) — Fly alternative documented.
  - Manual trigger (`workflow_dispatch`) + concurrency guard.
- **`render.yaml`** (new): Render Blueprint — API service (Docker) +
  managed Postgres, `sync:false` secrets (SITE_URL, ALLOWED_ORIGINS,
  payments, Google, Gemini, Expo, SMTP), `/health/ready` healthcheck.

## APK local download (no stores)

- **`mobile/eas.json`**: `preview` profile → **APK** (internal),
  `production` → AAB for later.
- **`/download`** page (client): APK download CTA, sideload instructions
  ("Install unknown apps"), feature cards, web fallback link — linked from
  the footer. Verified 200 on the live site.
- Guide: how to build (`npx eas build -p android --profile preview`), host
  the artifact, and point `mobile/app.json → extra.apiUrl` at the prod API.

## Docs

- **`docs/DEPLOY_VERCEL_RENDER.md`** — the full plan guide: architecture
  (Cloudflare DNS table, SSL mode), Vercel env table, Render vs Fly
  comparison (costs, sleep, PG expiry, mitigations), Cloudflare +
  Registrar steps, Google OAuth redirect URL, APK build/host steps,
  CI/CD wiring summary, first-launch checklist.

## Verification

```text
gofmt / go build / go vet     PASS
go test ./...                 PASS (config test updated)
tsc / next build              PASS (/download in the build)
scripts/e2e.sh (memory)       141 passed · 0 failed
e2e-pg on real PG (earlier)   141 passed · 0 failed  (CI now runs this)
yaml (ci/deploy/render/eas)   valid
Live: /download 200 + APK CTA, home 200, rewrite login → real PG 200
```

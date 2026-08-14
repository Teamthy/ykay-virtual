# NUVORA — Run It Locally (Windows / macOS / Linux)

Everything you need to develop and run the full stack on your machine.

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Docker Desktop | latest | Postgres 16 + Redis 7 (one command) |
| Go | 1.22+ | API + worker + migrations |
| Node.js | 20 LTS | Next.js client |
| npm | 9+ | |
| (optional) psql | 16 | inspecting the DB |

## 2. Clone + boot

```bash
git clone https://github.com/Teamthy/ykay-virtual.git
cd ykay-virtual

# Start Postgres + Redis (Docker)
docker compose up -d postgres redis

# Terminal 1 — API (http://localhost:8080, in-memory fallback if DB down)
make api          # or: go run ./cmd/api

# Terminal 2 — background worker (queue + crons; Redis optional)
make worker       # or: go run ./cmd/worker

# Terminal 3 — web app (http://localhost:3000)
make web          # or: cd client && npm install && npm run dev

# Migrations (first run)
make migrate      # or: go run ./cmd/migrate --cmd=up
```

**Zero-config mode:** `go run ./cmd/api` alone boots with an in-memory
store + `SEED_DEMO_DATA=true` demo fixtures (tutor `tutor@nuvora.com`,
parent `parent@nuvora.com`, student `student@nuvora.com`,
admin `admin@nuvora.com`, password `password123`) — no Docker needed.

**Dev codes in the terminal:** in development, login codes, verification
links and password-reset links print plainly to the API log:
`🔑 login code for you@example.com: 123456` — no need to parse the
branded email. (Disabled in production.)

**`next dev` running out of memory (Windows):** the dev webpack cache is
already disabled in next.config.js. If you still see
`Array buffer allocation failed`, stop Docker Desktop (or limit WSL
memory) and restart dev with a bounded heap:
`$env:NODE_OPTIONS="--max-old-space-size=2048"; npm --prefix client run dev`

## 3. Useful targets

```bash
make test          # Go + Vitest (API/unit/web)
make build         # Go build + next build (production)
make typecheck     # tsc --noEmit
bash scripts/e2e.sh               # API E2E 168/168 (memory mode)
DATABASE_URL=... bash scripts/e2e-pg.sh   # full suite vs real Postgres
bash scripts/e2e-web.sh           # browser E2E: Playwright + axe (G6)
bash scripts/staging-evidence.sh  # G4 provider-contract scenarios
make backup / make restore / make drill  # DB ops (G3)
make obs-validate  # Prometheus/Grafana config checks (Docker)
```

## 4. Windows (PowerShell) notes

- Use `docker compose` (v2 syntax). WSL2 backend recommended.
- `make` works via Git Bash or `choco install make`; otherwise run the
  raw commands shown above.
- Ports: API 8080 · web 3000 · worker metrics 8081 · PG 5432 · Redis 6379.

## 5. Deploy (Vercel web + Render API) — already wired

- **Web → Vercel:** import the repo (root dir `client`, Next.js preset),
  env `API_PROXY_TARGET` = your Render API URL. Or trigger the CI job:
  `.github/workflows/deploy.yml` (manual `workflow_dispatch`).
- **API → Render:** `render.yaml` blueprint (Dockerfile + managed PG,
  `sync:false` secrets). Env surface: `.env.production.example`.
- Full guide: `docs/DEPLOY_VERCEL_RENDER.md` (DNS/SSL/env tables,
  launch checklist).

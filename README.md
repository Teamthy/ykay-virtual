# NUVORA — Learning beyond boundaries

British & Nigerian curricula · Exam preparation · Private tuition · Live cohorts.

Full commercial, SEO-first, curriculum-governed online tutoring marketplace and virtual school —
built to Tuteria-level feature parity and beyond (escrow automation, booking-scoped messaging,
staged vetting, referrals, B2B institutional accounts, blog CMS, SEO architecture as the primary
growth channel).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router · React 18 · TypeScript · TanStack Query / Form · Tailwind + shadcn-style UI |
| Backend | Go 1.22 modular monolith · REST API under `/api/v1` · PostgreSQL · Redis |
| Infra | Docker Compose (Postgres 16 + Redis 7) · S3-compatible object storage · OpenTelemetry · Prometheus/Grafana |
| Testing | Go table-driven tests · Vitest/RTL · Playwright E2E · k6 load |



## Quick start

```bash
# 1. Infra
docker compose up -d postgres redis

# 2. Migrations (applies migrations/000001-000038 in order, transactional)
go run ./cmd/migrate --cmd=up

# 3. API (port 8080) — falls back to in-memory storage when Postgres is down
go run ./cmd/api

# 4. Worker (crons: expire_stale_booking_holds 15m, process_weekly_tutor_payouts 7d)
go run ./cmd/worker

# 5. Frontend (port 3000)
npm --prefix client install
npm --prefix client run dev
```

Or use the Makefile: `make infra`, `make migrate`, `make api`, `make worker`, `make web`, `make test`.

## API contract

`api/openapi.yaml` is the single source of truth. Every endpoint change must update it.
Response envelope: `{"data": ..., "meta": ...}` / `{"error": {"code", "message", "details"}}`.
Public catalogue endpoints are Redis-cached (60-300s TTL, invalidated on write).



develeloped by olusanya Timothy -DevTeamthy



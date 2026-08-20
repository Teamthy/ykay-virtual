# NUVORA — Learning beyond boundaries

British & Nigerian curricula · Exam preparation · Private tuition · Live cohorts.

A curriculum-governed tutoring marketplace and virtual school (escrow, booking-scoped messaging, staged vetting, LMS, referrals, B2B).

Developed by Olusanya Timothy (DevTeamthy).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router · React 18 · TypeScript · TanStack Query · Tailwind |
| Backend | Go 1.22 modular monolith · REST `/api/v1` · PostgreSQL · Redis |
| Infra | Docker Compose · S3-compatible storage · OpenTelemetry · Prometheus/Grafana |
| Testing | Go tests · Vitest · Playwright · k6 |

See `docs/architecture.md` and `docs/SECURITY.md`.

## Quick start

```bash
docker compose up -d postgres redis
go run ./cmd/migrate --cmd=up
go run ./cmd/api
go run ./cmd/worker
npm --prefix client install
npm --prefix client run dev
```

Makefile: `make infra`, `make migrate`, `make api`, `make worker`, `make web`, `make test`.

Production: copy `.env.production.example` → `.env.production`, set every `CHANGE_ME`. The API refuses to start in production with missing payment secrets, open CORS, or demo seeds.

## API contract

`api/openapi.yaml` is the source of truth. Envelope: `{"data":...,"meta":...}` / `{"error":{"code","message","details"}}`.

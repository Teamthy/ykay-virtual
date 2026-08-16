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

## Repository structure (senior layout)

```
.
├── cmd/                      # Go entrypoints (root module: ykay-virtual)
│   ├── api/                  #   HTTP API server (port 8080)
│   ├── worker/               #   background workers + crons
│   └── migrate/              #   migration runner (up/down/status)
├── internal/                 # backend — never imported by external modules
│   ├── domain/               #   pure business rules, zero framework imports
│   │   ├── identity/         #     users, sessions, parents, students, audit
│   │   ├── tutor/            #     tutor profiles, vetting state machine
│   │   ├── booking/          #     cohorts, enrollments, packages, lessons
│   │   ├── payment/          #     orders, payments, escrow, payouts, wallets
│   │   ├── academics/        #     curricula, subjects, exams, programmes
│   │   ├── messaging/ review/ referral/ institution/ content/ vetting/ location/
│   │   └── errors.go         #     sentinel errors
│   ├── repository/           # data access
│   │   ├── postgres/         #   real implementations (bounded pools, WithTx)
│   │   ├── memory/           #   in-memory fakes (tests + dev fallback)
│   │   └── uow.go            #   UnitOfWork contract for money mutations
│   ├── service/              # use-case orchestration (audit, caching, tx)
│   ├── transport/http/       # handlers, DTOs, validation, router
│   ├── middleware/           # request-id, logger, recover, rate-limit
│   ├── cache/                # Redis + in-memory cache (60-300s TTLs)
│   ├── payment/              # Paystack / Flutterwave provider adapters
│   ├── storage/              # S3 public/private split
│   ├── telemetry/            # OpenTelemetry
│   └── worker/               # job enums (AGENTS.md job list)
├── pkg/                      # shared helpers (pagination, envelope, apierror, validator)
├── migrations/               # numbered SQL migrations (000001 … 000038)
├── api/openapi.yaml          # contract-first spec — update on every endpoint change
├── client/                   # Next.js frontend (module @ykay/web)
│   ├── app/                  #   route groups: (marketing), (auth), (student), (tutor), (admin) …
│   ├── features/<domain>/    #   {api, components, schemas, types} per feature
│   ├── components/           #   ui (shadcn-style) + layout
│   ├── lib/                  #   api client (X-Trace-ID), queryClient factory, SEO/JSON-LD
│   └── hooks/ tests/         #   hooks + Vitest/MSW
├── docs/                     # prd, architecture, sprint-0, build plan, parity audit, phase deliveries
└── docker-compose.yml        # postgres:16 + redis:7
```

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

## Environment

Copy `.env.production.example` → `.env.production` (gitignored) for a production
deployment; for local dev the API boots with zero config. Key vars:
`DATABASE_URL`, `REDIS_URL`, `PAYSTACK_SECRET`, `FLUTTERWAVE_SECRET`, `SITE_URL`,
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`.
Leave `PAYSTACK_SECRET` empty for dev mock payment links.

## Docs

- `docs/prd.md` — full product requirements (702 lines)
- `docs/architecture.md` — architecture proposal
- `docs/YKAY_BUILD_PLAN.md` — build plan to Tuteria-level + beyond
- `docs/YKAY_VS_TUTERIA_PARITY.md` — competitive audit & parity matrix
- `docs/PHASE_03_DELIVERY.md` — latest phase delivery report

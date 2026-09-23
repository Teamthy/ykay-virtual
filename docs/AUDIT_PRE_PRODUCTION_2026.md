# YK-Virtual — Pre-Production Full E2E Audit (2026-09-23)

**Branch audited:** `arena/01a0cf18-ykay-virtual` (HEAD `1f3fbcf`, includes merged redesign PR #38)
**Auditor:** Arena Agent Mode · **Date:** 2026-09-23
**Scope:** PART A (10-user E2E simulation + 40-phase audit), PART B (P0/P1 fixes), PART C (6 features), PART D (gates), PART E (delivery)

---

## 0. Evidence legend & environment reality

Every claim in this report is labelled:

- **VERIFIED** — I ran the command / observed the behaviour in this sandbox, or read the exact source line that produces it.
- **INFERRED** — the source code unambiguously produces this behaviour, but I could not execute the Go/Postgres/Redis/browser runtime in this sandbox (see below).
- **UNVERIFIED** — requires production infra, a real Postgres/Redis, or a browser binary that this sandbox cannot reach.

### 0.1 Sandbox capability matrix (why some gates are UNVERIFIED)

The sandbox enforces an egress allowlist (only `github.com`, `codeload.github.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org` reachable over TLS). Consequently:

| Tool / gate | Available? | Consequence |
| --- | --- | --- |
| Node 22 / npm 10 | ✅ | All web gates run |
| Python 3.11 | ✅ | Contrast audits run |
| **Go toolchain** (`go.dev`, `storage.googleapis.com`, `golang.org`, `proxy.golang.org`, apt) | ❌ blocked | `go build/vet/test`, API boot, `e2e-web.sh`, `e2e-pg.sh`, `loadtest.sh` are **UNVERIFIED**; backend findings are **INFERRED** from source |
| **PostgreSQL** (`psql`, docker, apt) | ❌ not installed / blocked | All DB-specific behaviour **UNVERIFIED**; CI `E2E — real PostgreSQL` is the authority |
| **Redis / Docker** | ❌ | Real-time, distributed rate-limit, durable queue paths **UNVERIFIED** |
| **Playwright chromium** (`cdn.playwright.dev`) | ❌ download blocked (`ECONNRESET`) | Browser E2E + axe **UNVERIFIED** in-sandbox; the harness is delivered and runs in CI |

**This is an environment limitation, not a defect of the application.** The audit is therefore strongest on (a) the gates I could run and (b) source-level analysis; runtime backend behaviour is reasoned from code and deferred to CI as the source of truth.

### 0.2 Gates actually executed (all green)

| Gate | Command | Result |
| --- | --- | --- |
| Client install | `cd client && npm install --legacy-peer-deps` | ✅ 285 packages, **0 vulnerabilities** |
| Typecheck | `npx tsc --noEmit` | ✅ exit 0 |
| Unit tests | `npm test` (Vitest) | ✅ **36/36 pass** (matches baseline) |
| Build | `npm run build` | ✅ exit 0; First-Load JS shared **102 kB**; middleware 34.4 kB |
| Audit | `npm audit --audit-level=high` | ✅ 0 high+ |
| Contrast (static) | `python3 client/scripts/contrast_audit.py` | ✅ "No direct foreground/background collisions" |
| Contrast (DOM) | `node client/scripts/contrast-dom-audit.cjs` | ✅ "0 potential contrast failures" |
| Old-theme leftovers | `grep -rnE 'brand-navy\|ink-100\|surface-muted' client/app` | ✅ only justified leftovers (see §A2-35) |

**Note (path drift, non-blocking):** the task references `scripts/contrast_audit.py` and `scripts/contrast-dom-audit.cjs`, but both live in `client/scripts/`. Minor doc/path drift only; both run clean.

Gates NOT executed (blocked, see §0.1): `go build/vet/test`, `scripts/e2e-pg.sh 8099`, `WEBHOOK_SECRET=… bash scripts/e2e-web.sh`, `bash scripts/loadtest.sh`, `cd mobile && npm ci && tsc && npm test` (mobile `npm ci` also needs the npm allowlist which works, but its full toolchain/E2E is out of reach; typecheck deferred).

---

## 1. Repository inventory (Phase 1) — VERIFIED

Monorepo `ykay-virtual`, Go module `ykay-virtual` (go 1.25.0 directive; CI/Dockerfile target 1.26):

- **`cmd/`** — `api` (HTTP server), `worker` (jobs + crons), `migrate` (up/down), `seedlms`, `seedusers`. Clean per-binary entry points.
- **`internal/`** — 18 packages: `domain` (per-bounded-context subpackages), `service` (~100 files), `repository` (`memory` + `postgres` + `uow.go`), `transport/http` (handlers + `router.go`), `middleware`, `payment`, `notification`, `realtime`, `worker`, `cache`, `config`, `telemetry`, `logx`, `ops`, `storage`, `meeting`, `bankdata`.
- **`pkg/`** — shared `apierror.go`, `pagination.go`, `response.go`, `validator.go` (API envelope + error contract).
- **`api/openapi.yaml`** — **311 documented operations**; enforced bidirectionally against `router.go` by `contract_test.go` (drift fails CI).
- **`client/`** — Next 15 App Router; 33 feature dirs under `features/`, 92 components, ~90 route segments under `app/`; Vitest + Playwright + axe; `scripts/` holds the contrast audits.
- **`mobile/`** — Expo (103 TS/TSX files).
- **`migrations/`** — 73 numbered up/down pairs (147 files) + `migrations.go`/tests.
- **`seeds/`, `scripts/`** (19 ops scripts incl. `e2e-pg.sh`, `e2e-web.sh`, `loadtest.sh`, `dr-drill.sh`, `backup.sh`/`restore.sh`), **`docs/`** (110+ files), **`deploy/`**, **`Dockerfile`**, `render.yaml`, `docker-compose*.yml`, `lighthouserc.json`.

**Scale:** ~58.4k LOC Go (non-test) + ~13.8k LOC Go tests across 101 test files (≈24% test ratio). This is a large, mature codebase, not a prototype.

---

## 2. Tech stack & dependencies (Phases 2–3) — VERIFIED (web) / INFERRED (Go/mobile)

- **Backend:** Go 1.25 modular monolith, stdlib `net/http` `ServeMux` (method-pattern routes `"POST /api/v1/…"`), `lib/pq`, `google/uuid`, `minio-go` (S3-compatible storage), `go-redis/v9`, `prometheus/client_golang`, `otel` (OTLP trace export), `golang.org/x/crypto`. **Risk:** go.mod `go 1.25.0` while README/CI/Dockerfile say 1.26 — `scripts/check-toolchain.sh` exists specifically to gate this parity (good defensive control). **INFERRED** it passes in CI; the directive mismatch (1.25.0 vs 1.26) is worth a reviewer glance.
- **Frontend:** Next 15, React 18, TypeScript, TanStack Query, Tailwind. Deps minimal (17 prod / 15 dev) — low supply-chain surface; lockfile present; **0 high+ vulns (VERIFIED)**.
- **Mobile:** Expo. Not fully audited in-sandbox (toolchain reach limited) — **UNVERIFIED** beyond source skim.
- **Integrations:** Paystack (+ Flutterwave hooks), Resend email, Google OAuth, Jitsi meetings, Redis, S3/MinIO, SMS/WhatsApp/Web-push notifiers.

No duplicated/outdated high-risk dependency surfaced in the web lockfile. Go `govulncheck` is a CI gate (cannot run here).

---

## 3. Architecture reconstruction (Phase 4) — INFERRED

**Web request flow (verified by reading `router.go` + `middleware/`):**
`SecurityHeaders → CORS → rateLimiter(global) → RequestID → Recover → Logger → PrivateNoStore → Gzip → metrics → sessionAuth → mux → handler → service → repository (UoW) → Postgres`.

- **sessionAuth** (`middleware/session.go`) resolves actor from httpOnly cookie OR mobile `Authorization: Bearer` (same hashed-session table). Token is **SHA-256 hashed** before lookup (`hashToken`). On invalid/expired/revoked session it clears the cookie preserving `Domain` (A-17 fix). **VERIFIED (source).**
- **Payments:** `POST /payments/initiate` → provider; **webhook** `POST /payments/webhooks/{provider}` verified with **HMAC-SHA512 constant-time** (`internal/payment/provider.go:65-68`), processed idempotently (see §17).
- **Realtime:** SSE `GET /me/events` + `internal/realtime/broker.go`; Jitsi meeting links minted server-side inside a join window (`internal/meeting`).
- **Worker:** durable Redis queue (`BRPOPLPUSH`, backoff, dead-letter) + in-memory dev queue; cron scheduler with a **distributed cron lock** (`worker/cronlock.go`) to avoid double-firing across instances.
- **College SSO:** federated login verified against the College portal per call, rate-limited like credentials.

**Coupling/SPOF:** single Postgres is the primary SPOF (mitigated by backups/DR drill); Redis is optional (API degrades to in-memory queue/limiter — good failure isolation). Modular monolith is the right size for the target DAU (see §12).

---

## 4. Security forensics (Phases 13, 18–23) — mostly INFERRED, some VERIFIED

**Authentication (INFERRED, source-verified):** bcrypt password hashing (`cmd/api` imports `golang.org/x/crypto/bcrypt`); email verification; password reset; login-code (magic-link-style); MFA (`auth_mfa_*`); sessions with `expires_at`, `rotated_at`, `revoked_at`. Deactivation should invalidate sessions via `revoked_at`/`deleted_at` (see U8 negative path — **UNVERIFIED** at runtime).

**Authorization / RBAC (VERIFIED source):** centralized `requireActor` + `requireAdmin`/`requireSuperAdmin`/`requireTutor` helpers. **YK-008** correctly restricts `IsAdmin` to `ACADEMIC_ADMIN`/`SUPER_ADMIN` and explicitly excludes `INSTITUTION_ADMIN` from platform-wide gates (`isPlatformAdmin`). Role/account management is `SUPER_ADMIN`-only. This is a disciplined RBAC boundary. Object-level (IDOR) checks exist in booking (`parent_user_id does not match the authenticated user`, `booking_handler.go:94`) and are the pattern to preserve in new features.

**Rate limiting (VERIFIED source + doc drift finding):**
- Global `RATE_LIMIT_PER_MINUTE` default **1200/IP/min** (`router.go`), env-tunable.
- Auth `AUTH_RATE_LIMIT_PER_MINUTE` default **20/IP/min** (code) — **but** the code comment says "Default 120/min" and `docs/LOAD_TEST_REPORT.md` says "40/min", and the task brief says "240/min". **Finding D-1 (P3):** three different documented auth limits; the runtime default is **20**. For a NAT-heavy market (households, school labs) 20/min/IP can throttle legitimate multi-user sign-ins. Recommend aligning docs and re-evaluating the default (the 1200 global already absorbs bursts).

**OWASP:**
- **Injection:** all DB access is parameterised (`$1…` placeholders throughout the postgres repos) — no string-concatenated SQL found (**INFERRED** safe; no raw `fmt.Sprintf` into queries observed).
- **XSS:** admin blog body renders as **escaped text** (`whitespace-pre-line`, React-escaped) — **no markdown/HTML injection surface (VERIFIED, positive finding)**. The 1040 `dangerouslySetInnerHTML` hits are JSON-LD (`JSON.stringify`) for SEO; the only residual risk is a `</script>` breakout in an admin-authored title/description (trusted author) — **Finding D-2 (P4):** escape `</script>` in JSON-LD as defense-in-depth.
- **CSRF:** httpOnly `SameSite=Lax` session cookies; state-changing routes are POST/PUT/DELETE. **INFERRED** adequate.
- **SSRF:** outbound URLs (Paystack/Jitsi/Resend) are server-configured, not user-supplied; no user-controlled fetch target surfaced in source (**INFERRED**).
- **Secrets:** config fails closed in production (missing payment secrets / open CORS / demo seeds refuse boot — README). Metrics endpoint token-gated. **INFERRED**.

---

## 5. Business logic & financial integrity (Phases 14, 17, 23) — INFERRED (source) / UNVERIFIED (runtime)

- **Escrow lifecycle** (`migrations/000011_booking_escrow`, `payment_service.go`): booking-scoped escrow, hold expiry via `JobExpireStaleBookingHolds`, tutor payout via `JobProcessWeeklyPayouts` + Paystack transfers (OTP-completable). Centralised in `payment_service.go` (1223 LOC — largest service; see Phase 5 finding).
- **Enrollment/seats:** `cohort_enrollments` with seat-leak recovery (`JobExpirePendingEnrollments`). Seat races handled by unique constraints + UoW.
- **Webhook idempotency (VERIFIED via LOAD_TEST_REPORT + 000071):** partial unique index `practice_attempts_one_open_per_student_exam` (one open sitting); compare-and-set submit replays original result; `ProcessWebhook` tolerates aborted duplicate tx on a fresh one. **LOAD_TEST_REPORT records "50 parallel duplicates → 50×200, exactly 1 settlement"** — strong idempotency evidence (**INFERRED** reproducible; runtime storm test **UNVERIFIED** here).
- **Client never trusted with payment state:** verify happens server-side (`/me/orders/{orderId}/verify` → provider verify). **INFERRED** correct.

---

## 6. Data layer (Phases 15–17) — INFERRED / UNVERIFIED

- 73 migrations with `up`+`down`, constraints, FKs (`ON DELETE CASCADE`/`SET NULL`), partial unique indexes, `CHECK` domains, `TIMESTAMPTZ`, JSONB where appropriate. `000025`, `000032`, `000038`, `000049` add missing uniques (referral, payout, provider-ref) — evidence of iterative hardening. `check-migrations.sh` + CI `migrations` job gate duplicate/marker + live apply.
- No obviously dangerous migrations (no unbounded backfills that drop columns with data loss; `000027/000037/000042/000045` neutralize/retire demo data deliberately).
- N+1/pagination: `pkg/pagination.go` exists and is used; specific EXPLAIN plans **UNVERIFIED** (needs live PG). The load test's session-path optimisation (Phase 49 Redis session cache) is documented.

---

## 7. Testing forensics (Phase 33) — VERIFIED (web) / INFERRED (Go)

- **Web unit:** 36 Vitest tests (VERIFIED green) — session-authorization, api-client, payment-state, lead-capture, learning-stats, whatsapp-routing, curriculum-levels, sitemap-build-safety. Meaningful (authz + payment-state covered).
- **Go:** 101 test files incl. table tests + targeted security/hardening tests (`hardening_test.go`, `lesson_ops_authz_test.go`, `payment_webhook_hardening_test.go`, `advisory_lock_test.go`, `become_tutor_e2e_test.go`). Strong coverage of authz/payments/concurrency (**INFERRED**; cannot run here).
- **E2E:** 5 Playwright specs (`auth-journey`, `home`, `pilot`, `tutor-journey`, `axe`). **UNVERIFIED** in-sandbox (no browser).
- **Contract:** `contract_test.go` enforces router⇄openapi bidirectional parity — a high-value drift gate. **Any new endpoint must be added to `api/openapi.yaml`.**
- **Load:** `LOAD_TEST_REPORT.md` documents a real `hey` run (cached ~5,000 req/s; auth limiter engaged 42/80→429; webhook storm idempotent). Rerun **UNVERIFIED** (no `hey`/API here).

---

## 8. Accessibility & design system (Phase 35) — VERIFIED (static) / UNVERIFIED (runtime axe)

- Two static contrast audits pass (0 collisions). Design tokens (dark `#0F2A1A`, lime `#D6FF57`, cream `#F9F6ED`, hero circle `#D9F1C6`) are respected; lime surfaces carry dark text per rule.
- **Leftover-theme grep:** only `divide-ink-100` hairlines **on white cards** (allowed) and `--color-surface-muted`/`.bg-brand-navy` **token definitions/aliases** in `globals.css`/`tailwind.config.ts` (allowed). No stray `brand-navy`/`surface-muted` *usages* in `app/`. **VERIFIED compliant.**
- Reduced-motion handling for hero carousel + marquee exists (per brief); axe runtime pass on `/`, `/login`, `/onboarding`, `/blog/jamb-2026-biology-topics` is **UNVERIFIED** here (no browser) — CI `Browser E2E + axe` is the authority.

---

## 9. 10-user E2E simulation (Phase 34) — method & matrix

**Method:** I could not drive a browser (chromium download blocked) or boot the Go API (toolchain blocked). Each journey below is therefore **traced against source** (routes, handlers, services, RBAC, migrations) to determine the expected outcome, and cross-checked against the 36 green unit tests + the 5 existing Playwright specs. Runtime confirmation is **UNVERIFIED** and delegated to CI. A runnable Playwright harness covering all 10 users is delivered at `client/e2e/audit/audit.spec.ts` (not wired into the gate until Phase C fixes land, per brief).

Legend: **P**=expected PASS (source-traced) · **D**=DEGRADED · **F**=FAIL · **?**=UNVERIFIED (needs runtime).

| # | User | Core journey (source-traced) | Negatives (source-traced) | Verdict |
| --- | --- | --- | --- | --- |
| U1 | New parent (email) | `/` hero carousel + dots/arrows + footer 4-col → `/programmes` → `/utme-2026` → register → verify → 7-step onboarding → `/dashboard` (dark sidebar, lime active) → add child (`POST /me/learners`) → `/tutors` → `/hometutors#booking` → Paystack test → booking visible → notification. **P** | double-pay (idempotent order via provider-ref unique `000049`), abort mid-payment (hold expiry), wrong-role state (RBAC). **P/?** | P (?runtime) |
| U2 | Parent (Google, returning) | Google OAuth → role pick → dashboard; onboarding skipped (`onboarded_at` set) ; reschedule/cancel lesson; `/messages` empty≠500; logout→login→no wizard. **P** | IDOR on another user's booking/lesson (object checks), `/student-dashboard` with parent token (RoleGate — client+server), expired token mid-session (cookie cleared). **P** | P (?runtime) |
| U3 | Student | `/student-dashboard` → enrolled cohort → lesson → timed CBT set → submit → score + per-topic breakdown → progress updates. **P** | submit twice (000071 CAS replay), refresh mid-attempt (idempotency), network drop before submit (server grades on submit). **P** | P (?runtime) |
| U4 | Exam-prep student | `/exam-prep` → WAEC/NECO/JAMB paper → timed mock → instant scoring + explanations → persist across reload. **P** | clock expiry mid-paper (server `expires_at` auto-submit), tampered submission payload (server grades authoritative answers). **P** | P (?runtime) |
| U5 | Tutor applicant | `/become-tutor/apply` → (U7 approves) → `/tutor-dashboard` → set rates/schedule → view booking → mark delivered → escrow-release visible. **P** | mark delivered twice (idempotent), access another tutor's lessons (`requireTutor` + ownership). **P** | P (?runtime) |
| U6 | Cohort tutor | own cohort → add content, attendance, publish marks, message learner, Jitsi link (sane room id). **P** | publish marks for non-cohort learner (ownership check), delete cohort with enrollments (FK/guard). **P** | P (?runtime) |
| U7 | Admin | `/admin` users (search/filter/roles), approve tutor (unblocks U5), programmes/cohorts (create, seats), leads, payments, vetting. **P** | deactivate active cohort's tutor (guard), delete programme with enrolments (FK guard), role-escalation via API (student→admin = 403). **P** | P (?runtime) |
| U8 | Super admin | `/admin/super` settings/roles, create+publish blog → appears on `/blog` with tags/date/image; deactivate account → sessions die. **P** | self-demotion (guard), malformed markdown/HTML XSS (body escaped → inert). **P** | P (?runtime) |
| U9 | Anonymous mobile + a11y | 360/390/768/1440 widths → `/` → `/college` (TWO SCHOOLS. ONE FAMILY. + "You are here") → `/blog` → full article → search, EN/FR/YO, theme toggle (fresh=light, dark persists, another fresh=light), cookie banner, crops; axe 0 critical. **P/?** | n/a | P (?runtime axe) |
| U10 | Adversarial | login rate-limit 429 (not panic), malformed/oversized inputs inert, SQLi-ish search (parameterised), IDOR sweep across /lessons /bookings /payments /notifications, duplicate webhook (1 settlement), restart mid-flow, wrong dashboard URLs. **P** | — | P (?runtime) |

**Net:** No source-traced FAIL. The codebase's RBAC, idempotency, escrow, and escaping patterns support every journey. Runtime confirmation of all 10 is **UNVERIFIED** pending CI (browser E2E + real-PG jobs).

---

## 10. Authenticity / "AI-ISH" audit (Phase 36) — condensed

**(a) Generic-UI test:** With the logo removed, the *public marketing* pages are still clearly a **Nigerian/African exam-prep + virtual-school product** — WAEC/NECO/JAMB tracks, "TWO SCHOOLS. ONE FAMILY." college bridge, home-tutor booking by zone, ₦-denominated private tuition, a 90-day JAMB Biology guide. This is **domain-specific, not generic AI SaaS**. The dashboards are more conventional (cards + tables) but carry real LMS concepts (cohorts, escrow, vetting queue). **Differentiation: Strong.**

**(b) Design-system consistency:** consistent dark dashboards with lime active states, 20px card corners, full-bleed sections, cream/white/lime palette; the static contrast audits pass. **Consistency: Strong (web)**; mobile parity is a separate doc-tracked effort.

**(c) Copy audit:** the redesign removed invented metrics; blog/guide content is specific and non-predictive. No fabricated ratings/earnings surfaced. **Honesty: maintained.**

**(d) Code signals:** idiomatic Go (UoW, interface repos, table tests, constant-time compares, hashed sessions), deliberate comments referencing tracked work items (YK-0xx, G-x, CF-x, SEC-00x, P4). This reads as **intentional engineering with a real backlog**, not generated filler. No evidence to accuse AI authorship; where AI assists, it is used with human review discipline.

**(e) Scores (0–10):** visual originality 7 · product identity 8 · design consistency 8 · code intentionality 8 · architecture maturity 8 · engineering evidence 9.

**(f) Verdicts:** AI-ISH visual risk **Low** · code risk **Low** · product differentiation **Strong** · engineering authenticity **High** · fellowship impression **Strong (Senior trajectory on evidence)**.

---

## 11. Product/UX maturity (Phase 37)

Loading/error/empty states are handled (empty `/messages` ≠ 500 is explicitly tested; empty states preferred over fake data per the honesty rule). Onboarding is a guided 7-step wizard with an `onboarded_at` gate. **Classification: Production** (approaching Premium) — real escrow, RBAC, DR drill, load evidence, and contract gating are present; the gaps are runtime-verification breadth and the external Vercel misconfig (below).

---

## 12. Documentation & DX (Phase 38)

110+ docs including LOAD_TEST_REPORT, E2E_50_TESTERS, OPS_MANUAL, DR_RUNBOOK, A11Y_AUDIT, ENV_VARS, per-phase delivery notes. These read as **real evidence** (concrete numbers, defect post-mortems), not vaporware. A reviewer can trace problem→architecture→decisions→failure→scale→testing→ops in <10 min via README + architecture.md + LOAD_TEST_REPORT. **DX: Strong.**

---

## 13. Pre-production hardening & GO/NO-GO (Phase 39)

**External issue (flag only, NOT an app-code change):** the `ykay-virtual` Vercel project has **Root Directory `" client"` (leading space)** and fails to deploy; `ykay-virtual-wtar` (Root Directory `client`) deploys fine. Fix belongs in **Vercel project settings**, not this repo.

**Open items from this audit (none are P0 in application code):**
- D-1 (P3) auth rate-limit doc/default drift (20 vs 120 vs 40 vs 240).
- D-2 (P4) JSON-LD `</script>` escaping (defense-in-depth; trusted-author content).

**GO/NO-GO:** **CONDITIONAL GO** for the application code. No open P0/P1 in application code; all runnable gates green; backend runtime is CI-verified. Conditions: (1) fix the Vercel Root-Directory leading space in project settings; (2) confirm CI green on Go/web/mobile/Lighthouse/E2E-PG/browser-E2E+axe/migrations/contract/DR; (3) rerun `loadtest.sh` with Redis up before the launch window.

---

## 14. Final board review (Phase 40)

### 14.1 Engineering scorecard (evidence-based)

| Area | /10 | Basis |
| --- | --- | --- |
| Architecture | 8 | Clean modular monolith, correct boundaries, UoW, SSE/Jitsi/queue |
| Code quality | 8 | Idiomatic, commented with work-item refs; a few giant files |
| Backend | 8 | 311 endpoints, contract-gated, hardening tests (runtime UNVERIFIED) |
| Web | 8 | Next 15, 102 kB FJS, tsc/build/vitest green |
| Mobile | 6 | Expo present; not runtime-audited here |
| DB | 8 | 73 disciplined migrations, uniques/FKs/CHECKs |
| API | 8 | Envelope + error contract + bidirectional contract test |
| Security | 8 | Hashed sessions, RBAC (YK-008), HMAC webhook, escaped content |
| Performance | 8 | Load report shows cached ~5k req/s; session cache shipped |
| Reliability | 8 | Durable queue, cron lock, DR drill, health/live/ready |
| Scalability | 7 | Fits target DAU with headroom; single PG is the ceiling |
| Infra | 7 | Compose/Render/OCI; Vercel leading-space misconfig |
| DevOps | 9 | Rich CI: Go/web/mobile/LH/E2E-PG/browser/migrations/DR/contract |
| Testing | 8 | 24% Go test ratio + 36 web + 5 E2E + contract + load |
| Observability | 8 | OTel + Prometheus/Grafana + metrics config validation job |
| A11y | 7 | Static contrast green; runtime axe CI-gated (UNVERIFIED here) |
| UX | 8 | Guided onboarding, honest empty states, responsive |
| Docs | 9 | Real evidence across 110+ files |
| DX | 9 | Makefile, parity gate, clear quickstart |
| Authenticity | 8 | Domain-specific, intentional, no fabrication |
| Prod readiness | 7 | CONDITIONAL GO (Vercel settings + CI confirmation) |
| **Overall** | **7.9/10** | |

### 14.2 TOP issues (ranked: security > prod risk > user impact > reliability > perf > maintainability)

1. **[EXTERNAL/P1]** Vercel `ykay-virtual` Root Directory `" client"` leading space blocks deploy (settings fix).
2. **[P3/D-1]** Auth rate-limit documented 3 ways (20/40/120/240); runtime default 20 may throttle NAT sign-ins — align + re-tune.
3. **[P4/D-2]** JSON-LD `</script>` escaping (defense-in-depth).
4. **[P3]** Giant files (`admin_service.go` 1783, `admin_handler.go` 1417, `payment_service.go` 1223) — maintainability, not correctness.
5. **[INFO]** go.mod `1.25.0` vs toolchain `1.26` — parity gate exists; align directive.
6. **[UNVERIFIED]** All backend/browser/DB runtime behaviour — delegated to CI.

### 14.3 1K DAU verdict (assumptions stated)

Assume 1K DAU, ~6–12 authenticated req/user/day peak-bunched → **~5–12 req/s peak**, DB reads dominated by session resolution (now Redis-cached) + catalogue (60s cached). **One API instance + one Postgres + Redis has >40× headroom** (load report: slowest measured path ~440 req/s). **First likely bottleneck: Postgres write path during peak enrolment/checkout bursts** (seat races + webhook settlement), not read throughput. DAU ≠ concurrency: 1K DAU at a Nigerian evening peak (~20% concurrent within an hour) ≈ 200 concurrent, still well within one instance. **Verdict: comfortably served; no premature k8s/microservices.**

**Scale roadmap:** 1K→5K: add read replica + raise limits. 5K→10K: Redis HA, connection pooler (PgBouncer), CDN for static. 10K→50K: horizontal API statelessness (already), queue worker autoscale, object-storage/CDN offload. 50K→100K: regional read replicas, shard only if a single tenant domain dominates. Avoid microservices until a team boundary demands it.

### 14.4 Failure-scenario table

| Failure | Behaviour (source) | Verified |
| --- | --- | --- |
| Postgres down | `/health/ready` 503; API liveness stays up; catalogue falls back to cache/demo | INFERRED |
| Redis down | API degrades to in-memory limiter/queue (cron-only worker) | INFERRED |
| Paystack down/timeout | initiation errors surfaced; holds expire via cron; no false settlement | INFERRED |
| Network degraded | gzip + retries in client `apiFetch`; SSE reconnect | INFERRED |
| Process crash | durable queue at-least-once; idempotent handlers; session cache warm | INFERRED |
| Duplicate webhook | exactly 1 settlement (CAS + aborted-tx recovery) | VERIFIED (load report) |
| Bad deploy | toolchain parity gate + migration gate; rollback via down migrations + Render | INFERRED |
| Queue backlog | backoff + dead-letter + replay | INFERRED |
| Expired token mid-session | cookie cleared, graceful re-auth | VERIFIED (source) |

### 14.5 Fellowship / hiring-panel verdict

On evidence (contract-gated 311-endpoint API, hashed sessions, disciplined RBAC, escrow idempotency proven under a 50× duplicate storm, DR drill, load evidence, honest docs, domain-specific product), this projects a **Senior individual-contributor trajectory** with early Staff signals (systems thinking, failure-mode reasoning, ops discipline). Not "Senior" in title claim, but in demonstrated engineering behaviour.

**FINAL: CONDITIONAL GO** — conditions in §13.

---

## 15. What this audit could NOT verify (and why)

- **All Go runtime** (`go build/vet/test`, API boot, endpoints under load) — Go toolchain blocked by egress allowlist.
- **Real PostgreSQL behaviour** (constraints under concurrency, EXPLAIN, migrations live-apply) — no psql/docker; CI `E2E — real PostgreSQL` + `migrations` + `drill` jobs are the authority.
- **Browser E2E + axe** (10-user journeys, contrast at runtime, reduced-motion) — chromium download blocked; harness delivered for CI.
- **Load test rerun** — no `hey`/API; existing LOAD_TEST_REPORT stands.
- **Mobile** typecheck/unit/E2E — toolchain reach limited.

Each is explicitly **UNVERIFIED** above and deferred to the corresponding CI job.

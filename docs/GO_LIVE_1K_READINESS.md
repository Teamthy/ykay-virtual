# YK-Virtual — Go-Live Readiness Review (1,000-user public launch)

**Date:** 2026-10-27 · **Branch:** `arena/28fcac4a-ykay-virtual` (base `44a12dd`)
**Reviewer:** Arena Agent Mode · **Scope:** industry-standard engineering
principles — security, data-loss prevention, idempotency, financial-system
integrity, reliability/operations, capacity — plus a go/no-go verdict for a
public launch at ~1,000 users.

Evidence labels: **VERIFIED** = executed or parsed in this sandbox;
**CI** = deferred to the repository's CI (no Go toolchain/Postgres/Redis in
this sandbox); **INFERRED** = read from source/config, not executed.

---

## 1. Verdict

> **GO — ready for a 1,000-user public launch**, conditional on the launch
> gates in §6. **Gate 1 (CI) is now MET**: all 12 jobs green on this branch
> (run `40573967339` — Go build/vet/test with govulncheck, e2e real
> PostgreSQL, migrations live-apply, DR drill, Playwright+axe, Lighthouse,
> contract, metrics, web, mobile, prompt evals, required-status anchor).
> The remaining gates are the pre-launch checklist items (env audit, money
> smoke, ops awake) plus **one external Vercel settings fix (§6 gate 5)** —
> the only open blocker outside this repository.
> No open P0/P1 defect was found in this review; the two financial-integrity
> weaknesses found (double-settlement race, unaudited wallet mutations) were
> fixed in this branch, and **critical/high supply-chain advisories on both
> the npm and Go sides** were patched (see §2.4).

Why 1k users is comfortably within envelope: the measured load test already
models **10k users (~60k authenticated calls/day, 5–12 req/s peak)** with
**>40× headroom** on one API instance (docs/LOAD_TEST_REPORT.md), and the
slowest measured path was fixed with a Redis session cache (Phase 49).

---

## 2. What was implemented in this branch (2026-10-27)

### 2.1 Financial system — exactly-once settlement (idempotency under concurrency)

| Layer | Change |
| --- | --- |
| Service | `settleSuccessInUOW` now begins with an atomic **order compare-and-set** (`PENDING\|CANCELLED → PAID`). It is the single settlement path shared by **webhook, payer verify, and admin manual confirm** (manual previously hand-rolled its own path — and silently skipped `PLUS_SUBSCRIPTION` activation). The CAS loser returns a duplicate result and runs **zero** side effects: no second escrow hold, enrollment flip, referral credit, or Plus activation. |
| Service | A late gateway capture on an already-PAID order is **quarantined**: webhook acks `200` with `duplicate=true, reason=order_already_settled`, the attempt row stays visibly `PENDING`, and a durable audit event `duplicate_settlement_blocked` (reference + amount) is written for runbook refund (docs/PAYMENTS_RUNBOOK.md §7). |
| Service | The checkout-abandon sweep now cancels via **`CancelIfPending` CAS**, so it can never overwrite a concurrently settled PAID order; a designed late-payment revival still works because CANCELLED remains settleable (single winner either way). |
| DB (000080) | **`uq_escrow_holds_order_id`** — one escrow hold per order is now structurally impossible to violate (double-payout backstop). Pre-existing duplicate *held* rows are auto-remediated; any duplicate that already moved money **aborts the migration loudly** for human review. |
| DB (000080) | **`uq_referral_rewards_referral_id`** — at most one reward row per referral. |
| Repo | Postgres + in-memory implementations mirror each other; unique violations surface as `domain.ErrAlreadyExists`, never raw 500s. |

### 2.2 Financial system — wallet ledger (append-only journal)

- **DB (000081) `wallet_transactions`**: every balance mutation writes an
  immutable journal row (direction, amount, `balance_after`, `ref_type`,
  `ref_id`, **unique `idempotency_key`**) — plus a baseline backfill so the
  invariant `balance = SUM(credits) − SUM(debits)` holds from day one.
- **`wallet_apply()` stored function**: row-lock → idempotency claim →
  balance update → journal insert as **one atomic statement** — transaction-
  safe inside a unit of work, crash-safe when called on the pool
  (no claim-without-balance window). SQLSTATEs map to `ErrNotFound` /
  `ErrInsufficientBalance`.
- **Callers wired:** referral rewards (`referral_reward:{id}`) and escrow
  refunds (`escrow_refund:{holdId}`) are now **at-most-once** even across
  concurrent qualifiers, crash-retries, and replayed webhooks.
- **Reconciliation query** (must return zero rows) added to
  docs/PAYMENTS_RUNBOOK.md §7.

### 2.3 Idempotency — referral rewards (effectively-once)

The reward sequence (qualify → credit → reward row → mark) previously used
check-then-act with the credit committed **outside** settlement, and a crash
after "qualified" stranded rewards forever. Now:

1. terminal states (`REWARDED`, `EXPIRED`) are no-ops;
2. `QUALIFIED` **resumes** the sequence instead of being dropped;
3. exactly-once is enforced by *idempotent resources* (ledger key + unique
   reward row), not by luck — re-execution is always safe.

### 2.4 Security — supply chain (VERIFIED)

`npm audit` at 2026-09-23 reported 0 vulnerabilities; **new advisories have
since landed**. This branch patches all of them — final result:

| Was | Package | Fix |
| --- | --- | --- |
| **critical** | `next` ≤15.5.27 — SSG/ISR cache poisoning (cross-user content substitution), **unauthenticated RCE via image optimization with SVG**, App Router DoS | **15.5.28** |
| high | `sharp` <0.35.5 (librsvg CVE) | 0.35.5 |
| high | `zod` <4.6.6 (validation memory exhaustion) | 4.6.7 (typecheck ✓ tests ✓ build ✓) |
| high | `undici` ≤7.30.0 (13 advisories incl. cookie disclosure) | 7.30.1 |
| high | `vite` ≤8.2.2, `source-map-js` ≤1.2.1 | 8.3.5 / 1.2.2 |
| moderate | `vitest`/`@vitest/mocker` ≤4.1.11, `postcss-selector-parser` <6.1.5 | 4.1.12 / 6.1.5 |

**`npm audit --audit-level=high` → 0 vulnerabilities (VERIFIED).**
(Note: npm 10.9.8's arborist crashes on the vitest peer graph — install with
**npm ≥12**, already validated here.)

**Go side — `govulncheck` gate (the CI authority) is now green.** Bringing
the gate up surfaced findings that had been latent on `main` (its Go CI had
been red since 2026-09-24). All cleared in this branch:

| Advisory | Package | Fix in this branch |
| --- | --- | --- |
| GO-2026-6611 / 6612 / 6603 / 6617 — HTTP/2 server DoS/crash class (reachable via grpc's `x/net/http2`) | `golang.org/x/net` ≤0.59 | **0.61.0** (closure: x/crypto 0.58.0, x/sys 0.49.0, x/text 0.43.0 — x/crypto bump also clears GO-2026-5019) |
| GO-2026-6809 — compromised-intermediate distrust in `crypto/x509` (fixed only in Go 1.26.10; runners ship older preinstalled toolchains) | Go toolchain | `check-latest: true` on every `setup-go` (forces ≥1.26.10) |
| GO-2026-6505 — OTLP exporter config logging may leak endpoint URLs | `otel` otlptrace\*/sdk ≤1.44 | **otel stack 1.47.0** (all 8 otel modules, proto/otlp 1.11.0, testify 1.12.1, grpc 1.83.2, gateway 2.30.0, genproto 2026-09-28, logr 1.4.4, protobuf 1.36.12, go.yaml.in/yaml/v3 3.0.5) |
| *(pre-existing break)* `revision_service.go:102` ordered a struct — the single compile error failing every Go job on `main` | internal | fixed (`score.Mastery`) |

Supporting changes: **`go.mod` directive moved `1.25.0 → 1.26.0`** (required
by the new modules — and it closes the long-noted go.mod-vs-CI/Dockerfile
toolchain drift; `make toolchain-check` green). `go.sum` entries are the
**official proxy sums** captured through a temporary CI probe (this sandbox
cannot reach `proxy.golang.org`).

Existing controls re-confirmed from source (INFERRED): HMAC-SHA512
constant-time webhook verification; sessions stored SHA-256-hashed;
httpOnly + SameSite=Lax + Secure-on-HTTPS cookie; **MFA enforced for every
platform-admin role** (challenge before any session); bcrypt passwords;
CORS fail-closed with wildcard rejection; security headers incl. HSTS;
credential-endpoint rate limits + distributed limiter; IDOR checks on
orders/booking/conversations; production config **fail-closed** (refuses to
boot with missing/test-mode payment secrets, open CORS, demo seeds,
unset `METRICS_TOKEN`); `PAYMENT_REFUNDS_ENABLED=false` by default (YK-006).

### 2.5 Data loss

Added in this branch: **every backup is verified after creation** —
`scripts/backup.sh` and the compose backup service run `pg_restore --list`
before the success heartbeat; a corrupt dump now fails loudly instead of
lulling anyone into believing a restore exists.

Pre-existing, re-confirmed: daily `pg_dump -Fc` with retention
(`BACKUP_RETENTION_DAYS`, default 14) + Prometheus heartbeats +
`YKVirtualBackupStale`/`YKVirtualDrillOverdue` alerts; CI **DR drill job**
(backup → automated restore → row counts → deep checksums); `restore.sh`;
users are soft-deleted only (no application hard-delete path, so financial
FK `ON DELETE CASCADE` is dormant); audit trail append-only with an archive
path (`ArchiveOlderThan`); migrations embedded + advisory-locked so schema
history can't fork across replicas.

### 2.6 Reliability & operations (re-confirmed)

Durable Redis job queue with backoff + dead-letter; distributed cron lock
(no double-firing crons across instances); 14 Prometheus alerts (API down,
5xx rate, latency, Redis, queue backlog, dead letters, cron staleness ×3,
backup stale, DR overdue, …); health/readiness endpoints (`/health/ready`);
OpenTelemetry + Prometheus/Grafana; worker/API split; Docker healthchecks;
k6/load harness + webhook storm re-run cadence documented.

---

## 3. Gates executed in this sandbox

| Gate | Command / method | Result |
| --- | --- | --- |
| Go syntax, **all 402 files** | tree-sitter parse (scripts/go_syntax_check.py) | **✅ 0 errors** |
| Interface conformance | interface ↔ Postgres ↔ memory method-set diff (incl. new CAS/ledger methods) | **✅ all 4 implementors complete** |
| Unused imports (edited files) | AST scan | **✅ clean** |
| Migration static gates | conflict markers, duplicate versions, up/down pairs (000080, 000081) | **✅ clean** |
| Migration SQL parse | sqlglot (postgres dialect) on 000080/000081 | **✅ parses** |
| Migration runner compatibility | whole-file `ExecContext` (no statement splitting) — plpgsql bodies safe | **✅** |
| Client install | `npm ci` / `npm install` (npm 12.2.1) | **✅** |
| Typecheck | `npx tsc --noEmit` (zod 4 + next 15.5.28) | **✅ exit 0** |
| Unit tests | `npm test` — Vitest 4.1.12 | **✅ 39/39** |
| Production build | `npm run build` — next 15.5.28 | **✅ exit 0**, First-Load shared 102 kB, middleware 34.4 kB |
| Dependency audit | `npm audit --audit-level=high` | **✅ 0 vulnerabilities** |
| **Full CI (the authority)** | GitHub Actions run `40573967339` on this PR — gofmt, `go vet`, **govulncheck**, `go test ./...` (all 470+ tests incl. the 3 new files), e2e real PostgreSQL (migrations 000080/000081 + `wallet_apply()`), DR drill, Playwright+axe, Lighthouse, OpenAPI contract, metrics/alerts validation, web build, mobile typecheck, prompt evals, required-status anchor | **✅ all 12 jobs green** |

New tests added (CI runs them with the Go toolchain):

- `payment_settlement_idempotency_test.go` — CAS exactly-once; double-capture
  webhook blocked (one escrow hold); 20-way concurrent webhook storm → exactly
  1 settlement; manual↔webhook both orders; late capture after manual confirm;
  REFUNDED never resurrected; sweep never overwrites PAID; audit-trail check.
- `growth_service_test.go` — concurrent reward qualify → credited exactly
  once; crash-resume from QUALIFIED → completes exactly once (ledger + reward
  row asserted).
- `wallet_ledger_test.go` — journal rows, replay no-ops, debit guards,
  per-user scoping.

**CI is the authority for** `go build/vet/test`, gofmt, govulncheck,
`scripts/e2e-pg.sh` (real PostgreSQL — exercises migrations 000080/000081 and
`wallet_apply()`), the DR drill, mobile typecheck, Lighthouse, and the
contract test (no routes or schema changed in `api/openapi.yaml`).

---

## 4. Principles checklist (what "industry standard" maps to here)

| Principle | Status | Anchor |
| --- | --- | --- |
| **Exactly-once money movement** | ✅ hardened this branch | `orders.TryMarkPaid` CAS; webhook idempotency (UNIQUE `provider_reference`); `ReleaseIfHeld` CAS; `payouts` UNIQUE per hold; one-hold-per-order index |
| **Reconciliation / auditability** | ✅ | wallet ledger + invariant query; `duplicate_settlement_blocked` audit; audit log on every money transition; gateway amount+currency guards |
| **Idempotency (API)** | ✅ | order `idempotency_key` on bookings; re-initiate reuses PENDING payment attempt; practice attempt keys (000071); webhook dedupe; reward/resume keys |
| **Fail-closed security defaults** | ✅ | config.Validate production gates; refunds off; CORS fail-closed; admin MFA; HSTS |
| **Data-loss prevention** | ✅ hardened | verified backups (TOC check), retention, heartbeats, alerts, CI DR drill, soft deletes, embedded migrations + advisory lock |
| **Concurrency safety (non-money)** | ✅ | overlap booking guard (FR-10), enrollment seat CAS paths, memory/Postgres parity |
| **Observability / incident response** | ✅ | 14 alerts, metrics token, runbooks (OPS + Payments + DR) |
| **Capacity (1k users)** | ✅ | load test: >40× headroom vs 10k-user model; session cache + distributed limiter shipped |
| **Supply-chain hygiene** | ✅ hardened | 0 npm vulnerabilities (was 1 critical + 5 high today); govulncheck in CI; 17 prod deps |

---

## 5. Capacity math for the 1k launch (INFERRED from measured data)

- Measured: ~440 req/s on the slowest (DB+session) path, ~5,000 req/s cached.
- 1k-user launch modelled at **≤6k authenticated calls/day, ≤1–2 req/s peak**
  (10× under the already-tested 10k model) → single API instance retains
  >200× headroom on the slowest path.
- Bottleneck found by load test (session resolution 44.7 ms) already fixed
  with a 30 s Redis session cache; re-run `scripts/loadtest.sh` in staging
  before launch day to refresh the numbers (cadence documented).

---

## 6. Launch gates — run these before opening the doors

1. **✅ CI green on this branch — MET** (run `40573967339`, all 12 jobs):
   Go build/vet/test incl. the 3 new test files and govulncheck, e2e-pg
   (real migrations incl. 000080/000081), contract test, DR drill, mobile
   typecheck, Lighthouse, Playwright+axe, metrics validation, prompt evals,
   required-status anchor. *(Sandbox has no Go/Postgres — CI is the
   authority; it took several iterations to get here because `main`'s Go
   CI had been red since 2026-09-24 — see §2.4.)*
2. **Production env audit**: every `CHANGE_ME` in `.env.production` set;
   **live** (not `sk_test_…`) Paystack keys — the config validator rejects
   test-mode credentials; webhook URL registered at Paystack pointing to
   `/api/v1/payments/webhooks/PAYSTACK`; `METRICS_TOKEN` set; explicit
   `ALLOWED_ORIGINS` (no wildcards); `TRUST_PROXY=true` behind the proxy so
   rate limits see real client IPs.
3. **Money smoke test**: the ₦1,000 live cohort (PAYMENTS_RUNBOOK §1c) —
   pay → webhook settles → escrow HELD → confirm release → payout PRAFT;
   then the ledger invariant query (runbook §7) must return zero rows.
4. **Ops awake**: Prometheus/Grafana scraping, alert routing live
   (especially `YKVirtualBackupStale`, `YKVirtualHigh5xxRate`), backup
   heartbeat fresh, DR drill recorded within its window, on-call knows the
   payments runbook §7 (duplicate_settlement_blocked handling).
5. **⚠️ EXTERNAL — Vercel `ykay-virtual` project settings (only open
   blocker outside this repo).** Its Git-integration deployment fails on
   **every** branch (including `main` — pre-existing, documented in
   docs/AUDIT_PRE_PRODUCTION_2026.md:201) because **Root Directory is
   `" client"` (leading space)**, so the directory doesn't exist and the
   build never starts; `ykay-virtual-wtar` (Root Directory `client`) is
   healthy and — per docs/ENV_VARS.md + docs/FREE_LAUNCH.md — is the
   URL the app currently treats as the web origin. This could not be
   fixed from CI: the repo's `VERCEL_TOKEN`/`VERCEL_ORG_ID` resolve to
   team `team_6rdP3L4iWU3LBf5qigaJ2iiF` but the token **cannot see**
   project `prj_8vZMCgKG4nveomMXmwbU7ScGFTgw` (API 404, only
   `ykay-virtual-wtar` is enumerated), so neither the settings patch nor a
   redeploy is possible with existing credentials. **Dashboard action
   (owner, ~1 min):** either
   **(a)** Vercel → `teamthy1/ykay-virtual` → Settings → General →
   Root Directory → `client` (remove the leading space) **and** mint a
   team-scoped token to refresh `VERCEL_TOKEN` so the Deploy workflow can
   resolve the project, **or (b)** if `ykay-virtual-wtar` is the intended
   production project (all current docs point there), disconnect/delete the
   stale `ykay-virtual` project from the Vercel GitHub integration so its
   permanently-red check disappears. Then re-run/verify the
   `Vercel – ykay-virtual` check on this PR turns green or disappears.

## 7. Accepted risks / follow-ups (non-blocking for 1k)

| Item | Why acceptable now | Follow-up |
| --- | --- | --- |
| Go money values are `float64` (DB `DECIMAL(12,2)`) | 2-dp amounts, well below float precision limits; all comparisons go through the DB | integer-minor-units refactor |
| Daily `pg_dump` → RPO ≤ 24 h | 1k launch, small blast radius, 14-day retention + DR drill | enable WAL archiving/PITR when RPO must shrink |
| Refund path disabled in prod (`PAYMENT_REFUNDS_ENABLED=false`) | fail-closed by design (YK-006) — no fake refunds | certified gateway refund flow, then flip |
| Narrow admin-refund-vs-settle interleaving | refunds are super-admin, audit-logged, and off by default | CAS the refund transition in a later pass |
| Go toolchain unverifiable in this sandbox | syntax + interface + SQL gates run here; **full suite now runs green in CI (run `40573967339`)** | — |
| `zod` major bump 3→4 | surface used is tiny; typecheck+39 tests+build green | watch for deprecated `.email()` removal in future majors |

---

**Bottom line:** the platform already carried a mature control set
(escrow state machine, signed idempotent webhooks, RBAC, MFA, fail-closed
config, backups, alerts, load evidence); this branch closed the remaining
industrial-grade gaps — **double-settlement races, unaudited wallet
mutations, unverified backups, and a fresh critical supply-chain advisory**.
With §6 green, YK-Virtual is **ready to go live for 1,000 users**.

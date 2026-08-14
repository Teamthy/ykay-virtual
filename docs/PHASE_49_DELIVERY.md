# PHASE 49 — G7 HARDENING (session cache, distributed rate limiting, audit archival) + UI contrast closure — DELIVERY

Branch: feature/phase-49-g7-hardening
Base: feature/phase-48-ui-mobile-loadtests @ 4533d1f
Scope: the three G7 scale items the load test identified as the first
levers, plus the remaining landing-page contrast nodes.

## G7.1 — Redis session-resolution cache

- internal/middleware/session_cache.go — CachingSessionResolver wraps the
  DB-backed resolver with a 30s TTL cache (key = session:token:<sha256>);
  positive resolutions only; nil-cache-safe for tests/dev.
- Wired in cmd/api: the SAME cache backend as the catalogue (Redis in
  prod, in-memory in dev) fronts SessionAuth.
- Revocation semantics (documented in the code): logout invalidates the
  exact token immediately (middleware.InvalidateRawToken — called from
  AuthHandler.Logout and after ChangePassword); password-change/account-
  deletion revocations land within the 30s TTL.
- Unit tests: cache-hit skips the resolver, per-token keying, raw-token
  invalidation, nil-cache passthrough (race-clean).

## G7.2 — Distributed rate limiting

- internal/middleware/ratelimit_redis.go — RedisRateLimiter: fixed-window
  INCR+EXPIRE counters keyed by client IP, shared across API instances;
  fails OPEN on Redis errors (site availability > strict limiting; the
  error budget is alertable).
- Router: rate limiter fields now use an HTTPRateLimiter interface;
  Router.SetRateLimiters(global, auth) swaps implementations;
  RateLimitPerMinute exported for the Redis pair.
- cmd/api: when the cache backend is a live Redis, the Redis-backed pair
  (global 300/min env-tunable, auth 40/min) replaces the in-memory ones;
  otherwise in-memory (single-instance semantics, as before).
- Integration test against a real Redis (skips when unreachable): limits
  enforced per IP, other IPs unaffected, bucket clears on expiry.
- CI backend job now runs with a redis:7 service so the integration test
  executes on every push.

## G7.3 — audit_logs archival

- Migration 000030: audit_logs_archive (LIKE audit_logs INCLUDING ALL) +
  created_at index — audit_logs is the highest-volume table
  (~4-6M rows/year at 10k users).
- identity.AuditLogRepository.ArchiveOlderThan(cutoff, batch): Postgres
  batches INSERT..SELECT..ON CONFLICT DO NOTHING + DELETE in bounded
  chunks (idempotent across crashes); memory store no-ops.
- cmd/worker: archive_audit_logs cron (24h) + durable-queue handler,
  AUDIT_RETENTION_DAYS env (default 180), telemetry heartbeats
  (NuvoraCronStale alerts can cover it).

## UI — landing contrast closure

- PressLogos + AnnouncementVideo award strip: text-ink-300 → ink-500/700
  (AA on white/cream) — the last axe-flagged landing nodes. The
  announcement band's award claims are flagged in the consent register
  (G5.3: press/award claims need founder sign-off before launch).

## Verification

```
gofmt / go build / go vet           PASS
go test ./...                       PASS incl. middleware Redis
                                    integration (live redis-server),
                                    session-cache + invalidation,
                                    rate-limiter window tests
go test -race (middleware)          PASS
scripts/e2e.sh (memory)             168 passed · 0 failed
scripts/e2e-pg.sh (real PG, 000030) 168 passed · 0 failed
scripts/staging-evidence.sh         31 passed · 0 failed
scripts/e2e-web.sh                  5 passed · landing axe 0 serious
                                    (contrast 52 → 0 nodes, incl. hero
                                    slides, green badge, footer links)
client vitest / tsc                 PASS
mobile tsc --noEmit                 PASS
scripts/loadtest.sh (Redis live)    session path 44.7 → 26.8 ms
                                    (+65% throughput); search 2.9k →
                                    14.3k req/s (Redis cache);
                                    webhook storm: 1 settlement
```

### Environment fixes forced out by the run

- Emails now queue ONLY in production (dev/staging stay synchronous) —
  with Redis live, magic-link codes and verification links were being
  queued to a nonexistent worker and the E2E flows read codes from the
  console log (restored determinism).
- Meeting service authz violations return domain-wrapped 403/404
  instead of raw 500s; staging-evidence.sh now traps its API process
  (stale-instance reuse was corrupting reruns).

## Remaining (G7 tail)

- Multi-instance deploy validation (compose api scale=2 + Redis limiters).
- audit_logs_archive lifecycle policy (drop/export beyond N years).
- UI: mobile-width pass + image alt/lazy sweep (tracked in
  UI_OPTIMIZATION_PLAN.md); mobile push deep-linking.

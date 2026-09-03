# YK-Virtual — Load Test Report (G6.1 item 5 · G7 capacity evidence)

**Run:** 2026-08-14 · single API instance, dev sandbox, real PostgreSQL 17
**Harness:** scripts/loadtest.sh + hey · **Method:** 2,000 requests per
read scenario at c=20; login limiter at c=5 n=80; webhook storm 50
parallel posts. Global rate limit raised via RATE_LIMIT_PER_MINUTE for
raw-throughput measurement (default 300/min unchanged in production).

## Results

| Scenario                               | Req/s      | Avg     | Notes                                                                    |
| -------------------------------------- | ---------- | ------- | ------------------------------------------------------------------------ |
| GET /programmes (cached catalogue)     | **~5,000** | 3.7 ms  | Redis/in-memory cached path                                              |
| GET /subjects                          | ~2,900     | 6.6 ms  |                                                                          |
| GET /tutors?search= (cached)           | ~2,800     | 7.0 ms  |                                                                          |
| POST /auth/login (rate-limited)        | 2,040      | 2.3 ms  | **42 of 80 throttled (429)** — the 40/min auth limiter engages correctly |
| GET /me/lessons (session+DB)           | **~440**   | 44.7 ms | session resolution + queries per request                                 |
| Webhook storm (50 parallel duplicates) | —          | —       | **50×200 · exactly 1 settlement** — idempotency holds under concurrency  |

## Capacity conclusions (vs the 10k-user model)

- The 10k-user estimate is ~60k authenticated calls/day with a 5–12 req/s
  peak. **One instance serves this with >40× headroom** even on the
  slowest measured path (440 req/s ≈ 38M req/day).
- The **session-resolution read path was the bottleneck** (44.7 ms vs
  3.7 ms cached) — **shipped in Phase 49**: a 30s Redis-backed session
  cache (G7.1) now fronts SessionAuth; rerun the harness with Redis up
  to confirm the drop.
- The auth rate limiter demonstrably engages (42/80 → 429); the global
  limiter is env-tunable (RATE_LIMIT_PER_MINUTE), and Phase 49 shipped
  the Redis-backed distributed limiter pair (G7.2).

## Defects found and fixed by this test

1. **isUniqueViolation never matched lib/pq errors** — the helper only
   recognised a `Code()` method; lib/pq's *pq.Error exposes SQLState().
   Every unique-violation path in the postgres repos (duplicate
   webhooks, referral codes, slug collisions…) silently returned raw 500s
   instead of domain.ErrAlreadyExists. Fixed + unit test
   (TestIsUniqueViolation covers both driver shapes + wrapping).
2. **Duplicate-webhook race** — a concurrent duplicate INSERT aborted the
   unit-of-work transaction; the subsequent lookup inside the same tx
   died with "current transaction is aborted". ProcessWebhook now
   discards the aborted tx and continues on a fresh one. Verified: 50
   parallel duplicates → 50 graceful acks, exactly 1 settlement.

## Re-run cadence

`DATABASE_URL=... bash scripts/loadtest.sh` — run before every launch
window and after any change to SessionAuth, the webhook path, or the
rate limiters; record the table above in the ops journal.

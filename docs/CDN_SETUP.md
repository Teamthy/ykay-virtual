# CDN in Front of the API (Cloudflare, free tier)

> Why: the API lives on Render (single region, ~cold starts, no edge). A CDN
> adds TLS termination near users, caches the public catalogue at the edge
> and absorbs static-load spikes. The web app calls the API **same-origin
> through the Vercel rewrite** (already fast, Vercel-edge → Render), so the
> CDN mainly benefits **direct API consumers: the mobile app and any
> integration** — point `EXPO_PUBLIC_API_URL` at the CDN hostname.

## What the API already guarantees (no CDN config needed to be SAFE)

| Behaviour                                                                                                                                | Where                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Public catalogue GETs send `Cache-Control: public, max-age=60, stale-while-revalidate=300` — but ONLY for anonymous requests             | `internal/middleware/public_cache.go`                                                    |
| Every private/authenticated prefix sends `Cache-Control: no-store` — even a misconfigured "Cache Everything" rule cannot store user data | `internal/middleware/no_store.go`, prefix list in `router.go` (`privateNoStorePrefixes`) |
| SSE (`/api/v1/me/events`) sends `no-cache, no-transform` and is never buffered by our gzip layer                                         | `events_handler.go`, `gzip.go`                                                           |
| Rate limiting keys on the TRUE client IP, preferring unforgeable `CF-Connecting-IP` when enabled                                         | `ratelimit.go clientIP`                                                                  |
| Webhooks: Paystack/Flutterwave sign the raw request body — CDNs do not modify bodies; responses are `no-store`                           | `payment_handler.go`                                                                     |

## Setup (Cloudflare)

1. **DNS**: add the API hostname (e.g. `api.yourdomain.com`) pointing at the
   Render API service, **proxied** (orange cloud).
2. **SSL/TLS mode: Full (strict)** — Render serves a valid cert. _Never_
   "Flexible" (redirect loops + insecure hop).
3. **Caching level: Standard** — Cloudflare respects our origin
   `Cache-Control` headers as-is. No "Cache Everything" page rules needed.
4. **Create one bypass rule** (defense-in-depth on top of origin `no-store`):
   ```
   URI Path starts with  /api/v1/me
   OR /api/v1/auth  OR /api/v1/admin  OR /api/v1/payments
   OR /api/v1/chat  OR /api/v1/objects
   → Cache eligibility: Bypass cache
   ```
5. **Rate-limit env on Render** (both API and worker if it serves HTTP):
   - `TRUST_PROXY=true` (already required behind Render/Vercel)
   - `TRUST_CF_IP=true` — makes the rate limiter prefer `CF-Connecting-IP`.
     Without it, Cloudflare appends to the client-controllable
     `X-Forwarded-For`, letting attackers mint fresh rate-limit buckets.
6. **Turn off** Rocket Loader / "Auto Minify" for the API host (they only
   touch HTML, but keep the path clean).
7. **Webhook note**: point the Paystack/Flutterwave webhook URLs at the
   **origin hostname or the CDN hostname** — both work (bodies unmodified);
   the bypass rule keeps responses uncached.

## Verification checklist after cutover

```bash
# public + anonymous → x-cache: HIT after the second call (CF-Cache-Status)
curl -sI https://api.yourdomain.com/api/v1/cohorts | grep -i "cache-control\|cf-cache-status"
# → Cache-Control: public, max-age=60, stale-while-revalidate=300

# authenticated (any /me route with a session cookie) → no-store
curl -sI -H "Cookie: ykv_session=…" https://api.yourdomain.com/api/v1/me/orders | grep -i cache-control
# → Cache-Control: no-store

# SSE still streams (no buffering)
curl -N -H "Cookie: ykv_session=…" https://api.yourdomain.com/api/v1/me/events
# → ": connected" then 25s heartbeats
```

## Rollback

Flip the Cloudflare proxy off (grey cloud). The API is fully functional
without a CDN — the CDN adds latency wins, not correctness.

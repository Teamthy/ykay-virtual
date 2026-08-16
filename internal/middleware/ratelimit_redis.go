package middleware

import (
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"

	"ykay-virtual/pkg"
)

// RedisRateLimiter — G7.2: distributed rate limiting shared across API
// instances. Fixed-window counters (INCR + EXPIRE on first hit) keyed by
// client IP; the in-memory RateLimiter remains the fallback when Redis is
// unreachable (single-instance semantics).
type RedisRateLimiter struct {
	client *redis.Client
	limit  int
	window time.Duration
	prefix string
}

func NewRedisRateLimiter(client *redis.Client, limit int, window time.Duration, prefix string) *RedisRateLimiter {
	if prefix == "" {
		prefix = "rl"
	}
	return &RedisRateLimiter{client: client, limit: limit, window: window, prefix: prefix}
}

func (rl *RedisRateLimiter) key(ip string) string { return rl.prefix + ":" + ip }

func (rl *RedisRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// YK-020/A-04: reuse clientIP() so a trusted reverse proxy
		// (TRUST_PROXY=true — Render/Vercel) stamps the real client IP from
		// X-Forwarded-For. Using r.RemoteAddr here collapsed every user
		// behind the proxy into a single rate-limit bucket (mass 429s).
		ip := clientIP(r)
		key := rl.key(ip)
		n, err := rl.client.Incr(r.Context(), key).Result()
		if err != nil {
			// Redis hiccup: fail open to keep the site up (the API still
			// logs; ops alerting watches the error budget).
			next.ServeHTTP(w, r)
			return
		}
		if n == 1 {
			_ = rl.client.Expire(r.Context(), key, rl.window).Err()
		}
		if n > int64(rl.limit) {
			pkg.WriteError(w, http.StatusTooManyRequests, string(pkg.CodeTooManyRequests),
				"too many requests, please slow down", nil)
			return
		}
		next.ServeHTTP(w, r)
	})
}

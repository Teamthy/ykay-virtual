package middleware

import (
	"net"
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
		ip := r.RemoteAddr
		if host, _, err := net.SplitHostPort(ip); err == nil {
			ip = host
		}
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

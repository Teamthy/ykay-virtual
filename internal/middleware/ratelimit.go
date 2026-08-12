package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"ykay-virtual/pkg"
)

type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Key on the bare IP (not ip:port) so keep-alive/new connections from
		// the same client cannot bypass the window.
		ip := r.RemoteAddr
		if host, _, err := net.SplitHostPort(ip); err == nil {
			ip = host
		}
		rl.mu.Lock()
		now := time.Now()
		cutoff := now.Add(-rl.window)
		times := rl.requests[ip]
		filtered := []time.Time{}
		for _, t := range times {
			if t.After(cutoff) {
				filtered = append(filtered, t)
			}
		}
		if len(filtered) >= rl.limit {
			rl.mu.Unlock()
			pkg.WriteError(w, http.StatusTooManyRequests, string(pkg.CodeTooManyRequests),
				"too many requests, please slow down", nil)
			return
		}
		filtered = append(filtered, now)
		rl.requests[ip] = filtered
		rl.mu.Unlock()
		next.ServeHTTP(w, r)
	})
}

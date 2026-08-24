package middleware

import (
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"ykay-virtual/pkg"
)

type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	// lastSeen tracks the most recent request time per key so that entries
	// whose sliding window has fully lapsed can be evicted. Without this the
	// map grows forever (one entry per distinct source IP), an unbounded-memory
	// leak that becomes an OOM vector under sustained traffic (CF-3).
	lastSeen map[string]time.Time
	limit    int
	window   time.Duration
}

// maxLimiterEntries bounds the number of tracked keys. When exceeded, entries
// idle for at least one full window are pruned to keep memory bounded.
const maxLimiterEntries = 10000

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		lastSeen: make(map[string]time.Time),
		limit:    limit,
		window:   window,
	}
}

// clientIP resolves the real client IP for per-IP limiting. Behind a trusted
// reverse proxy (TRUST_PROXY=true, e.g. Render/Vercel) the proxy stamps the
// original client address in X-Forwarded-For — its leftmost entry is the
// client. Without this, every request behind the proxy shares the proxy's
// RemoteAddr, collapsing all users into one rate-limit bucket (the "many users
// on the same IP" problem). In direct/dev mode X-Forwarded-For is ignored so a
// caller cannot forge a fresh bucket.
//
// TRUST_CF_IP=true (requires TRUST_PROXY=true) — a CDN such as Cloudflare
// sits in front. XFF's leftmost entry is then CLIENT-CONTROLLED (a caller
// can send their own XFF and CF appends to it), which would let anyone mint
// fresh rate-limit buckets. CF-Connecting-IP is stripped from inbound
// requests by Cloudflare and stamped with the true client address, so it is
// preferred unconditionally when this flag is on.
func clientIP(r *http.Request) string {
	ip := r.RemoteAddr
	if host, _, err := net.SplitHostPort(ip); err == nil {
		ip = host
	}
	if os.Getenv("TRUST_PROXY") == "true" {
		if os.Getenv("TRUST_CF_IP") == "true" {
			if cf := strings.TrimSpace(r.Header.Get("CF-Connecting-IP")); cf != "" {
				return cf
			}
		}
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			// XFF may be a comma-separated chain: client, proxy1, proxy2.
			first, _, _ := strings.Cut(xff, ",")
			if first = strings.TrimSpace(first); first != "" {
				return first
			}
		}
	}
	return ip
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Key on the bare IP (not ip:port) so keep-alive/new connections from
		// the same client cannot bypass the window.
		ip := clientIP(r)
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
		rl.lastSeen[ip] = now
		rl.maybePrune(now)
		rl.mu.Unlock()
		next.ServeHTTP(w, r)
	})
}

// maybePrune removes entries whose most recent request predates the sliding
// window. It runs opportunistically when the tracked-key count grows past the
// bound, keeping the per-IP cost O(1) on the common path (CF-3).
func (rl *RateLimiter) maybePrune(now time.Time) {
	if len(rl.requests) <= maxLimiterEntries {
		return
	}
	idleBefore := now.Add(-rl.window)
	for ip, last := range rl.lastSeen {
		if last.Before(idleBefore) {
			delete(rl.requests, ip)
			delete(rl.lastSeen, ip)
		}
	}
}

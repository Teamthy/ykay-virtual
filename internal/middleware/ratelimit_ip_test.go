package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// clientIP — the per-IP rate-limit key. Behind Cloudflare (TRUST_CF_IP) the
// unforgeable CF-Connecting-IP wins over the client-controlled leftmost
// X-Forwarded-For entry; without the flags, headers are ignored entirely.

func ipOf(t *testing.T, req *http.Request) string {
	t.Helper()
	return clientIP(req)
}

func TestClientIP_IgnoresHeadersByDefault(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "203.0.113.7:44321"
	req.Header.Set("X-Forwarded-For", "1.1.1.1")
	req.Header.Set("CF-Connecting-IP", "2.2.2.2")
	if got := ipOf(t, req); got != "203.0.113.7" {
		t.Fatalf("untrusted mode must use RemoteAddr, got %s", got)
	}
}

func TestClientIP_TrustProxyUsesLeftmostXFF(t *testing.T) {
	t.Setenv("TRUST_PROXY", "true")
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "10.0.0.9:5555"
	req.Header.Set("X-Forwarded-For", "198.51.100.4, 10.0.0.9")
	if got := ipOf(t, req); got != "198.51.100.4" {
		t.Fatalf("TRUST_PROXY must take leftmost XFF, got %s", got)
	}
}

func TestClientIP_CloudflareIPBeatsForgedXFF(t *testing.T) {
	t.Setenv("TRUST_PROXY", "true")
	t.Setenv("TRUST_CF_IP", "true")
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "104.16.1.1:9999" // Cloudflare edge
	// Attacker-controlled XFF that would otherwise mint fresh buckets:
	req.Header.Set("X-Forwarded-For", "6.6.6.6, 104.16.1.1")
	req.Header.Set("CF-Connecting-IP", "198.51.100.23")
	if got := ipOf(t, req); got != "198.51.100.23" {
		t.Fatalf("CF-Connecting-IP must win over forged XFF, got %s", got)
	}
}

func TestClientIP_CFWithoutTrustProxyIsIgnored(t *testing.T) {
	// TRUST_CF_IP alone must NOT enable header trust (both flags required).
	t.Setenv("TRUST_CF_IP", "true")
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "203.0.113.9:80"
	req.Header.Set("CF-Connecting-IP", "2.2.2.2")
	if got := ipOf(t, req); got != "203.0.113.9" {
		t.Fatalf("CF flag without TRUST_PROXY must be ignored, got %s", got)
	}
}

func TestRateLimiter_MiddlewareUsesResolvedIP(t *testing.T) {
	t.Setenv("TRUST_PROXY", "true")
	t.Setenv("TRUST_CF_IP", "true")
	rl := NewRateLimiter(2, time.Minute)
	h := rl.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	srv := httptest.NewServer(h)
	defer srv.Close()

	do := func(cf string) int {
		req, _ := http.NewRequest(http.MethodGet, srv.URL, nil)
		req.Header.Set("CF-Connecting-IP", cf)
		res, err := srv.Client().Do(req)
		if err != nil {
			t.Fatalf("req: %v", err)
		}
		defer res.Body.Close()
		return res.StatusCode
	}
	if c := do("198.51.100.50"); c != http.StatusOK {
		t.Fatalf("first request should pass, got %d", c)
	}
	if c := do("198.51.100.51"); c != http.StatusOK {
		t.Fatalf("different client (different CF IP) must have its own bucket, got %d", c)
	}
	if c := do("198.51.100.50"); c != http.StatusOK {
		t.Fatalf("second request same client should pass, got %d", c)
	}
	if c := do("198.51.100.50"); c != http.StatusTooManyRequests {
		t.Fatalf("third request same client must be limited, got %d", c)
	}
}

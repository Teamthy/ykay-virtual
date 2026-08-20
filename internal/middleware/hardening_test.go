package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// CORS fail-closed (hardening SEC-002): only explicitly allowed origins get
// cross-origin headers; an empty allowlist (default) never emits them.
func TestCORS_FailClosed(t *testing.T) {
	ok := func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) }

	t.Run("no allowlist → no CORS headers, request still served", func(t *testing.T) {
		h := CORS("")(http.HandlerFunc(ok))
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/x", nil)
		req.Header.Set("Origin", "https://evil.example.com")
		h.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Empty(t, rec.Header().Get("Access-Control-Allow-Origin"), "must not echo origin when not allowed")
		assert.Empty(t, rec.Header().Get("Access-Control-Allow-Credentials"))
	})

	t.Run("allowed origin → headers with credentials", func(t *testing.T) {
		h := CORS("https://app.nuvora.com, https://staging.nuvora.com")(http.HandlerFunc(ok))
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/x", nil)
		req.Header.Set("Origin", "https://app.nuvora.com")
		h.ServeHTTP(rec, req)
		assert.Equal(t, "https://app.nuvora.com", rec.Header().Get("Access-Control-Allow-Origin"))
		assert.Equal(t, "true", rec.Header().Get("Access-Control-Allow-Credentials"))
	})

	t.Run("unknown origin → no headers", func(t *testing.T) {
		h := CORS("https://app.nuvora.com")(http.HandlerFunc(ok))
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/x", nil)
		req.Header.Set("Origin", "https://evil.example.com")
		h.ServeHTTP(rec, req)
		assert.Empty(t, rec.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("preflight from unknown origin → 204 without CORS headers", func(t *testing.T) {
		h := CORS("https://app.nuvora.com")(http.HandlerFunc(ok))
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/x", nil)
		req.Header.Set("Origin", "https://evil.example.com")
		h.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusNoContent, rec.Code)
		assert.Empty(t, rec.Header().Get("Access-Control-Allow-Origin"))
	})
}

// Rate limiter (hardening SEC-005): sliding window enforces 429 beyond the
// limit per source address.
func TestRateLimiter_EnforcesLimit(t *testing.T) {
	rl := NewRateLimiter(2, time.Minute)
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	h := rl.Middleware(ok)

	for i := 0; i < 2; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/x", nil)
		req.RemoteAddr = "10.0.0.1:1234"
		h.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code, "request %d should pass", i+1)
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.RemoteAddr = "10.0.0.1:1234"
	h.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusTooManyRequests, rec.Code, "third request within window must be throttled")

	// A different source is unaffected.
	rec2 := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodGet, "/x", nil)
	req2.RemoteAddr = "10.0.0.2:9999"
	h.ServeHTTP(rec2, req2)
	assert.Equal(t, http.StatusOK, rec2.Code)

	// Same IP via a different source port is still the same client.
	rec3 := httptest.NewRecorder()
	req3 := httptest.NewRequest(http.MethodGet, "/x", nil)
	req3.RemoteAddr = "10.0.0.1:5555"
	h.ServeHTTP(rec3, req3)
	assert.Equal(t, http.StatusTooManyRequests, rec3.Code, "port change must not bypass the per-IP limit")
}

// Security headers (hardening: misconfiguration) — frame blocking is
// production-only so the dev/preview iframe keeps working.
func TestSecurityHeaders(t *testing.T) {
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })

	t.Run("dev: baseline headers, no frame blocking", func(t *testing.T) {
		rec := httptest.NewRecorder()
		SecurityHeaders(false)(ok).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
		assert.Equal(t, "nosniff", rec.Header().Get("X-Content-Type-Options"))
		assert.Equal(t, "strict-origin-when-cross-origin", rec.Header().Get("Referrer-Policy"))
		assert.Empty(t, rec.Header().Get("X-Frame-Options"))
		assert.Empty(t, rec.Header().Get("Content-Security-Policy"))
	})

	t.Run("production: frame blocking on", func(t *testing.T) {
		rec := httptest.NewRecorder()
		SecurityHeaders(true)(ok).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
		assert.Equal(t, "DENY", rec.Header().Get("X-Frame-Options"))
		assert.Contains(t, rec.Header().Get("Content-Security-Policy"), "frame-ancestors 'none'")
		assert.Contains(t, rec.Header().Get("Strict-Transport-Security"), "max-age=")
	})
}

// The dev auth bridge is GONE: X-User-ID / X-User-Roles headers must NOT
// establish an actor (hardening SEC-001). Only SessionAuth can do that, so
// here we assert no middleware exists that reads those headers by checking
// the context stays empty through a plain handler chain.
func TestNoAuthBridge_HeadersDoNotAuthenticate(t *testing.T) {
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, ok := ActorFromContext(r.Context())
		if ok {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	// Chain mirrors router.Handler(): CORS → security headers → rate limiter.
	h := CORS("")(SecurityHeaders(false)(NewRateLimiter(100, time.Minute).Middleware(ok)))
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/x", nil)
	req.Header.Set("X-User-ID", "00000000-0000-0000-0000-0000000000a2")
	req.Header.Set("X-User-Roles", "SUPER_ADMIN")
	h.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code, "headers must NOT create an actor")
}

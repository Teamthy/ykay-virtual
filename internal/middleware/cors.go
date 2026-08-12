package middleware

import (
	"net/http"
	"strings"
)

// CORS — fail-closed by default. Cross-origin headers are emitted ONLY for
// origins explicitly listed in ALLOWED_ORIGINS (comma-separated). An empty
// allowlist means no browser origin is allowed: the web app reaches the API
// same-origin through the Next.js rewrite, so no CORS is required by the
// product (hardening audit SEC-002: wildcard + credentials is never emitted).
//
// The auth-bridge headers (X-User-ID/X-User-Roles) are intentionally NOT
// in the allow list — the bridge is removed; sessions only.

func CORS(allowedOrigins string) func(http.Handler) http.Handler {
	allow := map[string]bool{}
	for _, o := range strings.Split(allowedOrigins, ",") {
		if o = strings.TrimSpace(o); o != "" {
			allow[o] = true
		}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if origin := r.Header.Get("Origin"); origin != "" && allow[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID, X-Trace-ID, X-Paystack-Signature, verif-hash")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Vary", "Origin")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

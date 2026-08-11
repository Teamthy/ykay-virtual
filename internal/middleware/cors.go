package middleware

import (
	"net/http"
	"strings"
)

// CORS — allows browser + mobile-web clients (PWA) to call the API from any
// origin. Mobile native apps do not send CORS preflights; the auth bridge
// headers are accepted on all origins. Tighten the allowlist in production
// via ALLOWED_ORIGINS (comma-separated).

func CORS(allowedOrigins string) func(http.Handler) http.Handler {
	allow := map[string]bool{}
	for _, o := range strings.Split(allowedOrigins, ",") {
		if o = strings.TrimSpace(o); o != "" {
			allow[o] = true
		}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && (len(allow) == 0 || allow[origin]) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID, X-Trace-ID, X-User-ID, X-User-Roles, X-Paystack-Signature, verif-hash")
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

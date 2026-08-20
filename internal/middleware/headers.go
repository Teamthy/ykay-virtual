package middleware

import "net/http"

// SecurityHeaders — baseline hardening headers (hardening audit: security
// misconfiguration). Frame blocking (X-Frame-Options / CSP frame-ancestors)
// is applied only when blockFrames is true (production): the dev/preview
// environment embeds the site in an iframe, which DENY would break.
//
// A full Content-Security-Policy is intentionally not emitted here: the
// Next.js app ships inline scripts/styles, so a strict CSP requires
// nonce/hash plumbing in the frontend build — tracked separately.

func SecurityHeaders(blockFrames bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()
			h.Set("X-Content-Type-Options", "nosniff")
			h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
			h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
			if blockFrames {
				h.Set("X-Frame-Options", "DENY")
				h.Set("Content-Security-Policy", "frame-ancestors 'none'")
				h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
			}
			next.ServeHTTP(w, r)
		})
	}
}

package middleware

import (
	"net/http"
	"strconv"
)

// PublicCacheForAnonymous — browser/mobile cache headers for public
// catalogue GETs (F-4 wait-time fix).
//
// Anonymous browsing (no session cookie, no Authorization header) gets:
//
//	Cache-Control: public, max-age=60, stale-while-revalidate=300
//
// so repeat navigation between cohorts/tutors/programmes/subjects pages is
// served from the local cache instead of a fresh DB round-trip. Requests
// carrying credentials are left uncached — a logged-in user never sees a
// cached anonymous response. Handlers can still override by setting their
// own Cache-Control before this middleware default applies (SetDefault only
// fills the value when absent).
func PublicCacheForAnonymous(maxAgeSec int) func(http.Handler) http.Handler {
	value := "public, max-age=" + strconv.Itoa(maxAgeSec) + ", stale-while-revalidate=" + strconv.Itoa(maxAgeSec*5)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			anonymous := r.Header.Get("Authorization") == "" && sessionCookie(r) == ""
			if anonymous && r.Method == http.MethodGet && w.Header().Get("Cache-Control") == "" {
				w.Header().Set("Cache-Control", value)
			}
			next.ServeHTTP(w, r)
		})
	}
}

func sessionCookie(r *http.Request) string {
	for _, c := range r.Cookies() {
		if c.Name == "nuvora_session" {
			return c.Value
		}
	}
	return ""
}


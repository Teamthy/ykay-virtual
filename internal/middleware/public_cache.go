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
// served from the local cache instead of a fresh DB round-trip. This SETS
// (overwrites) any earlier default — e.g. the PrivateNoStore middleware
// stamps no-store on the /cohorts prefix; this handler then deliberately
// re-stamps public for anonymous catalogue reads, so an authenticated
// request on the same path keeps no-store. Requests carrying credentials
// are never cached.
func PublicCacheForAnonymous(maxAgeSec int) func(http.Handler) http.Handler {
	value := "public, max-age=" + strconv.Itoa(maxAgeSec) + ", stale-while-revalidate=" + strconv.Itoa(maxAgeSec*5)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			anonymous := r.Header.Get("Authorization") == "" && sessionCookie(r) == ""
			if anonymous && r.Method == http.MethodGet {
				w.Header().Set("Cache-Control", value) // deliberate overwrite of any private default
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

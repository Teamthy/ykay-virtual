package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// PublicCacheForAnonymous — anonymous catalogue GETs get public cache
// headers (even over a no-store default); authenticated requests never do.

func TestPublicCache_AnonymousGetsPublicHeader(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/cohorts", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	rec := httptest.NewRecorder()
	PublicCacheForAnonymous(60)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if cc := w.Header().Get("Cache-Control"); cc != "public, max-age=60, stale-while-revalidate=300" {
			t.Fatalf("anonymous GET must be publicly cacheable, got %q", cc)
		}
	})).ServeHTTP(rec, req)
}

func TestPublicCache_AuthenticatedNeverCached(t *testing.T) {
	mk := func(req *http.Request) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		PublicCacheForAnonymous(60)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if cc := w.Header().Get("Cache-Control"); cc != "" {
				t.Fatalf("authenticated request must not get a public header, got %q", cc)
			}
		})).ServeHTTP(rec, req)
		return rec
	}
	// session cookie present
	req := httptest.NewRequest(http.MethodGet, "/api/v1/cohorts", nil)
	req.AddCookie(&http.Cookie{Name: "nuvora_session", Value: "abc"})
	mk(req)
	// Authorization header present
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/cohorts", nil)
	req2.Header.Set("Authorization", "Bearer xyz")
	mk(req2)
}

func TestPublicCache_OverwritesPrivateDefault(t *testing.T) {
	// Composition contract with PrivateNoStore: the private middleware
	// stamps no-store on the prefix; the public wrapper deliberately
	// re-stamps public for anonymous catalogue reads.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/cohorts", nil)
	rec := httptest.NewRecorder()
	h := NewPrivateNoStore([]string{"/api/v1/cohorts"}).Middleware(
		PublicCacheForAnonymous(60)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if cc := w.Header().Get("Cache-Control"); cc != "public, max-age=60, stale-while-revalidate=300" {
				t.Fatalf("public re-stamp must win for anonymous, got %q", cc)
			}
		})),
	)
	h.ServeHTTP(rec, req)
	// …and an authenticated user on the same path keeps no-store.
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/cohorts", nil)
	req2.AddCookie(&http.Cookie{Name: "nuvora_session", Value: "abc"})
	rec2 := httptest.NewRecorder()
	h2 := NewPrivateNoStore([]string{"/api/v1/cohorts"}).Middleware(
		PublicCacheForAnonymous(60)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})),
	)
	h2.ServeHTTP(rec2, req2)
	if cc := rec2.Header().Get("Cache-Control"); cc != "no-store" {
		t.Fatalf("authenticated user must keep no-store, got %q", cc)
	}
}

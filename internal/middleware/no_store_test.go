package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// PrivateNoStore — private paths must carry no-store (CDN defense-in-depth);
// public paths must remain untouched so their own cache headers apply.

func newNS() *PrivateNoStore {
	return NewPrivateNoStore([]string{
		"/api/v1/me",
		"/api/v1/auth",
		"/api/v1/admin",
		"/api/v1/payments",
		"/api/v1/chat",
	})
}

func TestPrivateNoStore_PrivatePathsGetNoStore(t *testing.T) {
	for _, path := range []string{
		"/api/v1/me/orders/123",
		"/api/v1/me/events",
		"/api/v1/auth/login",
		"/api/v1/admin/users",
		"/api/v1/payments/webhooks/paystack",
		"/api/v1/chat/message",
	} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		newNS().Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if cc := w.Header().Get("Cache-Control"); cc != "no-store" {
				t.Fatalf("%s: expected no-store before handler, got %q", path, cc)
			}
			w.WriteHeader(http.StatusOK)
		})).ServeHTTP(rec, req)
		if cc := rec.Header().Get("Cache-Control"); cc != "no-store" {
			t.Fatalf("%s: response must be no-store, got %q", path, cc)
		}
	}
}

func TestPrivateNoStore_PublicPathsUntouched(t *testing.T) {
	for _, path := range []string{
		"/api/v1/cohorts",
		"/api/v1/programmes/igcse",
		"/api/v1/subjects",
		"/api/v1/tutors/search",
		"/health",
		"/",
	} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		newNS().Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if cc := w.Header().Get("Cache-Control"); cc != "" {
				t.Fatalf("%s: middleware must not set a header on public paths, got %q", path, cc)
			}
			// The public handler sets its own afterwards — that must win.
			w.Header().Set("Cache-Control", "public, max-age=60")
			w.WriteHeader(http.StatusOK)
		})).ServeHTTP(rec, req)
		if cc := rec.Header().Get("Cache-Control"); cc != "public, max-age=60" {
			t.Fatalf("%s: handler header must win, got %q", path, cc)
		}
	}
}

func TestPrivateNoStore_HandlerOverrideStillWins(t *testing.T) {
	// e.g. the SSE events handler sets no-cache,no-transform — that value,
	// not no-store, must reach the client.
	req := httptest.NewRequest(http.MethodGet, "/api/v1/me/events", nil)
	rec := httptest.NewRecorder()
	// Pre-set like PublicCacheForAnonymous does (fill only when absent) is
	// the pattern for cache60; the SSE handler instead overwrites inside the
	// handler — emulate that:
	NewPrivateNoStore([]string{"/api/v1/me"}).Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache, no-transform")
		w.WriteHeader(http.StatusOK)
	})).ServeHTTP(rec, req)
	if cc := rec.Header().Get("Cache-Control"); cc != "no-cache, no-transform" {
		t.Fatalf("handler override must win, got %q", cc)
	}
}

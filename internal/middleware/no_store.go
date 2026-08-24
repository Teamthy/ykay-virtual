package middleware

import (
	"net/http"
	"strings"
)

// PrivateNoStore — CDN defense-in-depth (Phase 5b follow-up).
//
// Private/authenticated routes get an explicit:
//
//	Cache-Control: no-store
//
// so that even a CDN misconfiguration ("Cache Everything" rules, an overly
// broad page rule) can never store or serve one user's data to another.
// Public catalogue GETs set their own public Cache-Control inside their
// handlers (see PublicCacheForAnonymous) and override this default — the
// handler runs AFTER this middleware, so a handler-set value always wins.
//
// Paths that must stay cacheable set their own header before this default
// applies (SetDefault semantics: we only fill when absent).
type PrivateNoStore struct {
	prefixes []string
}

// NewPrivateNoStore — privateRoutePrefixes is the list of API path prefixes
// (e.g. "/api/v1/me") that must never be stored by any shared cache.
func NewPrivateNoStore(privatePrefixes []string) *PrivateNoStore {
	p := make([]string, 0, len(privatePrefixes))
	for _, x := range privatePrefixes {
		if x = strings.TrimSpace(x); x != "" {
			p = append(p, x)
		}
	}
	return &PrivateNoStore{prefixes: p}
}

func (m *PrivateNoStore) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		for _, prefix := range m.prefixes {
			if strings.HasPrefix(path, prefix) {
				if w.Header().Get("Cache-Control") == "" {
					w.Header().Set("Cache-Control", "no-store")
				}
				break
			}
		}
		next.ServeHTTP(w, r)
	})
}

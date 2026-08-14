package middleware

import (
	"context"
	"encoding/json"
	"sync/atomic"
	"time"

	"ykay-virtual/internal/cache"

	"github.com/google/uuid"
)

// CachingSessionResolver — G7.1: wraps the DB-backed session resolver with
// a short-lived cache so the hottest authenticated path (every request)
// stops hitting Postgres. The load test measured /me/lessons at 44.7 ms
// with ~2 session queries per request; a 30s cache removes them.
//
// Revocation semantics: logout invalidates the exact token immediately
// (InvalidateRawToken); password change / account deletion revoke the
// underlying sessions and the cached entry expires within SessionCacheTTL
// (30s) — a deliberate, documented trade-off of the short TTL.

const (
	SessionCacheTTL    = 30 * time.Second
	sessionCachePrefix = "session:token:"
)

type cachedSession struct {
	UserID uuid.UUID `json:"id"`
	Roles  []string  `json:"roles"`
}

// CachingSessionResolver implements SessionResolver with a cache in front.
type CachingSessionResolver struct {
	next  SessionResolver
	cache cache.Cache
	ttl   time.Duration
}

// NewCachingSessionResolver wraps next; a nil cache is safe (pass-through).
func NewCachingSessionResolver(next SessionResolver, c cache.Cache) *CachingSessionResolver {
	return &CachingSessionResolver{next: next, cache: c, ttl: SessionCacheTTL}
}

func (c *CachingSessionResolver) key(hash string) string { return sessionCachePrefix + hash }

func (c *CachingSessionResolver) Me(ctx context.Context, hash string) (uuid.UUID, []string, error) {
	if c.cache != nil {
		if v, err := c.cache.Get(ctx, c.key(hash)); err == nil && v != "" {
			var entry cachedSession
			if json.Unmarshal([]byte(v), &entry) == nil {
				return entry.UserID, entry.Roles, nil
			}
		}
	}
	id, roles, err := c.next.Me(ctx, hash)
	if err != nil {
		return uuid.Nil, nil, err
	}
	if c.cache != nil {
		if b, merr := json.Marshal(cachedSession{UserID: id, Roles: roles}); merr == nil {
			_ = c.cache.Set(ctx, c.key(hash), string(b), c.ttl)
		}
	}
	return id, roles, nil
}

// ---------------------------------------------------------------- global ----

var globalSessionCache atomic.Pointer[CachingSessionResolver]

// SetSessionCache installs the process-wide resolver cache (called at boot;
// tests use their own instances directly).
func SetSessionCache(c *CachingSessionResolver) { globalSessionCache.Store(c) }

// InvalidateRawToken drops the cached entry for one raw session token.
// Safe to call before the cache is installed (no-op).
func InvalidateRawToken(raw string) {
	if raw == "" {
		return
	}
	c := globalSessionCache.Load()
	if c == nil || c.cache == nil {
		return
	}
	_ = c.cache.Del(context.Background(), c.key(hashToken(raw)))
}

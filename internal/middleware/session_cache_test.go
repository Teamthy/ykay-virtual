package middleware

import (
	"context"
	"sync/atomic"
	"testing"

	"ykay-virtual/internal/cache"

	"github.com/google/uuid"
)

// fakeResolver — counts resolutions so tests can prove cache hits skip the DB.
type fakeResolver struct {
	calls atomic.Int32
	user  uuid.UUID
	roles []string
}

func (f *fakeResolver) Me(_ context.Context, _ string) (uuid.UUID, []string, error) {
	f.calls.Add(1)
	return f.user, f.roles, nil
}

func TestCachingResolverHitsAndInvalidates(t *testing.T) {
	user := uuid.New()
	resolver := &fakeResolver{user: user, roles: []string{"PARENT"}}
	c := cache.NewInMemoryCache()
	wrapped := NewCachingSessionResolver(resolver, c)
	ctx := context.Background()

	// First call resolves through; second is served from cache.
	id1, roles1, err := wrapped.Me(ctx, "hash-1")
	if err != nil || id1 != user || len(roles1) != 1 {
		t.Fatalf("first resolve: %v %v %v", id1, roles1, err)
	}
	if _, _, err := wrapped.Me(ctx, "hash-1"); err != nil {
		t.Fatalf("cached resolve: %v", err)
	}
	if resolver.calls.Load() != 1 {
		t.Fatalf("cache hit must skip the resolver: %d calls", resolver.calls.Load())
	}

	// A different token still resolves (per-token keys).
	if _, _, err := wrapped.Me(ctx, "hash-2"); err != nil {
		t.Fatalf("second token: %v", err)
	}
	if resolver.calls.Load() != 2 {
		t.Fatalf("distinct tokens must not share cache entries")
	}
}

func TestInvalidateRawToken(t *testing.T) {
	resolver := &fakeResolver{user: uuid.New(), roles: []string{"TUTOR"}}
	c := cache.NewInMemoryCache()
	wrapped := NewCachingSessionResolver(resolver, c)
	SetSessionCache(wrapped)
	defer SetSessionCache(nil)

	// Production flow: SessionAuth hashes the RAW token, then resolves with
	// the hash — so prime the cache exactly the way the middleware does.
	hash := hashToken("abc-token")
	_, _, _ = wrapped.Me(context.Background(), hash)
	if resolver.calls.Load() != 1 {
		t.Fatalf("prime: %d", resolver.calls.Load())
	}

	// Logout-equivalent: invalidate the raw token → next resolve re-hits DB.
	InvalidateRawToken("abc-token")
	_, _, _ = wrapped.Me(context.Background(), hash)
	if resolver.calls.Load() != 2 {
		t.Fatalf("invalidation must force re-resolution, calls=%d", resolver.calls.Load())
	}
}

func TestCachingResolverNilCachePassthrough(t *testing.T) {
	resolver := &fakeResolver{user: uuid.New()}
	wrapped := NewCachingSessionResolver(resolver, nil)
	if _, _, err := wrapped.Me(context.Background(), "h"); err != nil {
		t.Fatalf("nil cache must pass through: %v", err)
	}
	if resolver.calls.Load() != 1 {
		t.Fatalf("expected 1 resolution")
	}
}

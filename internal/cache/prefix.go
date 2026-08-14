package cache

import (
	"context"
	"time"
)

// PrefixCache namespaces every key under a fixed prefix. It prevents
// cross-contamination when two API instances with different storage
// backends (Postgres vs in-memory dev mode) share one Redis: without a
// namespace the dev catalogue seeds (e.g. subject ids 00000000-...-c001)
// would be served to the Postgres-backed instance as if they were real
// rows, breaking lookups that join against the database.
type PrefixCache struct {
	inner  Cache
	prefix string
}

// WithPrefix wraps c so all keys are stored as "<prefix><key>".
func WithPrefix(c Cache, prefix string) *PrefixCache {
	if prefix == "" {
		prefix = "default:"
	}
	return &PrefixCache{inner: c, prefix: prefix}
}

func (p *PrefixCache) key(k string) string { return p.prefix + k }

func (p *PrefixCache) Get(ctx context.Context, key string) (string, error) {
	return p.inner.Get(ctx, p.key(key))
}

func (p *PrefixCache) Set(ctx context.Context, key, value string, ttl time.Duration) error {
	return p.inner.Set(ctx, p.key(key), value, ttl)
}

func (p *PrefixCache) Del(ctx context.Context, keys ...string) error {
	prefixed := make([]string, len(keys))
	for i, k := range keys {
		prefixed[i] = p.key(k)
	}
	return p.inner.Del(ctx, prefixed...)
}

func (p *PrefixCache) DelPrefix(ctx context.Context, prefix string) error {
	return p.inner.DelPrefix(ctx, p.key(prefix))
}

func (p *PrefixCache) Incr(ctx context.Context, key string) (int64, error) {
	return p.inner.Incr(ctx, p.key(key))
}

func (p *PrefixCache) Exists(ctx context.Context, key string) (bool, error) {
	return p.inner.Exists(ctx, p.key(key))
}

var _ Cache = (*PrefixCache)(nil)

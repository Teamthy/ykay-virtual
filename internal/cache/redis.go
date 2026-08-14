package cache

import (
	"context"
	"strings"
	"sync"
	"time"
)

// Minimal abstraction to allow swapping implementation
// Production should use go-redis, but interface kept simple for now

type Cache interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key, value string, ttl time.Duration) error
	Del(ctx context.Context, keys ...string) error
	// DelPrefix removes every key matching prefix* — used to invalidate
	// catalogue caches when admin changes publish state (G5.3).
	DelPrefix(ctx context.Context, prefix string) error
	Incr(ctx context.Context, key string) (int64, error)
	Exists(ctx context.Context, key string) (bool, error)
}

type InMemoryCache struct {
	mu    sync.RWMutex
	store map[string]struct {
		val string
		exp time.Time
	}
}

func NewInMemoryCache() *InMemoryCache {
	return &InMemoryCache{store: make(map[string]struct {
		val string
		exp time.Time
	})}
}

func (c *InMemoryCache) Get(_ context.Context, key string) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	v, ok := c.store[key]
	if !ok {
		return "", nil
	}
	if !v.exp.IsZero() && time.Now().After(v.exp) {
		delete(c.store, key)
		return "", nil
	}
	return v.val, nil
}

func (c *InMemoryCache) Set(_ context.Context, key, value string, ttl time.Duration) error {
	exp := time.Time{}
	if ttl > 0 {
		exp = time.Now().Add(ttl)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.store[key] = struct {
		val string
		exp time.Time
	}{val: value, exp: exp}
	return nil
}

func (c *InMemoryCache) Del(_ context.Context, keys ...string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	for _, k := range keys {
		delete(c.store, k)
	}
	return nil
}

// DelPrefix — invalidate a cache namespace (dev parity with RedisCache).
func (c *InMemoryCache) DelPrefix(_ context.Context, prefix string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	for k := range c.store {
		if strings.HasPrefix(k, prefix) {
			delete(c.store, k)
		}
	}
	return nil
}

func (c *InMemoryCache) Incr(_ context.Context, key string) (int64, error) { return 1, nil }

func (c *InMemoryCache) Exists(_ context.Context, key string) (bool, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	_, ok := c.store[key]
	return ok, nil
}

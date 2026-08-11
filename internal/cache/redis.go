package cache

import (
	"context"
	"time"
)

// Minimal abstraction to allow swapping implementation
// Production should use go-redis, but interface kept simple for now

type Cache interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key, value string, ttl time.Duration) error
	Del(ctx context.Context, keys ...string) error
	Incr(ctx context.Context, key string) (int64, error)
	Exists(ctx context.Context, key string) (bool, error)
}

type InMemoryCache struct {
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
	c.store[key] = struct {
		val string
		exp time.Time
	}{val: value, exp: exp}
	return nil
}

func (c *InMemoryCache) Del(_ context.Context, keys ...string) error {
	for _, k := range keys {
		delete(c.store, k)
	}
	return nil
}

func (c *InMemoryCache) Incr(_ context.Context, key string) (int64, error) { return 1, nil }
func (c *InMemoryCache) Exists(_ context.Context, key string) (bool, error) {
	_, ok := c.store[key]
	return ok, nil
}

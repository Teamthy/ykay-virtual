package cache

import (
	"context"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisCache — production Cache implementation backed by go-redis.
// Used for: tutor search / subject / programme catalogue caches (60-300s TTL),
// sliding-window rate limiting (Incr + Expire), webhook idempotency guards.

type RedisCache struct {
	client *redis.Client
}

func NewRedis(redisURL string) (*RedisCache, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(opts)
	return &RedisCache{client: client}, nil
}

func (c *RedisCache) Ping(ctx context.Context) error {
	return c.client.Ping(ctx).Err()
}

func (c *RedisCache) Close() error { return c.client.Close() }

func (c *RedisCache) Get(ctx context.Context, key string) (string, error) {
	return c.client.Get(ctx, key).Result()
}

func (c *RedisCache) Set(ctx context.Context, key, value string, ttl time.Duration) error {
	return c.client.Set(ctx, key, value, ttl).Err()
}

func (c *RedisCache) Del(ctx context.Context, keys ...string) error {
	return c.client.Del(ctx, keys...).Err()
}

// DelPrefix removes every key matching prefix* via SCAN (safe for large
// key-spaces; used to invalidate tutor:search:* on writes).
func (c *RedisCache) DelPrefix(ctx context.Context, prefix string) error {
	var cursor uint64
	var keys []string
	for {
		var batch []string
		var err error
		batch, cursor, err = c.client.Scan(ctx, cursor, prefix+"*", 200).Result()
		if err != nil {
			return err
		}
		keys = append(keys, batch...)
		if cursor == 0 {
			break
		}
	}
	if len(keys) > 0 {
		return c.client.Del(ctx, keys...).Err()
	}
	return nil
}

func (c *RedisCache) Incr(ctx context.Context, key string) (int64, error) {
	return c.client.Incr(ctx, key).Result()
}

func (c *RedisCache) Exists(ctx context.Context, key string) (bool, error) {
	n, err := c.client.Exists(ctx, key).Result()
	return n > 0, err
}

// Key helpers — stable namespaced cache keys.
func CacheKey(parts ...string) string { return strings.Join(parts, ":") }

// Raw exposes the underlying client for infrastructure that needs it
// directly (distributed rate limiting, G7).
func (c *RedisCache) Raw() *redis.Client { return c.client }

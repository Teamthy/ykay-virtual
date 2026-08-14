package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

// TestRedisRateLimiterIntegration — runs only when a Redis server is
// reachable (REDIS_URL or localhost:6379); CI provides a redis service.
func TestRedisRateLimiterIntegration(t *testing.T) {
	url := os.Getenv("REDIS_URL")
	if url == "" {
		url = "redis://localhost:6379/0"
	}
	opts, err := goredis.ParseURL(url)
	if err != nil {
		t.Skipf("skip: bad REDIS_URL: %v", err)
	}
	client := goredis.NewClient(opts)
	pingCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(pingCtx).Err(); err != nil {
		t.Skipf("skip: redis unreachable at %s: %v", url, err)
	}
	defer client.Close()

	prefix := "rl:test:" + time.Now().Format("150405.000")
	limiter := NewRedisRateLimiter(client, 3, time.Minute, prefix)

	hit := func() int {
		rr := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		req.RemoteAddr = "10.0.0.99:1234"
		limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})).ServeHTTP(rr, req)
		return rr.Code
	}

	for i := 0; i < 3; i++ {
		if code := hit(); code != http.StatusOK {
			t.Fatalf("request %d within limit → %d, want 200", i+1, code)
		}
	}
	if code := hit(); code != http.StatusTooManyRequests {
		t.Fatalf("request over limit → %d, want 429", code)
	}

	// A different IP gets its own bucket.
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.RemoteAddr = "10.0.0.100:1234"
	limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})).ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("other IP must be unaffected → %d, want 200", rr.Code)
	}

	// Simulate the window expiring (go-redis floors sub-second TTLs at 1s,
	// so delete the bucket directly instead of waiting out a short TTL).
	if err := client.Del(context.Background(), limiter.key("10.0.0.99")).Err(); err != nil {
		t.Fatalf("del: %v", err)
	}
	if code := hit(); code != http.StatusOK {
		t.Fatalf("after window expiry → %d, want 200", code)
	}
}

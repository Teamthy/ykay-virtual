package worker

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// CronLock — Redis-backed leader election for in-process crons (A-09).
//
// Without a lock, scaling the worker to >1 replica double-runs every cron
// (payout processing, hold expiry, ranking recompute). With the lock, each
// tick is claimed by exactly one replica via SET NX; the TTL guarantees a
// crashed winner cannot deadlock the schedule. A nil client means
// single-instance dev mode (run unconditionally).
type CronLock struct {
	client *redis.Client
}

func NewCronLock(client *redis.Client) *CronLock {
	return &CronLock{client: client}
}

// TryLock attempts to claim the named cron for one tick. On success it
// returns a release func (call it after the cron body completes). ok=false
// means another replica holds the lock — skip this tick.
func (l *CronLock) TryLock(ctx context.Context, name string, ttl time.Duration) (release func(), ok bool) {
	if l == nil || l.client == nil {
		return func() {}, true
	}
	key := "nuvora:cron:lock:" + name
	got, err := l.client.SetNX(ctx, key, "1", ttl).Result()
	if err != nil || !got {
		return func() {}, false
	}
	return func() { _ = l.client.Del(context.Background(), key).Err() }, true
}

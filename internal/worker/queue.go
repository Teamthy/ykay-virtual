package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"ykay-virtual/internal/telemetry"
)

// Durable job queue (G3.1, remediation plan).
//
// Production: Redis-backed — jobs are LPUSHed to nuvora:jobs:ready and moved
// atomically (BRPOPLPUSH) to nuvora:jobs:processing while a handler runs.
// Failures are retried with exponential backoff up to MaxAttempts, then moved
// to nuvora:jobs:dead (the dead-letter list) for operator inspection/replay.
// Dev/tests: an in-memory queue with identical semantics.
//
// Handlers MUST be idempotent: delivery is at-least-once (a crash between
// handler success and LREM can redeliver the job).

const (
	keyReady      = "nuvora:jobs:ready"
	keyProcessing = "nuvora:jobs:processing"
	keyDelayed    = "nuvora:jobs:delayed" // ZSET score = run-at unix
	keyDead       = "nuvora:jobs:dead"

	DefaultMaxAttempts = 5

	// Metrics backend labels (internal/telemetry).
	backendRedis  = "redis"
	backendMemory = "memory"
)

// Handler processes one job. Return nil on success; any error triggers retry
// (with backoff) until the job's attempts are exhausted.
type Handler func(ctx context.Context, job Job) error

// Queue is the enqueue-side contract used by services.
type Queue interface {
	Enqueue(ctx context.Context, jobType JobType, payload any) (string, error)
	EnqueueIn(ctx context.Context, delay time.Duration, jobType JobType, payload any) (string, error)
}

// backoff returns the delay before attempt n (1-based) is retried.
func backoff(attempt int) time.Duration {
	d := time.Duration(1<<uint(attempt)) * time.Second // 2s, 4s, 8s, 16s…
	if d > 5*time.Minute {
		d = 5 * time.Minute
	}
	return d
}

func marshalJob(job Job) []byte {
	b, _ := json.Marshal(job)
	return b
}

func newJob(jobType JobType, payload any) (Job, error) {
	var raw []byte
	var err error
	if payload != nil {
		raw, err = json.Marshal(payload)
		if err != nil {
			return Job{}, fmt.Errorf("marshal payload: %w", err)
		}
	}
	return Job{ID: uuid.NewString(), Type: jobType, Payload: raw, MaxAttempts: DefaultMaxAttempts}, nil
}

// ---------------------------------------------------------------- Redis ----

type RedisQueue struct {
	client   *redis.Client
	handlers map[JobType]Handler
	mu       sync.RWMutex
}

func NewRedisQueue(client *redis.Client) *RedisQueue {
	return &RedisQueue{client: client, handlers: map[JobType]Handler{}}
}

func (q *RedisQueue) Register(jobType JobType, h Handler) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.handlers[jobType] = h
}

func (q *RedisQueue) Enqueue(ctx context.Context, jobType JobType, payload any) (string, error) {
	job, err := newJob(jobType, payload)
	if err != nil {
		return "", err
	}
	if err := q.client.LPush(ctx, keyReady, marshalJob(job)).Err(); err != nil {
		return "", fmt.Errorf("enqueue %s: %w", jobType, err)
	}
	telemetry.JobEnqueued(string(jobType), backendRedis)
	q.refreshDepth(ctx)
	return job.ID, nil
}

func (q *RedisQueue) EnqueueIn(ctx context.Context, delay time.Duration, jobType JobType, payload any) (string, error) {
	job, err := newJob(jobType, payload)
	if err != nil {
		return "", err
	}
	score := float64(time.Now().Add(delay).Unix())
	if err := q.client.ZAdd(ctx, keyDelayed, redis.Z{Score: score, Member: marshalJob(job)}).Err(); err != nil {
		return "", fmt.Errorf("enqueue delayed %s: %w", jobType, err)
	}
	telemetry.JobEnqueued(string(jobType), backendRedis)
	q.refreshDepth(ctx)
	return job.ID, nil
}

// refreshDepth mirrors the four queue states into Prometheus gauges so
// backlog/dead-letter alerts can fire (G3.3). All calls are O(1) Redis ops.
func (q *RedisQueue) refreshDepth(ctx context.Context) {
	if ready, err := q.client.LLen(ctx, keyReady).Result(); err == nil {
		telemetry.SetQueueDepth(backendRedis, "ready", float64(ready))
	}
	if processing, err := q.client.LLen(ctx, keyProcessing).Result(); err == nil {
		telemetry.SetQueueDepth(backendRedis, "processing", float64(processing))
	}
	if delayed, err := q.client.ZCard(ctx, keyDelayed).Result(); err == nil {
		telemetry.SetQueueDepth(backendRedis, "delayed", float64(delayed))
	}
	if dead, err := q.client.LLen(ctx, keyDead).Result(); err == nil {
		telemetry.SetQueueDepth(backendRedis, "dead", float64(dead))
	}
}

// Run consumes jobs until ctx is cancelled. Call in a goroutine per worker.
func (q *RedisQueue) Run(ctx context.Context) {
	// promote due delayed jobs every second
	go q.promoteLoop(ctx)
	for {
		if ctx.Err() != nil {
			return
		}
		raw, err := q.client.BRPopLPush(ctx, keyReady, keyProcessing, 2*time.Second).Result()
		if err != nil {
			if errors.Is(err, redis.Nil) || ctx.Err() != nil {
				continue
			}
			slog.Error("worker: BRPOPLPUSH error", "error", err)
			time.Sleep(time.Second)
			continue
		}
		q.process(ctx, raw)
	}
}

func (q *RedisQueue) promoteLoop(ctx context.Context) {
	t := time.NewTicker(time.Second)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			now := fmt.Sprintf("%d", time.Now().Unix())
			members, err := q.client.ZRangeByScore(ctx, keyDelayed, &redis.ZRangeBy{Min: "-inf", Max: now}).Result()
			if err != nil || len(members) == 0 {
				continue
			}
			for _, m := range members {
				pipe := q.client.TxPipeline()
				pipe.ZRem(ctx, keyDelayed, m)
				pipe.LPush(ctx, keyReady, m)
				_, _ = pipe.Exec(ctx)
			}
			q.refreshDepth(ctx)
		}
	}
}

func (q *RedisQueue) process(ctx context.Context, raw string) {
	defer func() {
		q.client.LRem(ctx, keyProcessing, 1, raw)
		q.refreshDepth(ctx)
	}()

	var job Job
	if err := json.Unmarshal([]byte(raw), &job); err != nil {
		slog.Warn("worker: malformed job dropped", "error", err)
		telemetry.JobDropped("malformed", backendRedis)
		q.client.LPush(ctx, keyDead, raw)
		return
	}

	q.mu.RLock()
	handler, ok := q.handlers[job.Type]
	q.mu.RUnlock()
	if !ok {
		slog.Warn("worker: no handler for job — dead-lettered", "type", string(job.Type))
		telemetry.JobDropped(string(job.Type), backendRedis)
		q.client.LPush(ctx, keyDead, raw)
		return
	}

	job.Attempts++
	if err := handler(ctx, job); err != nil {
		if job.MaxAttempts == 0 {
			job.MaxAttempts = DefaultMaxAttempts
		}
		if job.Attempts >= job.MaxAttempts {
			job.LastError = err.Error()
			q.client.LPush(ctx, keyDead, marshalJob(job))
			telemetry.JobDeadLettered(string(job.Type), backendRedis)
			slog.Error("worker: job dead-lettered", "job_id", job.ID, "type", string(job.Type), "attempts", job.Attempts, "error", err)
			return
		}
		job.LastError = err.Error()
		delay := backoff(job.Attempts)
		score := float64(time.Now().Add(delay).Unix())
		q.client.ZAdd(ctx, keyDelayed, redis.Z{Score: score, Member: marshalJob(job)})
		telemetry.JobRetried(string(job.Type), backendRedis)
		slog.Warn("worker: job retry", "job_id", job.ID, "type", string(job.Type), "attempt", job.Attempts, "retry_in", delay.String(), "error", err)
		return
	}
	telemetry.JobCompleted(string(job.Type), backendRedis)
}

// DeadLetters returns up to n dead jobs (operator inspection).
func (q *RedisQueue) DeadLetters(ctx context.Context, n int64) ([]Job, error) {
	raws, err := q.client.LRange(ctx, keyDead, 0, n-1).Result()
	if err != nil {
		return nil, err
	}
	out := make([]Job, 0, len(raws))
	for _, r := range raws {
		var j Job
		if json.Unmarshal([]byte(r), &j) == nil {
			out = append(out, j)
		}
	}
	return out, nil
}

// ------------------------------------------------------------- In-memory ----

// MemoryQueue — dev/test implementation with the same retry/DLQ semantics.
type MemoryQueue struct {
	mu        sync.Mutex
	handlers  map[JobType]Handler
	dead      []Job
	wg        sync.WaitGroup
	backoffFn func(int) time.Duration

	// Depth tracking (mirrors Redis list sizes) for queue gauges.
	ready, processing, delayed, deadN int
}

func NewMemoryQueue() *MemoryQueue {
	return &MemoryQueue{handlers: map[JobType]Handler{}, backoffFn: backoff}
}

func (q *MemoryQueue) refreshDepth() {
	telemetry.SetQueueDepth(backendMemory, "ready", float64(q.ready))
	telemetry.SetQueueDepth(backendMemory, "processing", float64(q.processing))
	telemetry.SetQueueDepth(backendMemory, "delayed", float64(q.delayed))
	telemetry.SetQueueDepth(backendMemory, "dead", float64(q.deadN))
}

func (q *MemoryQueue) Register(jobType JobType, h Handler) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.handlers[jobType] = h
}

func (q *MemoryQueue) Enqueue(ctx context.Context, jobType JobType, payload any) (string, error) {
	return q.EnqueueIn(ctx, 0, jobType, payload)
}

func (q *MemoryQueue) EnqueueIn(ctx context.Context, delay time.Duration, jobType JobType, payload any) (string, error) {
	job, err := newJob(jobType, payload)
	if err != nil {
		return "", err
	}
	telemetry.JobEnqueued(string(jobType), backendMemory)
	q.mu.Lock()
	if delay > 0 {
		q.delayed++
	} else {
		q.ready++
	}
	q.mu.Unlock()
	q.refreshDepth()
	q.wg.Add(1)
	go func() {
		defer q.wg.Done()
		if delay > 0 {
			select {
			case <-ctx.Done():
				q.mu.Lock()
				q.delayed--
				q.mu.Unlock()
				q.refreshDepth()
				return
			case <-time.After(delay):
			}
		}
		q.run(ctx, job, delay > 0)
	}()
	return job.ID, nil
}

func (q *MemoryQueue) run(ctx context.Context, job Job, wasDelayed bool) {
	q.mu.Lock()
	if wasDelayed {
		q.delayed--
	} else {
		q.ready--
	}
	q.processing++
	q.mu.Unlock()
	q.refreshDepth()

	defer func() {
		q.mu.Lock()
		q.processing--
		q.mu.Unlock()
		q.refreshDepth()
	}()

	q.mu.Lock()
	handler, ok := q.handlers[job.Type]
	q.mu.Unlock()
	if !ok {
		q.mu.Lock()
		q.dead = append(q.dead, job)
		q.deadN++
		q.mu.Unlock()
		q.refreshDepth()
		telemetry.JobDropped(string(job.Type), backendMemory)
		return
	}
	for {
		job.Attempts++
		err := handler(ctx, job)
		if err == nil {
			telemetry.JobCompleted(string(job.Type), backendMemory)
			return
		}
		job.LastError = err.Error()
		if job.Attempts >= job.MaxAttempts {
			q.mu.Lock()
			q.dead = append(q.dead, job)
			q.deadN++
			q.mu.Unlock()
			q.refreshDepth()
			telemetry.JobDeadLettered(string(job.Type), backendMemory)
			return
		}
		// The job stays in-flight (processing) across the backoff sleep,
		// mirroring the Redis model where it is re-promoted from delayed.
		telemetry.JobRetried(string(job.Type), backendMemory)
		select {
		case <-ctx.Done():
			return
		case <-time.After(q.backoffFn(job.Attempts)):
		}
	}
}

// Wait blocks until all in-flight jobs settle (tests).
func (q *MemoryQueue) Wait() { q.wg.Wait() }

// DeadLetters returns dead jobs (tests/inspection).
func (q *MemoryQueue) DeadLetters() []Job {
	q.mu.Lock()
	defer q.mu.Unlock()
	out := make([]Job, len(q.dead))
	copy(out, q.dead)
	return out
}

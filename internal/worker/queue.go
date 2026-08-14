package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
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
	return job.ID, nil
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
			log.Printf("worker: BRPOPLPUSH error: %v", err)
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
		}
	}
}

func (q *RedisQueue) process(ctx context.Context, raw string) {
	defer q.client.LRem(ctx, keyProcessing, 1, raw)

	var job Job
	if err := json.Unmarshal([]byte(raw), &job); err != nil {
		log.Printf("worker: malformed job dropped: %v", err)
		q.client.LPush(ctx, keyDead, raw)
		return
	}

	q.mu.RLock()
	handler, ok := q.handlers[job.Type]
	q.mu.RUnlock()
	if !ok {
		log.Printf("worker: no handler for %s — dead-lettered", job.Type)
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
			log.Printf("worker: job %s (%s) dead after %d attempts: %v", job.ID, job.Type, job.Attempts, err)
			return
		}
		job.LastError = err.Error()
		delay := backoff(job.Attempts)
		score := float64(time.Now().Add(delay).Unix())
		q.client.ZAdd(ctx, keyDelayed, redis.Z{Score: score, Member: marshalJob(job)})
		log.Printf("worker: job %s (%s) attempt %d failed, retry in %s: %v", job.ID, job.Type, job.Attempts, delay, err)
		return
	}
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
}

func NewMemoryQueue() *MemoryQueue {
	return &MemoryQueue{handlers: map[JobType]Handler{}, backoffFn: backoff}
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
	q.wg.Add(1)
	go func() {
		defer q.wg.Done()
		if delay > 0 {
			select {
			case <-ctx.Done():
				return
			case <-time.After(delay):
			}
		}
		q.run(ctx, job)
	}()
	return job.ID, nil
}

func (q *MemoryQueue) run(ctx context.Context, job Job) {
	q.mu.Lock()
	handler, ok := q.handlers[job.Type]
	q.mu.Unlock()
	if !ok {
		q.mu.Lock()
		q.dead = append(q.dead, job)
		q.mu.Unlock()
		return
	}
	for {
		job.Attempts++
		err := handler(ctx, job)
		if err == nil {
			return
		}
		job.LastError = err.Error()
		if job.Attempts >= job.MaxAttempts {
			q.mu.Lock()
			q.dead = append(q.dead, job)
			q.mu.Unlock()
			return
		}
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

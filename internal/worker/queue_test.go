package worker

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"

	"ykay-virtual/internal/telemetry"
)

// The durable-queue semantics (G3.1): success path, retry-with-backoff and
// dead-letter exhaustion — verified on the in-memory implementation which
// mirrors the Redis one.

func TestMemoryQueue_SuccessfulJobRuns(t *testing.T) {
	q := NewMemoryQueue()
	var ran atomic.Int32
	q.Register(JobSendEmail, func(ctx context.Context, job Job) error {
		ran.Add(1)
		return nil
	})
	if _, err := q.Enqueue(context.Background(), JobSendEmail, map[string]string{"to": "a@b.c"}); err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	q.Wait()
	if ran.Load() != 1 {
		t.Fatalf("expected 1 run, got %d", ran.Load())
	}
	if len(q.DeadLetters()) != 0 {
		t.Fatalf("expected no dead letters")
	}
}

func TestMemoryQueue_RetriesThenSucceeds(t *testing.T) {
	q := NewMemoryQueue()
	q.backoffFn = func(int) time.Duration { return time.Millisecond }
	var attempts atomic.Int32
	q.Register(JobSendPush, func(ctx context.Context, job Job) error {
		if attempts.Add(1) < 2 {
			return errors.New("transient failure")
		}
		return nil
	})
	if _, err := q.Enqueue(context.Background(), JobSendPush, nil); err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	q.Wait()
	if attempts.Load() != 2 {
		t.Fatalf("expected 2 attempts, got %d", attempts.Load())
	}
	if len(q.DeadLetters()) != 0 {
		t.Fatalf("job should have recovered, dead letters: %v", q.DeadLetters())
	}
}

func TestMemoryQueue_DeadLetterAfterMaxAttempts(t *testing.T) {
	q := NewMemoryQueue()
	q.backoffFn = func(int) time.Duration { return time.Millisecond }
	var attempts atomic.Int32
	q.Register(JobSendSMS, func(ctx context.Context, job Job) error {
		attempts.Add(1)
		return errors.New("permanent failure")
	})
	id, err := q.Enqueue(context.Background(), JobSendSMS, nil)
	if err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	done := make(chan struct{})
	go func() { q.Wait(); close(done) }()
	select {
	case <-done:
	case <-time.After(3 * time.Minute):
		t.Fatal("queue did not settle")
	}
	dead := q.DeadLetters()
	if len(dead) != 1 {
		t.Fatalf("expected 1 dead letter, got %d", len(dead))
	}
	if dead[0].ID != id {
		t.Fatalf("dead letter id mismatch")
	}
	if int(attempts.Load()) != DefaultMaxAttempts {
		t.Fatalf("expected %d attempts, got %d", DefaultMaxAttempts, attempts.Load())
	}
	if dead[0].LastError == "" {
		t.Fatal("dead letter should record the last error")
	}
}

func TestMemoryQueue_UnknownTypeDeadLetters(t *testing.T) {
	q := NewMemoryQueue()
	if _, err := q.Enqueue(context.Background(), JobType("nonexistent"), nil); err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	q.Wait()
	if len(q.DeadLetters()) != 1 {
		t.Fatalf("unknown job type must dead-letter")
	}
}

func TestBackoffCapped(t *testing.T) {
	if backoff(1) != 2*time.Second {
		t.Fatalf("attempt 1 backoff = %s", backoff(1))
	}
	if backoff(30) != 5*time.Minute {
		t.Fatalf("backoff must cap at 5m, got %s", backoff(30))
	}
}

// TestMemoryQueue_Metrics — G3.3: the queue path must emit job counters and
// depth gauges so backlog/dead-letter alerts have data to fire on.
func TestMemoryQueue_Metrics(t *testing.T) {
	m := telemetry.NewMetrics(prometheus.NewRegistry())
	restore := telemetry.SetMetrics(m)
	defer restore()

	q := NewMemoryQueue()
	q.backoffFn = func(int) time.Duration { return time.Millisecond }
	okCalls := 0
	q.Register(JobSendEmail, func(ctx context.Context, job Job) error {
		okCalls++
		return nil
	})
	if _, err := q.Enqueue(context.Background(), JobSendEmail, nil); err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	q.Wait()

	if got := testutil.ToFloat64(m.JobsEnqueuedTotal.WithLabelValues("send_email", "memory")); got != 1 {
		t.Errorf("enqueued = %v, want 1", got)
	}
	if got := testutil.ToFloat64(m.JobsCompletedTotal.WithLabelValues("send_email", "memory")); got != 1 {
		t.Errorf("completed = %v, want 1", got)
	}
	if got := testutil.ToFloat64(m.QueueDepth.WithLabelValues("memory", "ready")); got != 0 {
		t.Errorf("ready depth = %v, want 0 after drain", got)
	}
	if got := testutil.ToFloat64(m.QueueDepth.WithLabelValues("memory", "processing")); got != 0 {
		t.Errorf("processing depth = %v, want 0 after drain", got)
	}
	if okCalls != 1 {
		t.Fatalf("handler ran %d times, want 1", okCalls)
	}

	// A failing job → dead-letter counters + depth.
	q2 := NewMemoryQueue()
	q2.backoffFn = func(int) time.Duration { return time.Millisecond }
	q2.Register(JobSendSMS, func(ctx context.Context, job Job) error { return errors.New("boom") })
	if _, err := q2.Enqueue(context.Background(), JobSendSMS, nil); err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	q2.Wait()
	if got := testutil.ToFloat64(m.JobsDeadLetteredTotal.WithLabelValues("send_sms", "memory")); got != 1 {
		t.Errorf("dead-lettered = %v, want 1", got)
	}
	if got := testutil.ToFloat64(m.QueueDepth.WithLabelValues("memory", "dead")); got != 1 {
		t.Errorf("dead depth = %v, want 1", got)
	}
}

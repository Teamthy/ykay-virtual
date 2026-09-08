package migrations

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"io"
	"sync"
	"testing"
	"time"
)

// These tests cover the concurrency guard added for MIGRATE_ON_BOOT: every
// replica applies the chain at startup, and without a lock they all read
// schema_migrations, all see the same version pending, and all execute the same
// DDL. The losers die at boot with "relation already exists".
//
// pg_advisory_lock is server-side, so the ordering below is verified against a
// recording driver shim rather than a live Postgres. That proves the CALL
// SEQUENCE — lock acquired before the applied-versions read, released after,
// on one dedicated connection. It does NOT prove Postgres's own locking
// semantics; a live-DB check is still worth adding to CI before
// MIGRATE_ON_BOOT runs on more than one replica.

// ── Recording driver shim ───────────────────────────────────────────────────

type recStmt struct {
	rec *recorder
	q   string
}

func (s *recStmt) Close() error  { return nil }
func (s *recStmt) NumInput() int { return -1 }

func (s *recStmt) Exec(args []driver.Value) (driver.Result, error) {
	if err := s.rec.exec(s.q); err != nil {
		return nil, err
	}
	return driver.RowsAffected(1), nil
}

func (s *recStmt) Query(args []driver.Value) (driver.Rows, error) {
	if err := s.rec.exec(s.q); err != nil {
		return nil, err
	}
	// Return a single applied version so ApplyUp proceeds past
	// appliedVersions(). We only assert on what ran before the per-file loop.
	return &oneRow{v: 1}, nil
}

type oneRow struct {
	done bool
	v    int64
}

func (r *oneRow) Columns() []string { return []string{"version"} }
func (r *oneRow) Close() error      { return nil }
func (r *oneRow) Next(dest []driver.Value) error {
	if r.done {
		return io.EOF
	}
	r.done = true
	dest[0] = r.v
	return nil
}

type recConn struct{ rec *recorder }

func (c *recConn) Prepare(q string) (driver.Stmt, error) { return &recStmt{rec: c.rec, q: q}, nil }
func (c *recConn) Close() error                          { return nil }
func (c *recConn) Begin() (driver.Tx, error)             { return recTx{}, nil }

type recTx struct{}

func (recTx) Commit() error   { return nil }
func (recTx) Rollback() error { return nil }

type recorder struct {
	mu         sync.Mutex
	statements []string
	held       bool
	failNext   map[string]bool
}

func newRecorder() *recorder {
	return &recorder{failNext: map[string]bool{}}
}

// exec tracks the advisory-lock state machine and applies injected failures.
func (r *recorder) exec(q string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.failNext[q] {
		return errors.New("injected failure: " + q)
	}
	switch q {
	case "SELECT pg_advisory_lock($1)":
		if r.held {
			return errors.New("advisory lock already held")
		}
		r.held = true
	case "SELECT pg_advisory_unlock($1)":
		if !r.held {
			return errors.New("advisory lock not held")
		}
		r.held = false
	}
	r.statements = append(r.statements, q)
	return nil
}

func (r *recorder) record(q string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.statements = append(r.statements, q)
}

func (r *recorder) list() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]string, len(r.statements))
	copy(out, r.statements)
	return out
}

func (r *recorder) injectFailure(q string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.failNext[q] = true
}

type recDriver struct{ rec *recorder }

func (d *recDriver) Open(string) (driver.Conn, error) { return &recConn{rec: d.rec}, nil }

func newRecorderDB(t *testing.T) (*recorder, *sql.DB) {
	t.Helper()
	rec := newRecorder()
	name := fmt.Sprintf("recdrv-%p", rec)
	sql.Register(name, &recDriver{rec: rec})
	db, err := sql.Open(name, "")
	if err != nil {
		t.Fatalf("sql.Open: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return rec, db
}

func indexOf(haystack []string, needle string) int {
	for i, s := range haystack {
		if s == needle {
			return i
		}
	}
	return -1
}

// ── Tests ───────────────────────────────────────────────────────────────────

func TestApplyUpAcquiresAdvisoryLockBeforeReadingAppliedVersions(t *testing.T) {
	rec, db := newRecorderDB(t)

	if _, err := ApplyUp(db); err != nil {
		t.Fatalf("ApplyUp: %v", err)
	}

	stmts := rec.list()

	lockIdx := indexOf(stmts, "SELECT pg_advisory_lock($1)")
	if lockIdx < 0 {
		t.Fatalf("ApplyUp never took the advisory lock; statements:\n%v", stmts)
	}
	appliedIdx := indexOf(stmts, "SELECT version FROM schema_migrations")
	if appliedIdx < 0 {
		t.Fatalf("ApplyUp never read applied versions; statements:\n%v", stmts)
	}
	if lockIdx > appliedIdx {
		t.Fatalf("advisory lock taken at %d, AFTER the applied-versions read at %d — "+
			"a second runner would act on a stale snapshot", lockIdx, appliedIdx)
	}

	unlockIdx := indexOf(stmts, "SELECT pg_advisory_unlock($1)")
	if unlockIdx < 0 {
		t.Fatalf("ApplyUp never released the advisory lock; statements:\n%v", stmts)
	}
	if unlockIdx < appliedIdx {
		t.Fatalf("lock released at %d, before the work at %d", unlockIdx, appliedIdx)
	}
}

// TestApplyUpReturnsTheDedicatedConnectionToThePool proves Unlock gives the
// connection back rather than leaking it. With MaxOpenConns(1), a leaked
// Conn makes every later query block until the context deadline, so this fails
// loudly instead of silently draining the pool in production.
//
// (Asserting on the driver's Close() would not work: database/sql keeps idle
// connections alive for reuse, so Conn.Close() need not call through to it.)
func TestApplyUpReturnsTheDedicatedConnectionToThePool(t *testing.T) {
	_, db := newRecorderDB(t)
	db.SetMaxOpenConns(1)

	if _, err := ApplyUp(db); err != nil {
		t.Fatalf("ApplyUp: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	conn, err := db.Conn(ctx)
	if err != nil {
		t.Fatalf("could not obtain the single pooled connection after ApplyUp: %v "+
			"(ApplyUp leaked its dedicated connection)", err)
	}
	defer conn.Close()

	if _, err := conn.ExecContext(ctx, "SELECT 1"); err != nil {
		t.Fatalf("query on the reclaimed connection: %v", err)
	}
}

func TestAdvisoryLockKeyIsStableAndShared(t *testing.T) {
	// cmd/migrate and ApplyUp contend on this one constant. Changing it splits
	// them into two mutually-unaware lock domains, which is worse than no lock
	// at all because it still looks safe. Pin it so any change is deliberate.
	if AdvisoryLockKey != 742_001_001 {
		t.Fatalf("AdvisoryLockKey changed to %d; cmd/migrate and ApplyUp must share one key", AdvisoryLockKey)
	}
}

func TestUnlockOnNilLockIsSafe(t *testing.T) {
	// Error paths defer Unlock unconditionally; a nil receiver must not panic.
	var l *AdvisoryLock
	if err := l.Unlock(context.Background()); err != nil {
		t.Fatalf("nil Unlock returned %v, want nil", err)
	}
}

func TestUnlockIsIdempotent(t *testing.T) {
	rec, db := newRecorderDB(t)
	ctx := context.Background()

	lock, err := AcquireAdvisoryLock(ctx, db)
	if err != nil {
		t.Fatalf("AcquireAdvisoryLock: %v", err)
	}
	if err := lock.Unlock(ctx); err != nil {
		t.Fatalf("first Unlock: %v", err)
	}
	// A double Unlock (explicit + deferred) must not issue a second unlock.
	if err := lock.Unlock(ctx); err != nil {
		t.Fatalf("second Unlock: %v", err)
	}

	count := 0
	for _, s := range rec.list() {
		if s == "SELECT pg_advisory_unlock($1)" {
			count++
		}
	}
	if count != 1 {
		t.Fatalf("pg_advisory_unlock issued %d times, want exactly 1", count)
	}
}

func TestAcquireAdvisoryLockPropagatesFailure(t *testing.T) {
	rec, db := newRecorderDB(t)
	rec.injectFailure("SELECT pg_advisory_lock($1)")

	if _, err := AcquireAdvisoryLock(context.Background(), db); err == nil {
		t.Fatal("AcquireAdvisoryLock succeeded despite an injected failure")
	}
	if indexOf(rec.list(), "SELECT version FROM schema_migrations") >= 0 {
		t.Fatal("read applied versions without holding the lock")
	}
}

func TestApplyUpDoesNotMigrateWhenItCannotTakeTheLock(t *testing.T) {
	rec, db := newRecorderDB(t)
	rec.injectFailure("SELECT pg_advisory_lock($1)")

	if _, err := ApplyUp(db); err == nil {
		t.Fatal("ApplyUp succeeded without the advisory lock")
	}
	// The whole point of the guard: no DDL, no version bookkeeping.
	if indexOf(rec.list(), "SELECT version FROM schema_migrations") >= 0 {
		t.Fatal("ApplyUp read applied versions without holding the lock")
	}
	if indexOf(rec.list(), "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)") >= 0 {
		t.Fatal("ApplyUp recorded a migration without holding the lock")
	}
}

// Package migrations embeds the numbered SQL migration chain into the
// binaries that apply it. The release image is a scratch container with no
// filesystem besides the binaries, so cmd/migrate and the API's
// MIGRATE_ON_BOOT path must not depend on ./migrations being present.
package migrations

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"log/slog"
	"sort"
	"strconv"
	"strings"
)

//go:embed *.up.sql *.down.sql
var fs embed.FS

// AdvisoryLockKey is the Postgres advisory-lock key that serialises every
// migration runner against every other one. It is a fixed constant rather than
// a hash of anything environment-specific, so that a boot-time migrate, a
// `cmd/migrate` run, and a second replica all contend on the SAME key.
//
// Arbitrary but stable. Do not change it: two different keys means two runners
// that believe they are mutually exclusive but are not.
const AdvisoryLockKey int64 = 742_001_001

// AdvisoryLock serialises migration runs across processes.
//
// Why this exists: MIGRATE_ON_BOOT=true makes every API replica apply the
// chain at startup. Without a lock, N replicas read schema_migrations
// concurrently, all see version K as pending, and all try to execute the same
// DDL. Postgres rejects duplicate CREATE TABLE, so the losers die at boot —
// and in a rolling deploy that is exactly the moment you cannot afford a
// crash loop.
//
// The lock is session-scoped, so it MUST be held on one dedicated connection:
// pg_advisory_lock taken on one pooled connection and released on another
// would silently no-op and leak the lock until that backend exits. Unlock
// takes *sql.Conn, not *sql.DB, so the compiler enforces that.
type AdvisoryLock struct {
	conn *sql.Conn
}

// AcquireAdvisoryLock blocks until this process is the only one migrating.
// Callers MUST call Unlock, including on every error path.
func AcquireAdvisoryLock(ctx context.Context, db *sql.DB) (*AdvisoryLock, error) {
	conn, err := db.Conn(ctx)
	if err != nil {
		return nil, fmt.Errorf("acquire connection for migration lock: %w", err)
	}
	if _, err := conn.ExecContext(ctx, "SELECT pg_advisory_lock($1)", AdvisoryLockKey); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("pg_advisory_lock(%d): %w", AdvisoryLockKey, err)
	}
	return &AdvisoryLock{conn: conn}, nil
}

// Unlock releases the advisory lock and returns the connection to the pool.
// Safe to call on a nil lock so error paths can defer it unconditionally.
func (l *AdvisoryLock) Unlock(ctx context.Context) error {
	if l == nil || l.conn == nil {
		return nil
	}
	conn := l.conn
	l.conn = nil
	// Release before returning the connection: a session lock survives on the
	// pooled backend otherwise, deadlocking the next runner that draws it.
	_, err := conn.ExecContext(ctx, "SELECT pg_advisory_unlock($1)", AdvisoryLockKey)
	closeErr := conn.Close()
	if err != nil {
		return fmt.Errorf("pg_advisory_unlock(%d): %w", AdvisoryLockKey, err)
	}
	return closeErr
}

// File is one numbered migration file.
type File struct {
	Name    string
	Version int
	SQL     string
	Up      bool // true: .up.sql, false: .down.sql
}

// Files returns every embedded migration file, ordered by version.
func Files() ([]File, error) {
	entries, err := fs.ReadDir(".")
	if err != nil {
		return nil, fmt.Errorf("read embedded migrations: %w", err)
	}
	out := make([]File, 0, len(entries))
	for _, e := range entries {
		name := e.Name()
		if !strings.HasSuffix(name, ".sql") {
			continue
		}
		parts := strings.SplitN(name, "_", 2)
		if len(parts) != 2 {
			continue
		}
		version, err := strconv.Atoi(parts[0])
		if err != nil {
			continue
		}
		content, err := fs.ReadFile(name)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", name, err)
		}
		out = append(out, File{
			Name:    name,
			Version: version,
			SQL:     string(content),
			Up:      strings.HasSuffix(name, ".up.sql"),
		})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Version != out[j].Version {
			return out[i].Version < out[j].Version
		}
		// deterministic within a version: up before down
		return out[i].Up && !out[j].Up
	})
	return out, nil
}

// Validate checks a migration chain for the two conditions that have broken
// real deployments:
//
//  1. Duplicate version numbers — two files numbered the same (e.g. two
//     `000044_*.sql`). The loader silently lets one win, so the "losing"
//     migration is never applied and the DB drifts from the repo.
//  2. Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) — injected by a
//     botched `git apply --3way`. Such SQL is invalid (or worse, runs the
//     wrong branch) and must never reach a live database.
//
// Returns an error describing the first violation so migrate runs and
// boot-time migration fail fast instead of silently corrupting the schema.
func Validate(files []File) error {
	upSeen := map[int]string{}
	downSeen := map[int]string{}
	for _, f := range files {
		seen := downSeen
		if f.Up {
			seen = upSeen
		}
		if prev, dup := seen[f.Version]; dup {
			return fmt.Errorf("migration chain: duplicate version %06d (%s and %s); rename one file to a unique number", f.Version, prev, f.Name)
		}
		seen[f.Version] = f.Name
		if s := f.SQL; strings.Contains(s, "<<<<<<<") || strings.Contains(s, ">>>>>>>") || strings.Contains(s, "\n=======\n") {
			return fmt.Errorf("migration %s: contains git conflict markers; resolve the merge before deploying", f.Name)
		}
	}
	return nil
}

// EnsureTable creates the schema_migrations bookkeeping table
// (identical shape to cmd/migrate).
func EnsureTable(db *sql.DB) error {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version BIGINT PRIMARY KEY,
		name TEXT NOT NULL,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`)
	return err
}

// appliedVersions returns the set of already-applied migration versions.
func appliedVersions(db *sql.DB) (map[int]bool, error) {
	rows, err := db.Query("SELECT version FROM schema_migrations")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int]bool{}
	for rows.Next() {
		var v int
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		out[v] = true
	}
	return out, rows.Err()
}

// ApplyUp applies every pending *.up.sql migration, each inside its own
// transaction, and records the version — mirroring cmd/migrate --cmd=up so
// local and production runs stay identical. Returns the number applied.
//
// Concurrency: the run holds a session advisory lock so replicas booting with
// MIGRATE_ON_BOOT=true queue behind each other instead of racing the same DDL.
//
// Every statement — the lock, schema_migrations, and each migration
// transaction — runs on the SAME single connection. This matters twice over:
//
//  1. A session advisory lock is per-backend, so releasing it requires the
//     connection it was taken on. Splitting the work across pooled
//     connections would risk unlocking on a different backend.
//  2. Holding a pooled connection for the duration while the migrations
//     themselves draw from the same pool deadlocks when the pool is small.
//     Reusing one connection needs exactly one slot, so ApplyUp works even at
//     MaxOpenConns(1).
//
// The applied-versions read happens INSIDE the lock: reading it beforehand
// would let a second runner act on a stale snapshot and re-apply what the
// first one just committed.
func ApplyUp(db *sql.DB) (int, error) {
	ctx := context.Background()

	conn, err := db.Conn(ctx)
	if err != nil {
		return 0, fmt.Errorf("acquire connection for migration lock: %w", err)
	}
	lock := &AdvisoryLock{conn: conn}
	defer func() {
		if unlockErr := lock.Unlock(ctx); unlockErr != nil {
			slog.Warn("migrate: failed to release advisory lock", "error", unlockErr)
		}
	}()

	if _, err := conn.ExecContext(ctx, "SELECT pg_advisory_lock($1)", AdvisoryLockKey); err != nil {
		return 0, fmt.Errorf("pg_advisory_lock(%d): %w", AdvisoryLockKey, err)
	}

	if _, err := conn.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version BIGINT PRIMARY KEY,
		name TEXT NOT NULL,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`); err != nil {
		return 0, fmt.Errorf("ensure schema_migrations: %w", err)
	}

	applied, err := appliedVersionsConn(ctx, conn)
	if err != nil {
		return 0, fmt.Errorf("query schema_migrations: %w", err)
	}
	files, err := Files()
	if err != nil {
		return 0, err
	}
	if err := Validate(files); err != nil {
		return 0, err
	}
	n := 0
	for _, f := range files {
		if !f.Up || applied[f.Version] {
			continue
		}
		tx, err := conn.BeginTx(ctx, nil)
		if err != nil {
			return n, fmt.Errorf("begin tx: %w", err)
		}
		if _, err := tx.ExecContext(ctx, f.SQL); err != nil {
			_ = tx.Rollback()
			return n, fmt.Errorf("apply %s: %w", f.Name, err)
		}
		if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)", f.Version, f.Name); err != nil {
			_ = tx.Rollback()
			return n, fmt.Errorf("record %06d: %w", f.Version, err)
		}
		if err := tx.Commit(); err != nil {
			return n, fmt.Errorf("commit %06d: %w", f.Version, err)
		}
		slog.Info("migrate: applied", "version", f.Version, "name", f.Name)
		n++
	}
	return n, nil
}

// appliedVersionsConn is appliedVersions bound to one connection, so the read
// happens on the backend that holds the advisory lock.
func appliedVersionsConn(ctx context.Context, conn *sql.Conn) (map[int]bool, error) {
	rows, err := conn.QueryContext(ctx, "SELECT version FROM schema_migrations")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int]bool{}
	for rows.Next() {
		var v int
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		out[v] = true
	}
	return out, rows.Err()
}

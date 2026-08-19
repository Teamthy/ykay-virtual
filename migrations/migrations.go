// Package migrations embeds the numbered SQL migration chain into the
// binaries that apply it. The release image is a scratch container with no
// filesystem besides the binaries, so cmd/migrate and the API's
// MIGRATE_ON_BOOT path must not depend on ./migrations being present.
package migrations

import (
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
func ApplyUp(db *sql.DB) (int, error) {
	if err := EnsureTable(db); err != nil {
		return 0, fmt.Errorf("ensure schema_migrations: %w", err)
	}
	applied, err := appliedVersions(db)
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
		tx, err := db.Begin()
		if err != nil {
			return n, fmt.Errorf("begin tx: %w", err)
		}
		if _, err := tx.Exec(f.SQL); err != nil {
			_ = tx.Rollback()
			return n, fmt.Errorf("apply %s: %w", f.Name, err)
		}
		if _, err := tx.Exec("INSERT INTO schema_migrations (version, name) VALUES ($1, $2)", f.Version, f.Name); err != nil {
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

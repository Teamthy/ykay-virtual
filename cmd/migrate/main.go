package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"ykay-virtual/internal/config"
	"ykay-virtual/internal/logx"
	"ykay-virtual/migrations"
)

// cmd/migrate — dependency-free migration runner using lib/pq:
// applies numbered /migrations/*.up.sql in order (transactions), tracks
// applied versions in schema_migrations, rolls back via *.down.sql.
//
// Without --dir it uses the EMBEDDED migration chain (works anywhere,
// including the scratch release image). Pass --dir=migrations to run from
// a local checkout against files on disk (identical content).
//
//	Usage: go run ./cmd/migrate --cmd=up|down|status [--dir=../../migrations]

func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	logx.Setup(cfg.Environment)

	cmd := flag.String("cmd", "up", "migrate command: up, down, status")
	dir := flag.String("dir", "", "migrations directory (default: embedded chain)")
	flag.Parse()

	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		logx.Fatal("open db", "error", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		logx.Fatal("ping db", "error", err, "hint", "is postgres running? (docker compose up -d postgres)")
	}

	source := "embedded"
	all := make([]migration, 0)
	if *dir == "" {
		if err := migrations.EnsureTable(db); err != nil {
			logx.Fatal("ensure schema_migrations", "error", err)
		}
		files, err := migrations.Files()
		if err != nil {
			logx.Fatal("embedded migrations", "error", err)
		}
		if err := migrations.Validate(files); err != nil {
			logx.Fatal("embedded migration chain unsafe", "error", err)
		}
		seen := map[int]*migration{}
		for _, f := range files {
			m := seen[f.Version]
			if m == nil {
				m = &migration{version: f.Version}
				seen[f.Version] = m
			}
			if f.Up {
				m.upName, m.upSQL = f.Name, f.SQL
			} else {
				m.downName, m.downSQL = f.Name, f.SQL
			}
		}
		for _, m := range seen {
			all = append(all, *m)
		}
	} else {
		source = *dir
		if err := migrations.EnsureTable(db); err != nil {
			logx.Fatal("ensure schema_migrations", "error", err)
		}
		var err error
		all, err = listMigrationsFromDisk(*dir)
		if err != nil {
			logx.Fatal("migration chain unsafe", "error", err)
		}
	}
	sort.Slice(all, func(i, j int) bool { return all[i].version < all[j].version })

	switch *cmd {
	case "up":
		up(db, all, source)
	case "down":
		down(db, all, source)
	case "status":
		status(db, all, source)
	default:
		logx.Fatal("unknown cmd", "cmd", *cmd, "hint", "use up, down, status")
	}
}

type migration struct {
	version  int
	upName   string
	upSQL    string
	downName string
	downSQL  string
}

func listMigrationsFromDisk(dir string) ([]migration, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read migrations dir %s: %w", dir, err)
	}
	// Build the full file list first so duplicate versions and conflict
	// markers are detected BEFORE the per-version map silently collapses
	// them (a duplicate would otherwise be applied once and never re-checked).
	var files []migrations.File
	for _, e := range entries {
		name := e.Name()
		if !strings.HasSuffix(name, ".sql") {
			continue
		}
		parts := strings.SplitN(name, "_", 2)
		if len(parts) != 2 {
			continue
		}
		var version int
		if _, err := fmt.Sscanf(parts[0], "%06d", &version); err != nil {
			continue
		}
		content, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return nil, fmt.Errorf("read migration %s: %w", name, err)
		}
		files = append(files, migrations.File{
			Name:    name,
			Version: version,
			SQL:     string(content),
			Up:      strings.HasSuffix(name, ".up.sql"),
		})
	}
	if err := migrations.Validate(files); err != nil {
		return nil, err
	}
	sort.Slice(files, func(i, j int) bool {
		if files[i].Version != files[j].Version {
			return files[i].Version < files[j].Version
		}
		return files[i].Up && !files[j].Up
	})
	seen := map[int]migration{}
	for _, f := range files {
		m := seen[f.Version]
		m.version = f.Version
		if f.Up {
			m.upName, m.upSQL = f.Name, f.SQL
		} else {
			m.downName, m.downSQL = f.Name, f.SQL
		}
		seen[f.Version] = m
	}
	out := make([]migration, 0, len(seen))
	for _, m := range seen {
		out = append(out, m)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].version < out[j].version })
	return out, nil
}

func appliedVersions(db *sql.DB) map[int]bool {
	rows, err := db.Query("SELECT version FROM schema_migrations")
	if err != nil {
		logx.Fatal("query schema_migrations", "error", err)
	}
	defer rows.Close()
	out := map[int]bool{}
	for rows.Next() {
		var v int
		if err := rows.Scan(&v); err != nil {
			logx.Fatal("scan version", "error", err)
		}
		out[v] = true
	}
	return out
}

func up(db *sql.DB, all []migration, source string) {
	applied := appliedVersions(db)
	for _, m := range all {
		if applied[m.version] {
			continue
		}
		if m.upSQL == "" {
			slog.Warn("skipping migration: no up file", "version", m.version)
			continue
		}
		tx, err := db.Begin()
		if err != nil {
			logx.Fatal("begin tx", "error", err)
		}
		if _, err := tx.Exec(m.upSQL); err != nil {
			_ = tx.Rollback()
			logx.Fatal("apply migration", "name", m.upName, "error", err)
		}
		if _, err := tx.Exec("INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
			m.version, m.upName); err != nil {
			_ = tx.Rollback()
			logx.Fatal("record migration", "version", m.version, "error", err)
		}
		if err := tx.Commit(); err != nil {
			logx.Fatal("commit migration", "version", m.version, "error", err)
		}
		slog.Info("migration applied", "version", m.version, "name", m.upName, "source", source)
	}
	slog.Info("migrate up complete")
}

func down(db *sql.DB, all []migration, source string) {
	applied := appliedVersions(db)
	for i := len(all) - 1; i >= 0; i-- {
		m := all[i]
		if !applied[m.version] {
			continue
		}
		if m.downSQL == "" {
			slog.Warn("skipping migration: no down file", "version", m.version)
			continue
		}
		tx, err := db.Begin()
		if err != nil {
			logx.Fatal("begin tx", "error", err)
		}
		if _, err := tx.Exec(m.downSQL); err != nil {
			_ = tx.Rollback()
			logx.Fatal("rollback migration", "name", m.downName, "error", err)
		}
		if _, err := tx.Exec("DELETE FROM schema_migrations WHERE version = $1", m.version); err != nil {
			_ = tx.Rollback()
			logx.Fatal("unrecord migration", "version", m.version, "error", err)
		}
		if err := tx.Commit(); err != nil {
			logx.Fatal("commit migration", "version", m.version, "error", err)
		}
		slog.Info("migration rolled back", "version", m.version, "name", m.downName, "source", source)
	}
	slog.Info("migrate down complete")
}

func status(db *sql.DB, all []migration, source string) {
	applied := appliedVersions(db)
	pending := 0
	for _, m := range all {
		state := "pending"
		if applied[m.version] {
			state = "applied"
		} else {
			pending++
		}
		slog.Info(fmt.Sprintf("%06d %-7s %s", m.version, state, m.upName))
	}
	slog.Info(fmt.Sprintf("migrate status: %d applied, %d pending (%s)", len(applied), pending, source))
}

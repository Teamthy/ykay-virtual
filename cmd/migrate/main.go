package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"ykay-virtual/internal/config"
)

// cmd/migrate — dependency-free migration runner using lib/pq:
// applies numbered /migrations/*.up.sql in order (transactions), tracks
// applied versions in schema_migrations, rolls back via *.down.sql.
//
//	Usage: go run ./cmd/migrate --cmd=up|down|status [--dir=../../migrations]

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	cmd := flag.String("cmd", "up", "migrate command: up, down, status")
	dir := flag.String("dir", "", "migrations directory (default: ./migrations)")
	flag.Parse()

	if *dir == "" {
		*dir = "migrations"
	}
	if strings.HasPrefix(*dir, "./") {
		*dir = strings.TrimPrefix(*dir, "./")
	}

	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatalf("ping db: %v — is postgres running? (docker compose up -d postgres)", err)
	}

	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version BIGINT PRIMARY KEY,
		name TEXT NOT NULL,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`); err != nil {
		log.Fatalf("ensure schema_migrations: %v", err)
	}

	switch *cmd {
	case "up":
		up(db, *dir)
	case "down":
		down(db, *dir)
	case "status":
		status(db, *dir)
	default:
		log.Fatalf("unknown cmd %q (use up, down, status)", *cmd)
	}
}

type migration struct {
	version  int
	upPath   string
	downPath string
}

func listMigrations(dir string) []migration {
	entries, err := os.ReadDir(dir)
	if err != nil {
		log.Fatalf("read migrations dir %s: %v", dir, err)
	}
	seen := map[int]migration{}
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
		m := seen[version]
		m.version = version
		switch {
		case strings.HasSuffix(name, ".up.sql"):
			m.upPath = filepath.Join(dir, name)
		case strings.HasSuffix(name, ".down.sql"):
			m.downPath = filepath.Join(dir, name)
		}
		seen[version] = m
	}
	out := make([]migration, 0, len(seen))
	for _, m := range seen {
		out = append(out, m)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].version < out[j].version })
	return out
}

func appliedVersions(db *sql.DB) map[int]bool {
	rows, err := db.Query("SELECT version FROM schema_migrations")
	if err != nil {
		log.Fatalf("query schema_migrations: %v", err)
	}
	defer rows.Close()
	out := map[int]bool{}
	for rows.Next() {
		var v int
		if err := rows.Scan(&v); err != nil {
			log.Fatalf("scan version: %v", err)
		}
		out[v] = true
	}
	return out
}

func up(db *sql.DB, dir string) {
	applied := appliedVersions(db)
	for _, m := range listMigrations(dir) {
		if applied[m.version] {
			continue
		}
		if m.upPath == "" {
			log.Printf("skip %06d: no up file", m.version)
			continue
		}
		sqlBytes, err := os.ReadFile(m.upPath)
		if err != nil {
			log.Fatalf("read %s: %v", m.upPath, err)
		}
		tx, err := db.Begin()
		if err != nil {
			log.Fatalf("begin tx: %v", err)
		}
		if _, err := tx.Exec(string(sqlBytes)); err != nil {
			_ = tx.Rollback()
			log.Fatalf("apply %s: %v", filepath.Base(m.upPath), err)
		}
		if _, err := tx.Exec("INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
			m.version, filepath.Base(m.upPath)); err != nil {
			_ = tx.Rollback()
			log.Fatalf("record %06d: %v", m.version, err)
		}
		if err := tx.Commit(); err != nil {
			log.Fatalf("commit %06d: %v", m.version, err)
		}
		log.Printf("applied %06d %s", m.version, filepath.Base(m.upPath))
	}
	log.Println("migrate up complete")
}

func down(db *sql.DB, dir string) {
	applied := appliedVersions(db)
	all := listMigrations(dir)
	for i := len(all) - 1; i >= 0; i-- {
		m := all[i]
		if !applied[m.version] {
			continue
		}
		if m.downPath == "" {
			log.Printf("skip %06d: no down file", m.version)
			continue
		}
		sqlBytes, err := os.ReadFile(m.downPath)
		if err != nil {
			log.Fatalf("read %s: %v", m.downPath, err)
		}
		tx, err := db.Begin()
		if err != nil {
			log.Fatalf("begin tx: %v", err)
		}
		if _, err := tx.Exec(string(sqlBytes)); err != nil {
			_ = tx.Rollback()
			log.Fatalf("rollback %s: %v", filepath.Base(m.downPath), err)
		}
		if _, err := tx.Exec("DELETE FROM schema_migrations WHERE version = $1", m.version); err != nil {
			_ = tx.Rollback()
			log.Fatalf("unrecord %06d: %v", m.version, err)
		}
		if err := tx.Commit(); err != nil {
			log.Fatalf("commit %06d: %v", m.version, err)
		}
		log.Printf("rolled back %06d %s", m.version, filepath.Base(m.downPath))
	}
	log.Println("migrate down complete")
}

func status(db *sql.DB, dir string) {
	applied := appliedVersions(db)
	for _, m := range listMigrations(dir) {
		state := "pending"
		if applied[m.version] {
			state = "applied"
		}
		fmt.Printf("%06d  %-8s  %s\n", m.version, state, filepath.Base(m.upPath))
	}
}

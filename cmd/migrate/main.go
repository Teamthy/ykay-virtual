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

	cmd := flag.String("cmd", "up", "migrate command: up, down, status")
	dir := flag.String("dir", "", "migrations directory (default: embedded chain)")
	flag.Parse()

	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatalf("ping db: %v — is postgres running? (docker compose up -d postgres)", err)
	}

	source := "embedded"
	all := make([]migration, 0)
	if *dir == "" {
		if err := migrations.EnsureTable(db); err != nil {
			log.Fatalf("ensure schema_migrations: %v", err)
		}
		files, err := migrations.Files()
		if err != nil {
			log.Fatalf("embedded migrations: %v", err)
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
			log.Fatalf("ensure schema_migrations: %v", err)
		}
		all = listMigrationsFromDisk(*dir)
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
		log.Fatalf("unknown cmd %q (use up, down, status)", *cmd)
	}
}

type migration struct {
	version  int
	upName   string
	upSQL    string
	downName string
	downSQL  string
}

func listMigrationsFromDisk(dir string) []migration {
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
		content, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			log.Fatalf("read %s: %v", name, err)
		}
		m := seen[version]
		m.version = version
		switch {
		case strings.HasSuffix(name, ".up.sql"):
			m.upName, m.upSQL = name, string(content)
		case strings.HasSuffix(name, ".down.sql"):
			m.downName, m.downSQL = name, string(content)
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

func up(db *sql.DB, all []migration, source string) {
	applied := appliedVersions(db)
	for _, m := range all {
		if applied[m.version] {
			continue
		}
		if m.upSQL == "" {
			log.Printf("skip %06d: no up file", m.version)
			continue
		}
		tx, err := db.Begin()
		if err != nil {
			log.Fatalf("begin tx: %v", err)
		}
		if _, err := tx.Exec(m.upSQL); err != nil {
			_ = tx.Rollback()
			log.Fatalf("apply %s: %v", m.upName, err)
		}
		if _, err := tx.Exec("INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
			m.version, m.upName); err != nil {
			_ = tx.Rollback()
			log.Fatalf("record %06d: %v", m.version, err)
		}
		if err := tx.Commit(); err != nil {
			log.Fatalf("commit %06d: %v", m.version, err)
		}
		log.Printf("applied %06d %s (%s)", m.version, m.upName, source)
	}
	log.Println("migrate up complete")
}

func down(db *sql.DB, all []migration, source string) {
	applied := appliedVersions(db)
	for i := len(all) - 1; i >= 0; i-- {
		m := all[i]
		if !applied[m.version] {
			continue
		}
		if m.downSQL == "" {
			log.Printf("skip %06d: no down file", m.version)
			continue
		}
		tx, err := db.Begin()
		if err != nil {
			log.Fatalf("begin tx: %v", err)
		}
		if _, err := tx.Exec(m.downSQL); err != nil {
			_ = tx.Rollback()
			log.Fatalf("rollback %s: %v", m.downName, err)
		}
		if _, err := tx.Exec("DELETE FROM schema_migrations WHERE version = $1", m.version); err != nil {
			_ = tx.Rollback()
			log.Fatalf("unrecord %06d: %v", m.version, err)
		}
		if err := tx.Commit(); err != nil {
			log.Fatalf("commit %06d: %v", m.version, err)
		}
		log.Printf("rolled back %06d %s (%s)", m.version, m.downName, source)
	}
	log.Println("migrate down complete")
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
		log.Printf("%06d %-7s %s", m.version, state, m.upName)
	}
	log.Printf("migrate status: %d applied, %d pending (%s)", len(applied), pending, source)
}

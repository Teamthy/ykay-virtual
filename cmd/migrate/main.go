package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"ykay-virtual/internal/config"
)

func main() {
	cfg := config.Load()
	cmd := flag.String("cmd", "up", "migrate command: up, down, status")
	flag.Parse()

	// In production use golang-migrate/migrate or goose
	// For Phase1 we just log intent and require DATABASE_URL

	fmt.Printf("Migrate cmd=%s db=%s\n", *cmd, cfg.DatabaseURL)
	if os.Getenv("DATABASE_URL") == "" {
		log.Println("DATABASE_URL not set, using default postgres://ykay:ykay@localhost:5432/ykay")
	}

	switch *cmd {
	case "up":
		fmt.Println("Would run migrations from /migrations/*.up.sql (implement with goose/migrate)")
		// TODO: integrate goose
	case "down":
		fmt.Println("Would rollback")
	case "status":
		fmt.Println("Migration status check")
	default:
		log.Fatalf("unknown cmd %s", *cmd)
	}
}

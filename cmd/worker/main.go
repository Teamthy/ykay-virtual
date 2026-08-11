package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ykay-virtual/internal/config"
	"ykay-virtual/internal/worker"
)

func main() {
	cfg := config.Load()
	_ = cfg

	w := worker.New()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Cron placeholders per AGENTS.md
	// generate_lesson_reminders, expire_stale_booking_holds, compute_tutor_ranking_score nightly,
	// process_weekly_tutor_payouts, regenerate_sitemaps etc.

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				// Example: expire stale holds
				err := w.Process(ctx, worker.Job{ID: "cron-expire-holds", Type: worker.JobExpireStaleBookingHolds})
				if err != nil {
					log.Printf("worker error: %v", err)
				}
			}
		}
	}()

	log.Println("Worker started - waiting for jobs (Phase1 placeholder)")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Worker shutting down...")
}

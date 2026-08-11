package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/config"
	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/storage"
	"ykay-virtual/internal/telemetry"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()
	shutdownTracer := telemetry.InitTracer(ctx, cfg.OtelEndpoint)
	defer shutdownTracer()

	// Dependencies per AGENTS.md
	redisCache := cache.NewInMemoryCache() // replace with go-redis in prod
	_ = redisCache
	store := storage.NewLocalStorage()
	_ = store

	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","version":"phase-1"}`))
	})

	// Placeholder for domain handlers - will be wired after repository layer implementation
	mux.HandleFunc("/api/v1/tutors/search", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":[],"meta":{"page":1,"page_size":20,"total_items":0,"total_pages":0}}`))
	})

	mux.HandleFunc("/api/v1/subjects", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":[{"id":"sub-1","name":"Mathematics","slug":"mathematics","category":"Academic"}],"meta":{"page":1,"page_size":20,"total_items":1,"total_pages":1}}`))
	})

	// Wrapper chain per AGENTS.md: request-id, otel, logging, recover, rate-limit
	handler := middleware.RequestID(mux)
	handler = middleware.Logger(handler)
	handler = middleware.Recover(handler)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		fmt.Printf("YKAY API listening on :%s env=%s\n", cfg.Port, cfg.Environment)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen failed: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down...")
	ctxShutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctxShutdown)
}

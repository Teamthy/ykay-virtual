package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"ykay-virtual/internal/config"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/learning"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/notification"
	payment_provider "ykay-virtual/internal/payment"
	"ykay-virtual/internal/repository"
	"ykay-virtual/internal/repository/memory"
	"ykay-virtual/internal/repository/postgres"
	"ykay-virtual/internal/service"
	"ykay-virtual/internal/storage"
	"ykay-virtual/internal/telemetry"
	"ykay-virtual/internal/worker"

	goredis "github.com/redis/go-redis/v9"
)

// newRedisClient — returns nil when Redis is unreachable (dev fallback).
func newRedisClient(url string) *goredis.Client {
	opts, err := goredis.ParseURL(url)
	if err != nil {
		return nil
	}
	client := goredis.NewClient(opts)
	pingCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(pingCtx).Err(); err != nil {
		_ = client.Close()
		return nil
	}
	return client
}

// Worker — background jobs + crons per AGENTS.md:
//   - expire_stale_booking_holds   (every 15 min; Tuteria 3-day auto-release)
//   - process_weekly_tutor_payouts (weekly; PENDING → PAID)
//   - compute_tutor_ranking_score, regenerate_sitemaps etc. land in later phases.
//
// All jobs are idempotent; failures are logged and retried on the next tick.

type repos struct {
	uowFactory repository.UnitOfWorkFactory
	escrowRead payment.EscrowHoldRepository
	auditRepo  identity.AuditLogRepository
	learning   learning.AssessmentRepository
	devices    identity.DeviceRepository
	users      identity.UserRepository
}

func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Same fallback strategy as the API: Postgres when available, else memory.
	r := setupRepos(ctx, cfg)

	audit := service.NewAuditService(r.auditRepo)
	providers := map[payment.PaymentProvider]payment_provider.Provider{
		payment.ProviderPaystack:    payment_provider.NewPaystack(cfg.PaystackSecret),
		payment.ProviderFlutterwave: payment_provider.NewFlutterwave(cfg.FlutterwaveSecret),
	}
	paymentSvc := service.NewPaymentService(r.uowFactory, providers, audit, r.escrowRead)
	vettingSvc := service.NewVettingService(r.uowFactory, storage.NewLocalStorage(), audit, nil, nil)

	// --- Notification dispatch (G4): email/SMS/push adapters ---
	pushSvc := service.NewPushService(r.devices, service.NewExpoPushSender(cfg.ExpoAccessToken))
	dispatchSvc := service.NewDispatchService(
		notification.NewEmailSender(),
		notification.NewSMSSender(),
		pushSvc,
		r.users,
	)

	// --- Durable job queue (G3.1) ---
	// Redis-backed with retries + dead-letter; consumers are idempotent.
	if redisClient := newRedisClient(cfg.RedisURL); redisClient != nil {
		queue := worker.NewRedisQueue(redisClient)
		queue.Register(worker.JobSendEmail, func(jctx context.Context, job worker.Job) error {
			return dispatchSvc.HandleSendEmail(jctx, job.Payload)
		})
		queue.Register(worker.JobSendSMS, func(jctx context.Context, job worker.Job) error {
			return dispatchSvc.HandleSendSMS(jctx, job.Payload)
		})
		queue.Register(worker.JobSendPush, func(jctx context.Context, job worker.Job) error {
			return dispatchSvc.HandleSendPush(jctx, job.Payload)
		})
		queue.Register(worker.JobExpireStaleBookingHolds, func(jctx context.Context, _ worker.Job) error {
			n, err := paymentSvc.ExpireStaleHolds(jctx, 200)
			if err == nil && n > 0 {
				log.Printf("job[expire_stale_booking_holds]: released %d hold(s)", n)
			}
			return err
		})
		queue.Register(worker.JobProcessWeeklyPayouts, func(jctx context.Context, _ worker.Job) error {
			n, err := paymentSvc.PayoutSvc.ProcessPendingPayouts(jctx, 200)
			if err == nil {
				log.Printf("job[process_weekly_tutor_payouts]: paid %d payout(s)", n)
			}
			return err
		})
		queue.Register(worker.JobComputeTutorRanking, func(jctx context.Context, _ worker.Job) error {
			n, err := vettingSvc.RecomputeAllRankings(jctx)
			if err == nil {
				log.Printf("job[compute_tutor_ranking_score]: updated %d ranking(s)", n)
			}
			return err
		})
		go queue.Run(ctx)
		log.Println("Worker: durable Redis queue consuming (retry + dead-letter enabled)")
	} else {
		log.Println("Worker: Redis unavailable — cron-only mode (no durable queue)")
	}

	// --- Cron scheduler ---
	expireTicker := time.NewTicker(15 * time.Minute)
	defer expireTicker.Stop()
	payoutTicker := time.NewTicker(7 * 24 * time.Hour)
	defer payoutTicker.Stop()
	rankingTicker := time.NewTicker(24 * time.Hour)
	defer rankingTicker.Stop()

	// Run once at boot so restarts immediately recover stale holds + attempts.
	go func() {
		if _, err := paymentSvc.ExpireStaleHolds(ctx, 200); err != nil {
			log.Printf("cron[expire_stale_booking_holds] boot error: %v", err)
			telemetry.CronRun("expire_stale_booking_holds", false)
		} else {
			telemetry.CronRun("expire_stale_booking_holds", true)
		}
		if _, err := r.learning.ExpireStaleAttempts(ctx, time.Now().UTC()); err != nil {
			log.Printf("cron[expire_stale_learning_attempts] boot error: %v", err)
			telemetry.CronRun("expire_stale_learning_attempts", false)
		} else {
			telemetry.CronRun("expire_stale_learning_attempts", true)
		}
	}()

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-expireTicker.C:
				n, err := paymentSvc.ExpireStaleHolds(ctx, 200)
				if err != nil {
					log.Printf("cron[expire_stale_booking_holds] error: %v", err)
					telemetry.CronRun("expire_stale_booking_holds", false)
				} else {
					telemetry.CronRun("expire_stale_booking_holds", true)
				}
				if n, aerr := r.learning.ExpireStaleAttempts(ctx, time.Now().UTC()); aerr != nil {
					log.Printf("cron[expire_stale_learning_attempts] error: %v", aerr)
					telemetry.CronRun("expire_stale_learning_attempts", false)
				} else {
					telemetry.CronRun("expire_stale_learning_attempts", true)
					if n > 0 {
						log.Printf("cron[expire_stale_learning_attempts]: expired %d attempt(s)", n)
					}
				}
				if n > 0 {
					log.Printf("cron[expire_stale_booking_holds]: auto-released %d stale hold(s)", n)
				}
			case <-payoutTicker.C:
				n, err := paymentSvc.PayoutSvc.ProcessPendingPayouts(ctx, 200)
				if err != nil {
					log.Printf("cron[process_weekly_tutor_payouts] error: %v", err)
					telemetry.CronRun("process_weekly_tutor_payouts", false)
					continue
				}
				telemetry.CronRun("process_weekly_tutor_payouts", true)
				log.Printf("cron[process_weekly_tutor_payouts]: paid %d payout(s)", n)
			case <-rankingTicker.C:
				n, err := vettingSvc.RecomputeAllRankings(ctx)
				if err != nil {
					log.Printf("cron[compute_tutor_ranking_score] error: %v", err)
					telemetry.CronRun("compute_tutor_ranking_score", false)
					continue
				}
				telemetry.CronRun("compute_tutor_ranking_score", true)
				log.Printf("cron[compute_tutor_ranking_score]: updated %d ranking(s)", n)
			}
		}
	}()

	// --- Metrics HTTP endpoint (G3.3) ---
	// The worker's only HTTP surface: cron heartbeats + queue depths for
	// Prometheus. Disable with WORKER_METRICS_PORT=0.
	metricsPort := os.Getenv("WORKER_METRICS_PORT")
	if metricsPort == "" {
		metricsPort = "8081"
	}
	metricsSrv := serveMetrics(metricsPort, os.Getenv("METRICS_TOKEN"))

	log.Println("Worker started — crons: expire_stale_booking_holds (15m), process_weekly_tutor_payouts (7d), compute_tutor_ranking_score (24h)")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Worker shutting down...")
	if metricsSrv != nil {
		shCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = metricsSrv.Shutdown(shCtx)
	}
}

// serveMetrics starts the worker's Prometheus scrape endpoint. The worker
// has no other HTTP surface; this handler exposes cron heartbeats and queue
// depths for alerting (G3.3). Returns nil when the port is empty/"0".
func serveMetrics(port, token string) *http.Server {
	if port == "" || port == "0" {
		return nil
	}
	mux := http.NewServeMux()
	mux.Handle("GET /metrics", telemetry.DefaultMetrics().HandlerWithToken(token))
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	srv := &http.Server{Addr: ":" + port, Handler: mux}
	go func() {
		log.Printf("Worker metrics listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("worker metrics server: %v", err)
		}
	}()
	return srv
}

func setupRepos(ctx context.Context, cfg config.Config) *repos {
	pg, err := postgres.New(cfg.DatabaseURL)
	if err != nil {
		log.Printf("storage: %v — worker running against in-memory store (dev mode)", err)
		store := memory.NewMemoryStore()
		return &repos{
			uowFactory: memory.NewMemoryUnitOfWorkFactory(store),
			escrowRead: store.Escrow,
			auditRepo:  store.AuditLogs,
			learning:   store.Learning,
			devices:    memory.NewDeviceMemory(),
			users:      store.Users,
		}
	}
	_ = ctx
	return &repos{
		uowFactory: postgres.NewPgUnitOfWorkFactory(pg),
		escrowRead: postgres.NewEscrowHoldRepo(pg.DB()),
		auditRepo:  postgres.NewAuditLogRepo(pg.DB()),
		learning:   postgres.NewAssessmentRepo(pg.DB()),
		devices:    postgres.NewDeviceRepo(pg.DB()),
		users:      postgres.NewUserRepo(pg.DB()),
	}
}

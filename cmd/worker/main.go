package main

import (
	"context"
	"fmt"
	"log/slog"
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
	"ykay-virtual/internal/logx"
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
	logx.Setup(cfg.Environment)
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

	// YK-005 fail-closed: in production, never record MOCK payouts as PAID.
	// Until a real, certified payout provider is configured, tutor payouts stay
	// PENDING rather than silently pretending money moved.
	if cfg.Environment == "production" {
		paymentSvc.PayoutSvc.SetFailClosed(true)
		slog.Warn("worker: tutor payouts DISABLED (production, no certified provider) — payouts will stay PENDING")
	}
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
	// The client is hoisted so the cron scheduler can share it for leader
	// election (A-09).
	redisClient := newRedisClient(cfg.RedisURL)
	telemetry.RedisConnected(redisClient != nil)
	cronLock := worker.NewCronLock(redisClient)
	if redisClient != nil {
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
				slog.Info("job: expire_stale_booking_holds", "released", n)
			}
			return err
		})
		queue.Register(worker.JobProcessWeeklyPayouts, func(jctx context.Context, _ worker.Job) error {
			n, err := paymentSvc.PayoutSvc.ProcessPendingPayouts(jctx, 200)
			if err == nil {
				slog.Info("job: process_weekly_tutor_payouts", "paid", n)
			}
			return err
		})
		queue.Register(worker.JobComputeTutorRanking, func(jctx context.Context, _ worker.Job) error {
			n, err := vettingSvc.RecomputeAllRankings(jctx)
			if err == nil {
				slog.Info("job: compute_tutor_ranking_score", "updated", n)
			}
			return err
		})
		queue.Register(worker.JobArchiveAuditLogs, func(jctx context.Context, _ worker.Job) error {
			n, err := r.auditRepo.ArchiveOlderThan(jctx, auditCutoff(), 1000)
			if err == nil && n > 0 {
				slog.Info("job: archive_audit_logs", "archived", n)
			}
			return err
		})
		go queue.Run(ctx)
		slog.Info("worker: durable Redis queue consuming (retry + dead-letter enabled)")
	} else {
		slog.Warn("worker: Redis unavailable — cron-only mode (no durable queue)")
	}

	// --- Cron scheduler ---
	expireTicker := time.NewTicker(15 * time.Minute)
	defer expireTicker.Stop()
	payoutTicker := time.NewTicker(7 * 24 * time.Hour)
	defer payoutTicker.Stop()
	rankingTicker := time.NewTicker(24 * time.Hour)
	defer rankingTicker.Stop()
	archiveTicker := time.NewTicker(24 * time.Hour) // G7.3 audit retention
	defer archiveTicker.Stop()

	// Run once at boot so restarts immediately recover stale holds + attempts.
	// Leader-election (A-09): a replica booting alongside a live winner skips
	// its boot recovery rather than double-running.
	go func() {
		if release, ok := cronLock.TryLock(ctx, "expire_stale_booking_holds", 14*time.Minute); ok {
			if _, err := paymentSvc.ExpireStaleHolds(ctx, 200); err != nil {
				slog.Error("cron boot: expire_stale_booking_holds", "error", err)
				telemetry.CronRun("expire_stale_booking_holds", false)
			} else {
				telemetry.CronRun("expire_stale_booking_holds", true)
			}
			release()
		}
		if release, ok := cronLock.TryLock(ctx, "expire_stale_learning_attempts", 14*time.Minute); ok {
			if _, err := r.learning.ExpireStaleAttempts(ctx, time.Now().UTC()); err != nil {
				slog.Error("cron boot: expire_stale_learning_attempts", "error", err)
				telemetry.CronRun("expire_stale_learning_attempts", false)
			} else {
				telemetry.CronRun("expire_stale_learning_attempts", true)
			}
			release()
		}
	}()

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-expireTicker.C:
				// A-09: leader election — only one replica runs each tick.
				if release, ok := cronLock.TryLock(ctx, "expire_stale_booking_holds", 14*time.Minute); ok {
					n, err := paymentSvc.ExpireStaleHolds(ctx, 200)
					if err != nil {
						slog.Error("cron: expire_stale_booking_holds", "error", err)
						telemetry.CronRun("expire_stale_booking_holds", false)
					} else {
						telemetry.CronRun("expire_stale_booking_holds", true)
						if n > 0 {
							slog.Info("cron: expire_stale_booking_holds", "released", n)
						}
					}
					release()
				}
				if release, ok := cronLock.TryLock(ctx, "expire_stale_learning_attempts", 14*time.Minute); ok {
					if n, aerr := r.learning.ExpireStaleAttempts(ctx, time.Now().UTC()); aerr != nil {
						slog.Error("cron: expire_stale_learning_attempts", "error", aerr)
						telemetry.CronRun("expire_stale_learning_attempts", false)
					} else {
						telemetry.CronRun("expire_stale_learning_attempts", true)
						if n > 0 {
							slog.Info("cron: expire_stale_learning_attempts", "expired", n)
						}
					}
					release()
				}
			case <-payoutTicker.C:
				if release, ok := cronLock.TryLock(ctx, "process_weekly_tutor_payouts", 6*24*time.Hour); ok {
					n, err := paymentSvc.PayoutSvc.ProcessPendingPayouts(ctx, 200)
					if err != nil {
						slog.Error("cron: process_weekly_tutor_payouts", "error", err)
						telemetry.CronRun("process_weekly_tutor_payouts", false)
					} else {
						telemetry.CronRun("process_weekly_tutor_payouts", true)
						slog.Info("cron: process_weekly_tutor_payouts", "paid", n)
					}
					release()
				}
			case <-rankingTicker.C:
				if release, ok := cronLock.TryLock(ctx, "compute_tutor_ranking_score", 20*time.Hour); ok {
					n, err := vettingSvc.RecomputeAllRankings(ctx)
					if err != nil {
						slog.Error("cron: compute_tutor_ranking_score", "error", err)
						telemetry.CronRun("compute_tutor_ranking_score", false)
					} else {
						telemetry.CronRun("compute_tutor_ranking_score", true)
						slog.Info("cron: compute_tutor_ranking_score", "updated", n)
					}
					release()
				}
			case <-archiveTicker.C:
				if release, ok := cronLock.TryLock(ctx, "archive_audit_logs", 20*time.Hour); ok {
					n, err := r.auditRepo.ArchiveOlderThan(ctx, auditCutoff(), 1000)
					if err != nil {
						slog.Error("cron: archive_audit_logs", "error", err)
						telemetry.CronRun("archive_audit_logs", false)
					} else {
						telemetry.CronRun("archive_audit_logs", true)
						if n > 0 {
							slog.Info("cron: archive_audit_logs", "archived", n)
						}
					}
					release()
				}
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

	slog.Info("worker started", "crons", "expire_stale_booking_holds (15m), process_weekly_tutor_payouts (7d), compute_tutor_ranking_score (24h)")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("worker shutting down")
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
		slog.Info("worker metrics listening", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("worker metrics server", "error", err)
		}
	}()
	return srv
}

func setupRepos(ctx context.Context, cfg config.Config) *repos {
	pg, err := postgres.New(cfg.DatabaseURL)
	if err != nil {
		slog.Warn("postgres unavailable — worker running against in-memory store (dev mode)", "error", err)
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

// auditCutoff — G7.3: rows older than AUDIT_RETENTION_DAYS (default 180)
// become eligible for archival into audit_logs_archive.
func auditCutoff() time.Time {
	days := 180
	if v := os.Getenv("AUDIT_RETENTION_DAYS"); v != "" {
		var n int
		if _, err := fmt.Sscanf(v, "%d", &n); err == nil && n > 0 {
			days = n
		}
	}
	return time.Now().UTC().AddDate(0, 0, -days)
}

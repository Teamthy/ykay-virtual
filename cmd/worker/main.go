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
	"ykay-virtual/internal/domain/leads"
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
	leadsRepo  leads.Repository
	orders     payment.OrderRepository
	dripRepo   identity.EmailDripRepository
	roleRepo   identity.RoleRepository
}

func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	logx.Setup(cfg.Environment)
	if !notification.EmailDeliveryConfigured() {
		slog.Error("EMAIL DELIVERY NOT CONFIGURED — queued emails will fail and dead-letter. Set RESEND_API_KEY (recommended) or SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM.")
	} else {
		slog.Info("email provider active", "provider", notification.EmailProviderActive())
		slog.Info("whatsapp provider active", "provider", notification.WhatsAppProviderActive())
	}
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
	if cfg.IsProduction() {
		paymentSvc.PayoutSvc.SetFailClosed(true)
		slog.Warn("worker: automatic payout processing DISABLED (production, no certified provider) — payouts stay PENDING until an admin confirms the bank transfer from Admin → Payouts")
	}
	vettingSvc := service.NewVettingService(r.uowFactory, storage.NewLocalStorage(), audit, nil, nil)
	// Seat-leak recovery: abandoned checkouts (PENDING enrollment + unpaid
	// order) release their reserved cohort seat after pendingEnrollmentTTL.
	bookingSvc := service.NewBookingService(r.uowFactory, nil, nil, audit)
	const pendingEnrollmentTTL = 2 * time.Hour

	// Payment-abandon nudge (revenue recovery): one WhatsApp per stalled
	// checkout, 45 min – 24 h after the order went PENDING unpaid.
	const nudgeMinAge = 45 * time.Minute
	const nudgeMaxAge = 24 * time.Hour

	// --- Notification dispatch (G4): email/SMS/push adapters ---
	pushSvc := service.NewPushService(r.devices, service.NewExpoPushSender(cfg.ExpoAccessToken))
	dispatchSvc := service.NewDispatchService(
		notification.NewEmailSender(),
		notification.NewSMSSender(),
		notification.NewWhatsAppSender(),
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
	// leadSvc powers the payment-abandon WhatsApp nudge cron. With Redis the
	// sends go through the durable send_whatsapp queue; without it they
	// dispatch directly through the configured WhatsApp sender.
	var leadSvc *service.LeadService
	if redisClient != nil {
		queue := worker.NewRedisQueue(redisClient)
		leadSvc = service.NewLeadService(r.leadsRepo, service.NewNotifierService(queue, nil), r.users, audit).
			WithEmail(notification.NewEmailSender()) // nudge fallback when WhatsApp cannot reach the lead
		queue.Register(worker.JobSendEmail, func(jctx context.Context, job worker.Job) error {
			return dispatchSvc.HandleSendEmail(jctx, job.Payload)
		})
		queue.Register(worker.JobSendSMS, func(jctx context.Context, job worker.Job) error {
			return dispatchSvc.HandleSendSMS(jctx, job.Payload)
		})
		queue.Register(worker.JobSendWhatsApp, func(jctx context.Context, job worker.Job) error {
			return dispatchSvc.HandleSendWhatsApp(jctx, job.Payload)
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
		queue.Register(worker.JobExpirePendingEnrollments, func(jctx context.Context, _ worker.Job) error {
			n, err := bookingSvc.ExpireStalePendingEnrollments(jctx, pendingEnrollmentTTL, 200)
			if err == nil && n > 0 {
				slog.Info("job: expire_stale_pending_enrollments", "seats_released", n)
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
		leadSvc = service.NewLeadService(r.leadsRepo, service.NewNotifierService(nil, notification.NewWhatsAppSender()), r.users, audit).
			WithEmail(notification.NewEmailSender())
	}

	// Onboarding email drip (000062) — welcome + conversion nudges. Gated on
	// a real email transport so dev/console workers skip it entirely.
	var dripSvc *service.DripService
	if os.Getenv("RESEND_API_KEY") != "" || os.Getenv("SMTP_HOST") != "" {
		dripSvc = service.NewDripService(r.users, r.roleRepo, r.orders, r.dripRepo,
			notification.NewEmailSender(), cfg.SiteURL)
		slog.Info("drip: onboarding email sequence enabled")
	} else {
		slog.Info("drip: email not configured — onboarding drip disabled")
	}

	// --- Cron scheduler ---
	dripTicker := time.NewTicker(30 * time.Minute)
	defer dripTicker.Stop()
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
		if release, ok := cronLock.TryLock(ctx, "expire_stale_pending_enrollments", 14*time.Minute); ok {
			if _, err := bookingSvc.ExpireStalePendingEnrollments(ctx, pendingEnrollmentTTL, 200); err != nil {
				slog.Error("cron boot: expire_stale_pending_enrollments", "error", err)
				telemetry.CronRun("expire_stale_pending_enrollments", false)
			} else {
				telemetry.CronRun("expire_stale_pending_enrollments", true)
			}
			release()
		}
	}()

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-dripTicker.C:
				if dripSvc != nil {
					if release, ok := cronLock.TryLock(ctx, "send_onboarding_drip", 25*time.Minute); ok {
						total := 0
						for _, step := range service.OnboardingDripSteps {
							if n, derr := dripSvc.SendOnboardingStep(ctx, step, 100); derr != nil {
								slog.Error("cron: send_onboarding_drip", "step", step.Step, "error", derr)
								telemetry.CronRun("send_onboarding_drip", false)
							} else {
								total += n
							}
						}
						telemetry.CronRun("send_onboarding_drip", true)
						if total > 0 {
							slog.Info("cron: send_onboarding_drip", "sent", total)
						}
						release()
					}
				}
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
				if release, ok := cronLock.TryLock(ctx, "expire_stale_pending_enrollments", 14*time.Minute); ok {
					if n, eerr := bookingSvc.ExpireStalePendingEnrollments(ctx, pendingEnrollmentTTL, 200); eerr != nil {
						slog.Error("cron: expire_stale_pending_enrollments", "error", eerr)
						telemetry.CronRun("expire_stale_pending_enrollments", false)
					} else {
						telemetry.CronRun("expire_stale_pending_enrollments", true)
						if n > 0 {
							slog.Info("cron: expire_stale_pending_enrollments", "seats_released", n)
						}
					}
					release()
				}
				if release, ok := cronLock.TryLock(ctx, "send_payment_nudges", 14*time.Minute); ok {
					if n, nerr := leadSvc.SendPaymentNudges(ctx, cfg.SiteURL, nudgeMinAge, nudgeMaxAge, 100); nerr != nil {
						slog.Error("cron: send_payment_nudges", "error", nerr)
						telemetry.CronRun("send_payment_nudges", false)
					} else {
						telemetry.CronRun("send_payment_nudges", true)
						if n > 0 {
							slog.Info("cron: send_payment_nudges", "nudged", n)
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
		if cfg.IsProduction() {
			logx.Fatal("worker: postgres unavailable in production", "error", err)
		}
		slog.Warn("postgres unavailable — worker running against in-memory store (dev mode)", "error", err)
		store := memory.NewMemoryStore()
		return &repos{
			uowFactory: memory.NewMemoryUnitOfWorkFactory(store),
			escrowRead: store.Escrow,
			auditRepo:  store.AuditLogs,
			learning:   store.Learning,
			devices:    memory.NewDeviceMemory(),
			users:      store.Users,
			leadsRepo:  store.Leads,
			orders:     store.Orders,
			dripRepo:   memory.NewEmailDripMemory(),
			roleRepo:   store.Roles,
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
		leadsRepo:  postgres.NewLeadsRepo(pg.DB()),
		orders:     postgres.NewOrderRepo(pg.DB()),
		dripRepo:   postgres.NewEmailDripRepo(pg.DB()),
		roleRepo:   postgres.NewRoleRepo(pg.DB()),
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

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

	"github.com/joho/godotenv"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/config"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/messaging"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/tutor"
	payment_provider "ykay-virtual/internal/payment"
	"ykay-virtual/internal/repository"
	"ykay-virtual/internal/repository/memory"
	"ykay-virtual/internal/repository/postgres"
	"ykay-virtual/internal/service"
	"ykay-virtual/internal/storage"
	"ykay-virtual/internal/telemetry"
	httpapi "ykay-virtual/internal/transport/http"
)

const Version = "0.3.0"

// Repositories — resolved dependency set (Postgres when reachable, otherwise
// the in-memory store so the API runs standalone in dev).
type Repositories struct {
	UoWFactory      repository.UnitOfWorkFactory
	EscrowRead      payment.EscrowHoldRepository
	TutorRepo       tutor.TutorRepository
	SubjectRepo     academics.SubjectRepository
	ProgrammeRepo   academics.ProgrammeRepository
	CohortRepo      booking.CohortRepository
	StudentLink     booking.StudentProfileReader
	TutorSubjectChk booking.TutorProfileReader
	AuditRepo       identity.AuditLogRepository
	Orders          payment.OrderRepository
	Escrow          payment.EscrowHoldRepository
	Payouts         payment.PayoutRepository
	PrivatePackages booking.PrivatePackageRepository
	Cohorts         booking.CohortRepository
	Lessons         booking.LessonRepository
	Conversations   messaging.ConversationRepository
	Messages        messaging.MessageRepository
	Notifications   messaging.NotificationRepository
	StorageBackend  string // "postgres" | "memory"
}

func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	ctx := context.Background()
	shutdownTracer := telemetry.InitTracer(ctx, cfg.OtelEndpoint)
	defer shutdownTracer()

	// --- Cache: Redis real → InMemory fallback (AGENTS.md) ---
	cacheBackend := setupCache(ctx, cfg.RedisURL)

	store := storage.NewLocalStorage()
	_ = store

	// --- Repositories: Postgres → in-memory fallback (dev mode) ---
	repos := setupRepositories(ctx, cfg)
	if repos.StorageBackend == "postgres" {
		log.Println("storage: postgres connected")
	} else {
		log.Println("storage: postgres unavailable — using in-memory store (dev mode)")
	}

	// --- Services ---
	audit := service.NewAuditService(repos.AuditRepo)
	tutorSvc := service.NewTutorService(repos.TutorRepo, cacheBackend)
	bookingSvc := service.NewBookingService(repos.UoWFactory, repos.StudentLink, repos.TutorSubjectChk, audit)
	vettingSvc := service.NewVettingService(repos.UoWFactory, store, audit,
		service.SubjectReaderAdapter{Repo: repos.SubjectRepo},
		service.SearchInvalidatorAdapter{Fn: func(ctx context.Context) error { return tutorSvc.InvalidateSearchCache(ctx) }})
	providers := map[payment.PaymentProvider]payment_provider.Provider{
		payment.ProviderPaystack:    payment_provider.NewPaystack(cfg.PaystackSecret),
		payment.ProviderFlutterwave: payment_provider.NewFlutterwave(cfg.FlutterwaveSecret),
	}
	paymentSvc := service.NewPaymentService(repos.UoWFactory, providers, audit, repos.EscrowRead)

	subjectSvc := service.NewSubjectService(repos.SubjectRepo, cacheBackend)
	programmeSvc := service.NewProgrammeService(repos.ProgrammeRepo, cacheBackend)
	cohortSvc := service.NewCohortService(repos.CohortRepo, cacheBackend)

	// --- Messaging + dashboards ---
	messagingSvc := service.NewMessagingService(
		repos.Conversations, repos.Messages, repos.Notifications,
		repos.PrivatePackages, repos.Cohorts, nil)
	dashboardSvc := service.NewDashboardService(
		repos.Orders, repos.Escrow, repos.Payouts, repos.Lessons)

	// --- Transport ---
	handlers := &httpapi.Handlers{
		Subjects:   httpapi.NewSubjectHandler(subjectSvc),
		Tutors:     httpapi.NewTutorHandler(tutorSvc),
		Programmes: httpapi.NewProgrammeHandler(programmeSvc),
		Cohorts:    httpapi.NewCohortHandler(cohortSvc),
		Bookings:   httpapi.NewBookingHandler(bookingSvc),
		Payments: httpapi.NewPaymentHandler(paymentSvc, map[payment.PaymentProvider]string{
			payment.ProviderPaystack:    cfg.PaystackSecret,
			payment.ProviderFlutterwave: cfg.FlutterwaveSecret,
		}, cfg.SiteURL),
		Vetting:      httpapi.NewVettingHandler(vettingSvc),
		AdminVetting: httpapi.NewAdminVettingHandler(vettingSvc),
		Messaging:    httpapi.NewMessagingHandler(messagingSvc),
		Dashboard:    httpapi.NewDashboardHandler(dashboardSvc),
		Objects:      httpapi.NewObjectHandler(store),
	}
	router := httpapi.NewRouterWithOrigins(Version, handlers, cfg.AllowedOrigins)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router.Handler(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		fmt.Printf("YKAY API v%s listening on :%s env=%s\n", Version, cfg.Port, cfg.Environment)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down...")
	ctxShutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctxShutdown)
}

func setupCache(ctx context.Context, redisURL string) cache.Cache {
	if rc, err := cache.NewRedis(redisURL); err == nil {
		if err := rc.Ping(ctx); err == nil {
			log.Printf("cache: redis connected %s", redisURL)
			return rc
		}
		_ = rc.Close()
	}
	log.Println("cache: redis unavailable — falling back to in-memory cache")
	return cache.NewInMemoryCache()
}

func setupRepositories(ctx context.Context, cfg config.Config) *Repositories {
	pg, err := postgres.New(cfg.DatabaseURL)
	if err != nil {
		log.Printf("storage: %v", err)
		store := memory.NewMemoryStore()
		convMem := memory.NewConversationMemory()
		return &Repositories{
			UoWFactory:      memory.NewMemoryUnitOfWorkFactory(store),
			EscrowRead:      store.Escrow,
			CohortRepo:      store.Cohorts,
			AuditRepo:       store.AuditLogs,
			Orders:          store.Orders,
			Escrow:          store.Escrow,
			Payouts:         store.Payouts,
			PrivatePackages: store.PrivatePkgs,
			Cohorts:         store.Cohorts,
			Lessons:         memory.NewLessonMemory(),
			Conversations:   convMem,
			Messages:        memory.NewMessageMemory(convMem),
			Notifications:   memory.NewNotificationMemory(),
			StorageBackend:  "memory",
		}
	}
	_ = ctx
	return &Repositories{
		UoWFactory:      postgres.NewPgUnitOfWorkFactory(pg),
		EscrowRead:      postgres.NewEscrowHoldRepo(pg.DB()),
		TutorRepo:       postgres.NewTutorRepo(pg.DB()),
		SubjectRepo:     postgres.NewSubjectRepo(pg.DB()),
		ProgrammeRepo:   postgres.NewProgrammeRepo(pg.DB()),
		CohortRepo:      postgres.NewCohortRepo(pg.DB()),
		StudentLink:     postgres.NewStudentLinkRepo(pg.DB()),
		TutorSubjectChk: postgres.NewTutorSubjectCheckRepo(pg.DB()),
		AuditRepo:       postgres.NewAuditLogRepo(pg.DB()),
		Orders:          postgres.NewOrderRepo(pg.DB()),
		Escrow:          postgres.NewEscrowHoldRepo(pg.DB()),
		Payouts:         postgres.NewPayoutRepo(pg.DB()),
		PrivatePackages: postgres.NewPrivatePackageRepo(pg.DB()),
		Cohorts:         postgres.NewCohortRepo(pg.DB()),
		Lessons:         postgres.NewLessonRepo(pg.DB()),
		Conversations:   postgres.NewConversationRepo(pg.DB()),
		Messages:        postgres.NewMessageRepo(pg.DB()),
		Notifications:   postgres.NewNotificationRepo(pg.DB()),
		StorageBackend:  "postgres",
	}
}

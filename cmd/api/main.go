package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/config"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/admin"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/chat"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/learning"
	"ykay-virtual/internal/domain/messaging"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/referral"
	"ykay-virtual/internal/domain/review"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"
	"ykay-virtual/internal/middleware"
	payment_provider "ykay-virtual/internal/payment"
	"ykay-virtual/internal/repository"
	"ykay-virtual/internal/repository/memory"
	"ykay-virtual/internal/repository/postgres"
	"ykay-virtual/internal/service"
	"ykay-virtual/internal/storage"
	"ykay-virtual/internal/telemetry"
	httpapi "ykay-virtual/internal/transport/http"
)

const Version = "0.4.0"

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
	Payments        payment.PaymentRepository
	Enrollments     booking.CohortEnrollmentRepository
	Escrow          payment.EscrowHoldRepository
	Payouts         payment.PayoutRepository
	PrivatePackages booking.PrivatePackageRepository
	Cohorts         booking.CohortRepository
	Lessons         booking.LessonRepository
	Conversations   messaging.ConversationRepository
	Messages        messaging.MessageRepository
	Notifications   messaging.NotificationRepository
	Blog            content.BlogPostRepository
	Redirects       content.RedirectRepository
	Testimonials    content.TestimonialRepository
	Users           identity.UserRepository
	Sessions        identity.SessionRepository
	Roles           identity.RoleRepository
	AuthTokens      identity.AuthTokenRepository
	Stats           admin.StatsRepository
	AdminBlog       content.AdminBlogRepository
	Institutions    institution.InstitutionRepository
	Referrals       referral.ReferralRepository
	Reviews         review.ReviewRepository
	SupportTickets  content.SupportTicketRepository
	Wallets         payment.WalletRepository
	Attendance      booking.AttendanceRepository
	LessonNotes     booking.LessonNoteRepository
	Resources       booking.ResourceRepository
	Assignments     booking.AssignmentRepository
	Students        identity.StudentProfileRepository
	StudentLinks    identity.ParentStudentLinkRepository
	Vetting         vetting.VettingRepository
	Learning        learning.AssessmentRepository
	Grading         learning.GradingRepository
	ProgressReports learning.ProgressReportRepository
	Analytics       learning.AnalyticsRepository
	Availability    tutor.AvailabilityRepository
	Submissions     booking.SubmissionRepository
	CohortAdmin     booking.CohortAdminRepository
	LessonAdmin     booking.LessonAdminRepository
	Chat            chat.ThreadRepository
	Devices         identity.DeviceRepository
	StorageBackend  string // "postgres" | "memory"
}

func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("config: %v", err)
	}
	ctx := context.Background()
	shutdownTracer := telemetry.InitTracer(ctx, cfg.OtelEndpoint)
	defer shutdownTracer()

	// --- Cache: Redis real → InMemory fallback (AGENTS.md) ---
	cacheBackend := setupCache(ctx, cfg.RedisURL)

	store := storage.NewLocalStorage()
	_ = store

	// --- Repositories: Postgres → in-memory fallback (dev mode) ---
	repos, readyCheck := setupRepositories(ctx, cfg)
	if repos.StorageBackend == "postgres" {
		log.Println("storage: postgres connected")
	} else {
		log.Println("storage: postgres unavailable — using in-memory store (dev mode)")
	}

	// --- Services ---
	audit := service.NewAuditService(repos.AuditRepo)

	// --- Auth + sessions ---
	authSvc := service.NewAuthService(repos.Users, repos.Sessions, repos.Roles, audit).
		WithAuthTokens(repos.AuthTokens)
	googleAuth := service.NewGoogleAuthService(service.GoogleOAuthConfig{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURL,
	}, authSvc)
	sessionAuth := middleware.SessionAuth(sessionResolverAdapter{svc: authSvc}, "ykay_session")

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
	lessonSvc := service.NewLessonService(repos.Lessons, repos.Attendance, repos.LessonNotes,
		repos.Resources, repos.Assignments)
	lessonSvc.WithRoster(repos.Enrollments, repos.Students.FindByID).
		WithTutorReader(func(ctx context.Context, id uuid.UUID) (*tutor.TutorProfile, error) {
			return repos.Vetting.GetProfileByID(ctx, id)
		})
	portalSvc := service.NewPortalService(repos.Availability, repos.Assignments, repos.Submissions,
		repos.Attendance, repos.Enrollments, repos.Lessons, repos.Orders, repos.Payments)
	onboardingSvc := service.NewOnboardingService(repos.Students, repos.StudentLinks, audit)
	contentSvc := service.NewContentService(
		repos.Blog, repos.Redirects, repos.TutorRepo, repos.ProgrammeRepo, cacheBackend).
		WithTestimonials(repos.Testimonials)
	adminSvc := service.NewAdminService(repos.Stats, repos.AdminBlog, repos.Institutions,
		repos.Referrals, repos.Reviews, audit).
		WithSupport(repos.SupportTickets).
		WithCohortAdmin(repos.CohortAdmin, repos.LessonAdmin)
	adminHandler := httpapi.NewAdminHandler(adminSvc).WithPayments(paymentSvc)
	learningSvc := service.NewLearningService(repos.Learning, repos.Grading, repos.ProgressReports,
		repos.Assignments, audit).WithNotifications(messagingSvc)
	analyticsSvc := service.NewAnalyticsService(repos.Analytics)
	supportSvc := service.NewSupportService(repos.SupportTickets)
	reviewSvc := service.NewReviewService(repos.Reviews, repos.TutorRepo, audit)
	referralSvc := service.NewReferralService(repos.Referrals, repos.Wallets, audit)
	institutionSvc := service.NewInstitutionService(repos.Institutions, audit)
	paymentSvc.WithReferrals(referralSvc)
	authSvc.WithReferrals(referralSvc)

	// --- AI assistant (phase 33) ---
	chatSvc := service.NewChatService(repos.Chat, supportSvc, repos.Users)
	if cfg.ChatbotEnabled && cfg.GeminiAPIKey != "" {
		chatSvc.WithProvider(service.NewGeminiProvider(cfg.GeminiAPIKey, cfg.GeminiModel))
		chatSvc.WithContextBuilder(buildChatContext(programmeSvc, cohortSvc, tutorSvc))
	}
	pushSvc := service.NewPushService(repos.Devices, service.NewExpoPushSender(cfg.ExpoAccessToken))
	chatSvc.WithPusher(pushSvc)
	chatHandler := httpapi.NewChatHandler(chatSvc)
	accountSvc := service.NewAccountService(repos.Users, repos.Roles, repos.Sessions,
		repos.Devices, repos.Students, repos.StudentLinks, repos.Chat, audit)
	accountHandler := httpapi.NewAccountHandler(accountSvc)
	deviceHandler := httpapi.NewDeviceHandler(pushSvc)

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
		Content:      httpapi.NewContentHandler(contentSvc),
		Auth:         httpapi.NewAuthHandler(authSvc, cfg.Environment == "production", cfg.SiteURL, googleAuth),
		Admin:        adminHandler,
		Support:      httpapi.NewSupportHandler(supportSvc),
		Growth:       httpapi.NewGrowthHandler(reviewSvc, referralSvc, institutionSvc, repos.TutorRepo),
		LessonOps:    httpapi.NewLessonOpsHandler(lessonSvc),
		Chat:         chatHandler,
		Devices:      deviceHandler,
		Account:      accountHandler,
		Onboarding:   httpapi.NewOnboardingHandler(onboardingSvc),
		Portal:       httpapi.NewPortalHandler(portalSvc),
		Learning:     httpapi.NewLearningHandler(learningSvc, analyticsSvc, lessonSvc),
		Objects:      httpapi.NewObjectHandler(store),
	}
	router := httpapi.NewRouterWithOrigins(Version, handlers, cfg.AllowedOrigins, sessionAuth, readyCheck, cfg.Environment == "production")

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router.Handler(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		fmt.Printf("NUVORA API v%s listening on :%s env=%s\n", Version, cfg.Port, cfg.Environment)
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

// getEnvDefault — env value or fallback (demo credentials are overridable;
// hardcoded secrets are removed from source per hardening SEC-003).
func getEnvDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func setupRepositories(ctx context.Context, cfg config.Config) (*Repositories, func() error) {
	pg, err := postgres.New(cfg.DatabaseURL)
	if err != nil {
		if cfg.Environment == "production" {
			// Never silently fall back to in-memory in production: a failed
			// database means the service must not serve stale/empty data.
			log.Fatalf("storage: %v", err)
		}
		log.Printf("storage: postgres unavailable — using in-memory store (dev mode)")
		store := memory.NewMemoryStore()
		store.Roles.Seed()      // mirror migration 000001 role inserts
		seedMemoryTutors(store) // mock marketplace tutors (chinasa, oluwatobi)
		seedMemoryCatalogue(store)
		seedDemoUsers(store, getEnvDefault("DEMO_PASSWORD", "password123"))
		seedLMSDemo(store) // LMS demo content (assignments, quiz, attendance)
		convMem := memory.NewConversationMemory()
		return &Repositories{
			UoWFactory:      memory.NewMemoryUnitOfWorkFactory(store),
			EscrowRead:      store.Escrow,
			CohortRepo:      store.Cohorts,
			SubjectRepo:     store.Subjects,
			ProgrammeRepo:   store.Programmes,
			TutorRepo:       store.Tutors,
			AuditRepo:       store.AuditLogs,
			Orders:          store.Orders,
			Payments:        store.Payments,
			Enrollments:     store.Enrollments,
			Escrow:          store.Escrow,
			Payouts:         store.Payouts,
			PrivatePackages: store.PrivatePkgs,
			Cohorts:         store.Cohorts,
			Lessons:         store.Lessons,
			Conversations:   convMem,
			Messages:        memory.NewMessageMemory(convMem),
			Notifications:   memory.NewNotificationMemory(),
			Blog:            store.Blogs,
			Redirects:       store.Redirects,
			Testimonials:    store.Testimonials,
			Users:           store.Users,
			Sessions:        store.Sessions,
			Roles:           store.Roles,
			AuthTokens:      memory.NewAuthTokenMemory(),
			Stats:           memory.NewStatsMemory(),
			AdminBlog:       memory.NewAdminBlogMemory(),
			Institutions:    memory.NewInstitutionMemory(),
			Referrals:       memory.NewReferralMemory(),
			Reviews:         memory.NewReviewMemory(),
			SupportTickets:  memory.NewSupportMemory(),
			Wallets:         store.Wallets,
			Attendance:      store.Attendance,
			LessonNotes:     memory.NewLessonNoteMemory(),
			Resources:       memory.NewResourceMemory(),
			Assignments:     store.Assignments,
			Students:        store.Students,
			StudentLinks:    store.StudentLinks,
			Vetting:         store.Vetting,
			Learning:        store.Learning,
			Grading:         store.Learning,
			ProgressReports: store.Learning,
			Analytics:       memory.NewAnalyticsMemory(store),
			Availability:    memory.NewAvailabilityMemory(),
			Submissions:     store.Submissions,
			Chat:            memory.NewChatMemory(),
			Devices:         memory.NewDeviceMemory(),
			CohortAdmin:     store.Cohorts,
			LessonAdmin:     store.Lessons,
			StorageBackend:  "memory",
		}, func() error { return nil } // in-memory store is always "ready"
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
		Payments:        postgres.NewPaymentRepo(pg.DB()),
		Enrollments:     postgres.NewCohortEnrollmentRepo(pg.DB()),
		Escrow:          postgres.NewEscrowHoldRepo(pg.DB()),
		Payouts:         postgres.NewPayoutRepo(pg.DB()),
		PrivatePackages: postgres.NewPrivatePackageRepo(pg.DB()),
		Cohorts:         postgres.NewCohortRepo(pg.DB()),
		Lessons:         postgres.NewLessonRepo(pg.DB()),
		Conversations:   postgres.NewConversationRepo(pg.DB()),
		Messages:        postgres.NewMessageRepo(pg.DB()),
		Notifications:   postgres.NewNotificationRepo(pg.DB()),
		Blog:            postgres.NewBlogRepo(pg.DB()),
		Redirects:       postgres.NewRedirectRepo(pg.DB()),
		Testimonials:    postgres.NewTestimonialRepo(pg.DB()),
		Users:           postgres.NewUserRepo(pg.DB()),
		Sessions:        postgres.NewSessionRepo(pg.DB()),
		Roles:           postgres.NewRoleRepo(pg.DB()),
		AuthTokens:      postgres.NewAuthTokenRepo(pg.DB()),
		Stats:           postgres.NewStatsRepo(pg.DB()),
		AdminBlog:       postgres.NewAdminBlogRepo(pg.DB()),
		Institutions:    postgres.NewInstitutionRepo(pg.DB()),
		Referrals:       postgres.NewReferralRepo(pg.DB()),
		Reviews:         postgres.NewReviewRepo(pg.DB()),
		SupportTickets:  postgres.NewSupportRepo(pg.DB()),
		Wallets:         postgres.NewWalletRepo(pg.DB()),
		Attendance:      postgres.NewAttendanceRepo(pg.DB()),
		LessonNotes:     postgres.NewLessonNoteRepo(pg.DB()),
		Resources:       postgres.NewResourceRepo(pg.DB()),
		Assignments:     postgres.NewAssignmentRepo(pg.DB()),
		Students:        postgres.NewStudentProfileRepo(pg.DB()),
		StudentLinks:    postgres.NewParentStudentLinkRepo(pg.DB()),
		Vetting:         postgres.NewVettingRepo(pg.DB()),
		Learning:        postgres.NewAssessmentRepo(pg.DB()),
		Grading:         postgres.NewGradingRepo(pg.DB()),
		ProgressReports: postgres.NewProgressReportRepo(pg.DB()),
		Analytics:       postgres.NewAnalyticsRepo(pg.DB()),
		Availability:    postgres.NewAvailabilityRepo(pg.DB()),
		Submissions:     postgres.NewSubmissionRepo(pg.DB()),
		Chat:            postgres.NewChatRepo(pg.DB()),
		Devices:         postgres.NewDeviceRepo(pg.DB()),
		CohortAdmin:     postgres.NewCohortRepo(pg.DB()),
		LessonAdmin:     postgres.NewLessonRepo(pg.DB()),
		StorageBackend:  "postgres",
	}, func() error { return pg.DB().PingContext(ctx) }
}

// sessionResolverAdapter — bridges AuthService.Me into the middleware's
// SessionResolver shape.
type sessionResolverAdapter struct {
	svc *service.AuthService
}

func (a sessionResolverAdapter) Me(ctx context.Context, tokenHash string) (uuid.UUID, []string, error) {
	user, roles, err := a.svc.Me(ctx, tokenHash)
	if err != nil {
		return uuid.Nil, nil, err
	}
	return user.ID, roles, nil
}

var _ middleware.SessionResolver = (*sessionResolverAdapter)(nil)

// seedMemoryTutors — dev-mode marketplace seeds (matches the frontend mock
// tutors chinasa/oluwatobi) so reviews, search and profiles work without
// Postgres.
func seedMemoryTutors(store *memory.MemoryStore) {
	oluwatobi := uuid.MustParse("00000000-0000-0000-0000-000000000102")
	store.Tutors.Seed(tutor.TutorSearchResult{
		Profile: tutor.TutorProfile{
			ID: oluwatobi, Slug: "oluwatobi", DisplayName: "Oluwatobi",
			Status: tutor.TutorStatusApproved, IsPublic: true,
			RatingAvg: 4.6, RatingCount: 20, RankingScore: 95.2,
			AcceptsOnline: true, AcceptsInPerson: true,
		},
		Subjects: []string{"Mathematics", "Physics"}, SubjectSlugs: []string{"mathematics", "physics"},
	})
	chinasa := uuid.MustParse("00000000-0000-0000-0000-000000000101")
	store.Tutors.Seed(tutor.TutorSearchResult{
		Profile: tutor.TutorProfile{
			ID: chinasa, Slug: "chinasa", DisplayName: "Chinasa",
			Status: tutor.TutorStatusApproved, IsPublic: true,
			RatingAvg: 4.87, RatingCount: 28, RankingScore: 98.5,
			AcceptsOnline: true, AcceptsInPerson: true,
		},
		Subjects: []string{"Mathematics", "English"}, SubjectSlugs: []string{"mathematics", "english"},
	})
}

// seedMemoryCatalogue — dev-mode curriculum catalogue (subjects +
// programmes) so catalogue pages and the tutor vetting subject picker work
// without Postgres.
func seedMemoryCatalogue(store *memory.MemoryStore) {
	mathsID := uuid.MustParse("00000000-0000-0000-0000-00000000c001")
	engID := uuid.MustParse("00000000-0000-0000-0000-00000000c002")
	physID := uuid.MustParse("00000000-0000-0000-0000-00000000c003")
	now := time.Now()
	store.Subjects.Seed(academics.Subject{ID: mathsID, Name: "Mathematics", Slug: "mathematics", Category: "Core", IsActive: true, CreatedAt: now})
	store.Subjects.Seed(academics.Subject{ID: engID, Name: "English", Slug: "english", Category: "Core", IsActive: true, CreatedAt: now})
	store.Subjects.Seed(academics.Subject{ID: physID, Name: "Physics", Slug: "physics", Category: "Sciences", IsActive: true, CreatedAt: now})

	p1 := uuid.MustParse("00000000-0000-0000-0000-00000000d001")
	p2 := uuid.MustParse("00000000-0000-0000-0000-00000000d002")
	store.Programmes.Seed(academics.Programme{ID: p1, Title: "Nigerian Curriculum (Core Maths)", Slug: "nigerian-curriculum", Format: academics.FormatCohort, Status: academics.ProgrammePublished, Currency: "NGN", IsFeatured: true, CreatedAt: now})
	store.Programmes.Seed(academics.Programme{ID: p2, Title: "British Curriculum (IGCSE Prep)", Slug: "british-curriculum", Format: academics.FormatCohort, Status: academics.ProgrammePublished, Currency: "NGN", IsFeatured: false, CreatedAt: now})

	// Demo cohorts (published) + scheduled lessons so the cohort flow works
	// end-to-end in dev (list → detail → enroll → checkout).
	oluwatobiID := uuid.MustParse("00000000-0000-0000-0000-000000000102")
	c1 := uuid.MustParse("00000000-0000-0000-0000-00000000c010")
	c2 := uuid.MustParse("00000000-0000-0000-0000-00000000c011")
	c3 := uuid.MustParse("00000000-0000-0000-0000-00000000c012")
	desc1 := "Live classes Tue/Thu/Sat evenings + weekly mock CBT."
	desc2 := "Small-group live sessions with a certified specialist."
	desc3 := "Rolling enrolment · weekend cohorts · past papers."
	store.Cohorts.Seed(&booking.Cohort{
		ID: c1, ProgrammeID: p1, Title: "UTME 2026 Mastery — 320+ Programme", Slug: "utme-2026-mastery",
		TutorProfileID: &oluwatobiID, Capacity: 60, EnrolledCount: 41,
		StartDate: now.Add(25 * 24 * time.Hour), EndDate: now.Add(145 * 24 * time.Hour),
		ScheduleDesc: &desc1, Timezone: "Africa/Lagos", LocationMode: "ONLINE",
		Fee: 35000, Currency: "NGN", Status: booking.CohortPublished,
		CreatedAt: now, UpdatedAt: now,
	})
	store.Cohorts.Seed(&booking.Cohort{
		ID: c2, ProgrammeID: p2, Title: "IGCSE Computer Science — 2026 Cohort", Slug: "igcse-computer-science",
		TutorProfileID: &oluwatobiID, Capacity: 20, EnrolledCount: 12,
		StartDate: now.Add(32 * 24 * time.Hour), EndDate: now.Add(200 * 24 * time.Hour),
		ScheduleDesc: &desc2, Timezone: "Africa/Lagos", LocationMode: "ONLINE",
		Fee: 35000, Currency: "NGN", Status: booking.CohortPublished,
		CreatedAt: now, UpdatedAt: now,
	})
	store.Cohorts.Seed(&booking.Cohort{
		ID: c3, ProgrammeID: p1, Title: "WAEC Mathematics Intensive", Slug: "waec-mathematics-intensive",
		TutorProfileID: &oluwatobiID, Capacity: 25, EnrolledCount: 17,
		StartDate: now.Add(18 * 24 * time.Hour), EndDate: now.Add(100 * 24 * time.Hour),
		ScheduleDesc: &desc3, Timezone: "Africa/Lagos", LocationMode: "HYBRID",
		Fee: 45000, Currency: "NGN", Status: booking.CohortPublished,
		CreatedAt: now, UpdatedAt: now,
	})

	// Scheduled lessons for the UTME cohort (appear on the cohort detail page).
	lessonTitles := []string{"Intro + diagnostic", "Maths: Algebra foundations", "English: Comprehension strategies"}
	lessonDesc := "Live session"
	for i, t := range lessonTitles {
		start := now.Add(time.Duration(25+i*7) * 24 * time.Hour).Add(18 * time.Hour)
		store.Lessons.Seed(&booking.Lesson{
			ID: uuid.New(), CohortID: &c1, TutorProfileID: oluwatobiID,
			Title: t, Description: &lessonDesc,
			StartAt: start, EndAt: start.Add(90 * time.Minute),
			Timezone: "Africa/Lagos", MeetingProvider: "GOOGLE_MEET",
			Status: booking.LessonScheduled, CreatedAt: now, UpdatedAt: now,
		})
	}

	// Vet competency question bank (mathematics) — dev-mode stand-in for the
	// SQL-seeded bank; correct answer is always option index 1 so e2e can
	// answer deterministically.
	bank := []struct {
		q string
		o []string
	}{
		{"What is 7 × 6?", []string{"36", "42", "48", "54"}},
		{"What is 15% of 200?", []string{"20", "30", "35", "40"}},
		{"Solve for x: 2x + 4 = 12", []string{"2", "4", "6", "8"}},
		{"What is the square root of 144?", []string{"10", "12", "14", "16"}},
		{"What is 3/4 as a decimal?", []string{"0.25", "0.75", "0.5", "1.25"}},
		{"What is the area of a 6×9 rectangle?", []string{"36", "54", "63", "72"}},
	}
	for _, item := range bank {
		store.Vetting.SeedQuestion(vetting.AssessmentQuestion{
			SubjectID: mathsID, Question: item.q, Options: item.o,
			CorrectIndex: 1, Difficulty: vetting.DiffMedium, IsActive: true,
		})
	}
}

// seedLMSDemo — LMS demo content for the seeded UTME cohort (c010) so the
// student/tutor LMS portals have real data in dev: 2 assignments, a 3-question
// auto-graded quiz, attendance rows and a graded submission for learner 0001.
func seedLMSDemo(store *memory.MemoryStore) {
	ctx := context.Background()
	now := time.Now()
	c1 := uuid.MustParse("00000000-0000-0000-0000-00000000c010")
	studentID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	tutorID := uuid.MustParse("00000000-0000-0000-0000-000000000102")
	adminID := uuid.MustParse("00000000-0000-0000-0000-0000000000a1")

	// Assignments for the UTME cohort.
	a1 := uuid.New()
	a2 := uuid.New()
	inst1 := "Solve the diagnostic worksheet and upload your working."
	inst2 := "Write a 300-word comprehension summary of the attached passage."
	due1 := now.Add(10 * 24 * time.Hour)
	due2 := now.Add(17 * 24 * time.Hour)
	max1 := 20.0
	max2 := 10.0
	store.Assignments.Seed(booking.Assignment{ID: a1, CohortID: &c1, Title: "Algebra diagnostic worksheet",
		Instructions: &inst1, DueAt: &due1, MaxScore: &max1, CreatedAt: now})
	store.Assignments.Seed(booking.Assignment{ID: a2, CohortID: &c1, Title: "Comprehension essay",
		Instructions: &inst2, DueAt: &due2, MaxScore: &max2, CreatedAt: now})

	// Auto-graded quiz (3 questions, 70% pass) for the cohort.
	quizID := uuid.New()
	quizInst := "You have 10 minutes. Passing mark: 70%."
	pass := 70.0
	_ = store.Learning.CreateAssessment(ctx, &learning.LearnerAssessment{
		ID: quizID, CohortID: &c1, TutorProfileID: tutorID,
		Title: "Week 1 diagnostic quiz", Instructions: &quizInst,
		PassThreshold: pass, Status: learning.AssessmentPublished,
		CreatedAt: now, UpdatedAt: now,
	})
	questions := []struct {
		q string
		o []string
	}{
		{"What is 7 × 6?", []string{"36", "42", "48", "54"}},
		{"Solve for x: 2x + 4 = 12", []string{"2", "4", "6", "8"}},
		{"What is 15% of 200?", []string{"20", "30", "35", "40"}},
	}
	for i, item := range questions {
		_ = store.Learning.AddQuestion(ctx, &learning.AssessmentQuestion{
			ID: uuid.New(), AssessmentID: quizID, Question: item.q,
			Options: item.o, CorrectIndex: 1, SortOrder: i,
		})
	}

	// Link the c010 lessons to learner 0001 so /me/lessons returns them,
	// and record a CONFIRMED enrollment (student portal shows the course).
	lessons, _ := store.Lessons.ListByCohort(ctx, c1, 50)
	for _, lesson := range lessons {
		store.Lessons.Seed(&lesson, studentID)
	}
	_ = store.Enrollments.Create(ctx, &booking.CohortEnrollment{
		ID: uuid.New(), CohortID: c1, StudentProfileID: studentID,
		ParentUserID: uuid.MustParse("00000000-0000-0000-0000-0000000000a2"),
		Status:       booking.EnrollmentConfirmed, EnrolledAt: now, CreatedAt: now,
	})
	if len(lessons) >= 2 {
		note1 := "Participated well in the diagnostic."
		_ = store.Attendance.Upsert(ctx, lessons[0].ID, studentID, "PRESENT", adminID, &note1)
		_ = store.Attendance.Upsert(ctx, lessons[1].ID, studentID, "LATE", adminID, nil)
	}

	// One graded submission for the first assignment.
	content := "Worksheet attached — factorisation and linear equations completed."
	score := 17.0
	feedback := "Strong on factorisation; review linear equations 4–6."
	store.Learning.SeedSubmission(learning.GradedSubmission{
		ID: uuid.New(), AssignmentID: a1, StudentProfileID: studentID,
		Content: &content, Score: &score, Feedback: &feedback,
		SubmittedAt: now.Add(-24 * time.Hour), GradedAt: &now,
	})
}

// seedDemoUsers — one account per role so every dashboard is reachable in
// dev mode. Password for all: password123.
func seedDemoUsers(store *memory.MemoryStore, demoPassword string) {
	hash, _ := bcrypt.GenerateFromPassword([]byte(demoPassword), bcrypt.DefaultCost)
	now := time.Now()
	verified := now

	users := []struct {
		id    uuid.UUID
		email string
		role  string
	}{
		{uuid.MustParse("00000000-0000-0000-0000-0000000000a1"), "admin@nuvora.com", "SUPER_ADMIN"},
		{uuid.MustParse("00000000-0000-0000-0000-0000000000a2"), "parent@nuvora.com", "PARENT"},
		{uuid.MustParse("00000000-0000-0000-0000-0000000000a3"), "tutor@nuvora.com", "TUTOR"},
		{uuid.MustParse("00000000-0000-0000-0000-0000000000a4"), "student@nuvora.com", "STUDENT"},
	}
	for _, u := range users {
		if _, err := store.Users.FindByEmail(context.Background(), u.email); err == nil {
			continue // already seeded
		}
		_ = store.Users.Create(context.Background(), &identity.User{
			ID: u.id, Email: u.email, PasswordHash: string(hash),
			Status: identity.UserStatusActive, Timezone: "Africa/Lagos",
			EmailVerifiedAt: &verified, CreatedAt: now, UpdatedAt: now,
		})
		role, _ := store.Roles.FindByName(context.Background(), u.role)
		if role != nil {
			_ = store.Roles.AssignToUser(context.Background(), u.id, role.ID)
		}
	}

	// Demo learner linked to the parent account (student dashboard + portal).
	parentID := uuid.MustParse("00000000-0000-0000-0000-0000000000a2")
	learner := identity.StudentProfile{
		ID:     uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		UserID: &parentID, FirstName: "Ada", LastName: "Bello",
		Timezone: "Africa/Lagos", GuardianConsent: true,
		CreatedAt: now, UpdatedAt: now,
	}
	_ = store.Students.Create(context.Background(), &learner)
}

// buildChatContext — grounding context for the AI assistant: a compact,
// always-current snapshot of programmes, cohorts and tutors so Gemini answers
// from live data instead of memory.
func buildChatContext(programmes *service.ProgrammeService, cohorts *service.CohortService,
	tutors *service.TutorService) func(ctx context.Context) (string, error) {
	return func(ctx context.Context) (string, error) {
		var b strings.Builder
		if progs, _, err := programmes.List(ctx, academics.ProgrammeListParams{Page: 1, PageSize: 20}); err == nil {
			b.WriteString("Programmes: ")
			for i, p := range progs {
				if i > 0 {
					b.WriteString("; ")
				}
				fmt.Fprintf(&b, "%s (slug %s, %s)", p.Title, p.Slug, p.Format)
			}
			b.WriteString(".\n")
		}
		if cohortsList, _, err := cohorts.ListPublished(ctx, booking.CohortListParams{Page: 1, PageSize: 20}); err == nil {
			b.WriteString("Cohorts: ")
			for i, c := range cohortsList {
				if i > 0 {
					b.WriteString("; ")
				}
				fmt.Fprintf(&b, "%s (id %s, %s, fee %v %s, %d/%d enrolled)",
					c.Title, c.ID, c.Status, c.Fee, c.Currency, c.EnrolledCount, c.Capacity)
			}
			b.WriteString(".\n")
		}
		if tutorList, _, err := tutors.Search(ctx, tutor.TutorSearchParams{Page: 1, PageSize: 10}); err == nil {
			b.WriteString("Tutors: ")
			for i, t := range tutorList {
				if i > 0 {
					b.WriteString("; ")
				}
				fmt.Fprintf(&b, "%s (verified %v, rating %.1f)", t.Profile.DisplayName, t.Profile.VerifiedAt != nil, t.Profile.RatingAvg)
			}
			b.WriteString(".\n")
		}
		return b.String(), nil
	}
}

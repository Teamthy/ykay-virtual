package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"

	"ykay-virtual/internal/bankdata"
	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/config"
	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/admin"
	"ykay-virtual/internal/domain/admissions"
	"ykay-virtual/internal/domain/advisor"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/cbt"
	"ykay-virtual/internal/domain/chat"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/dash"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/leads"
	"ykay-virtual/internal/domain/learning"
	"ykay-virtual/internal/domain/library"
	"ykay-virtual/internal/domain/messaging"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/plus"
	"ykay-virtual/internal/domain/plusteams"
	"ykay-virtual/internal/domain/practice"
	"ykay-virtual/internal/domain/referral"
	"ykay-virtual/internal/domain/review"
	"ykay-virtual/internal/domain/school"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"
	"ykay-virtual/internal/logx"
	"ykay-virtual/internal/meeting"
	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/notification"
	"ykay-virtual/internal/ops"
	payment_provider "ykay-virtual/internal/payment"
	"ykay-virtual/internal/realtime"
	"ykay-virtual/internal/repository"
	"ykay-virtual/internal/repository/memory"
	"ykay-virtual/internal/repository/postgres"
	"ykay-virtual/internal/service"
	"ykay-virtual/internal/storage"
	"ykay-virtual/internal/telemetry"
	httpapi "ykay-virtual/internal/transport/http"
	"ykay-virtual/internal/worker"
	"ykay-virtual/migrations"

	goredis "github.com/redis/go-redis/v9"
)

const Version = "0.4.0"

// Repositories â€” resolved dependency set (Postgres when reachable, otherwise
// the in-memory store so the API runs standalone in dev).
type Repositories struct {
	UoWFactory         repository.UnitOfWorkFactory
	EscrowRead         payment.EscrowHoldRepository
	TutorRepo          tutor.TutorRepository
	SubjectRepo        academics.SubjectRepository
	ProgrammeRepo      academics.ProgrammeRepository
	CurriculaRepo      academics.CurriculumRepository
	CohortRepo         booking.CohortRepository
	StudentLink        booking.StudentProfileReader
	TutorSubjectChk    booking.TutorProfileReader
	AuditRepo          identity.AuditLogRepository
	Orders             payment.OrderRepository
	Coupons            payment.CouponRepository
	Admissions         admissions.Repository
	SchoolCalendar     school.CalendarRepository
	Payments           payment.PaymentRepository
	Enrollments        booking.CohortEnrollmentRepository
	Escrow             payment.EscrowHoldRepository
	Payouts            payment.PayoutRepository
	PrivatePackages    booking.PrivatePackageRepository
	Cohorts            booking.CohortRepository
	Lessons            booking.LessonRepository
	Conversations      messaging.ConversationRepository
	Messages           messaging.MessageRepository
	Notifications      messaging.NotificationRepository
	Blog               content.BlogPostRepository
	Redirects          content.RedirectRepository
	Testimonials       content.TestimonialRepository
	Users              identity.UserRepository
	Sessions           identity.SessionRepository
	Roles              identity.RoleRepository
	AuthTokens         identity.AuthTokenRepository
	Stats              admin.StatsRepository
	AdminBlog          content.AdminBlogRepository
	Institutions       institution.InstitutionRepository
	Referrals          referral.ReferralRepository
	Reviews            review.ReviewRepository
	SupportTickets     content.SupportTicketRepository
	Wallets            payment.WalletRepository
	Attendance         booking.AttendanceRepository
	LessonNotes        booking.LessonNoteRepository
	Resources          booking.ResourceRepository
	Assignments        booking.AssignmentRepository
	LessonProgress     booking.LessonProgressRepository
	Students           identity.StudentProfileRepository
	StudentLinks       identity.ParentStudentLinkRepository
	Library            library.Repository
	Plus               plus.Repository
	Advisor            advisor.Repository
	PlusTeams          plusteams.Repository
	Dash               dash.Repository
	Vetting            vetting.VettingRepository
	TutorSubjects      tutor.TutorSubjectRepository
	Learning           learning.AssessmentRepository
	Leads              leads.Repository
	Exams              practice.Repository
	CBTBank            cbt.Repository
	Grading            learning.GradingRepository
	ProgressReports    learning.ProgressReportRepository
	Analytics          learning.AnalyticsRepository
	Availability       tutor.AvailabilityRepository
	Submissions        booking.SubmissionRepository
	CohortAdmin        booking.CohortAdminRepository
	LessonAdmin        booking.LessonAdminRepository
	Chat               chat.ThreadRepository
	Devices            identity.DeviceRepository
	Meeting            service.LessonMeetingRepo
	ProgrammeLifecycle academics.ProgrammeLifecycleRepository
	StorageBackend     string  // "postgres" | "memory"
	CachePrefix        string  // namespaces the shared cache per backend
	DB                 *sql.DB // raw handle (nil in memory mode) â€” boot migrations
}

func main() {
	// Container HEALTHCHECK probe: exits 0 when the process is alive.
	// (scratch images have no wget/curl; the API itself answers the probe.)
	if len(os.Args) > 1 && os.Args[1] == "-healthcheck" {
		return
	}
	_ = godotenv.Load()
	cfg := config.Load()
	logx.Setup(cfg.Environment)
	if err := cfg.Validate(); err != nil {
		logx.Fatal("config invalid", "error", err)
	}
	if !notification.EmailDeliveryConfigured() {
		slog.Error("EMAIL DELIVERY NOT CONFIGURED â€” login codes, verification links, receipts and admin MFA emails will NOT reach users. Set RESEND_API_KEY (recommended) or SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM.")
	} else {
		slog.Info("email provider active", "provider", notification.EmailProviderActive())
		slog.Info("whatsapp provider active", "provider", notification.WhatsAppProviderActive())
	}
	ctx := context.Background()
	shutdownTracer := telemetry.InitTracer(ctx, cfg.OtelEndpoint)
	defer shutdownTracer()
	telemetry.DefaultMetrics().MarkBuild(Version)

	// --- Cache: Redis real â†’ InMemory fallback (AGENTS.md) ---
	rawCache := setupCache(ctx, cfg.RedisURL, cfg.IsProduction())

	// --- Phase 5b realtime: SSE event broker. Redis pub/sub fans events
	// across API instances; without Redis the hub is local-only (events
	// reach streams on this instance; clients always have poll fallback). ---
	var realtimeRedis *goredis.Client
	if rc, ok := rawCache.(*cache.RedisCache); ok {
		realtimeRedis = rc.Raw()
	}
	eventBroker := realtime.NewBroker(realtimeRedis)
	defer eventBroker.Close()

	// --- Object storage: real S3/MinIO when configured, local otherwise.
	// In dev the guard wraps the SAME LocalStorage instance that serves the
	// /objects route, so HMAC presign signatures match. ---
	localStore := storage.NewLocalStorage()
	var store storage.Storage = localStore
	if os.Getenv("S3_ENDPOINT") != "" {
		guarded, gErr := storage.NewGuardedStorageFromEnv()
		if gErr != nil {
			logx.Fatal("storage init failed", "error", gErr)
		}
		store = guarded
	} else {
		store = storage.NewUploadGuard(localStore, nil, 0).
			WithMalwareScanner(storage.NewDefaultMalwareScanner(getEnvDefault("CLAMAV_ADDR", "")))
	}

	// --- Repositories: Postgres â†’ in-memory fallback (dev mode) ---
	repos, readyCheck := setupRepositories(ctx, cfg)
	if repos.StorageBackend == "postgres" {
		slog.Info("storage connected", "backend", "postgres")
	} else {
		slog.Warn("postgres unavailable â€” using in-memory store (dev mode)")
	}
	// Namespace the shared cache per storage backend: a Redis shared between
	// a PG instance and a memory-mode dev instance must never serve each
	// other's catalogue rows (memory seeds use synthetic ids like ...c001).
	cacheBackend := cache.WithPrefix(rawCache, repos.CachePrefix)

	// MIGRATE_ON_BOOT=true applies the embedded migration chain before the
	// server starts â€” the release image is a scratch container without the
	// migrations folder, and a fresh Render DB needs this first deploy.
	// Keep it on for the FIRST deploy only (then set false): concurrent
	// boots on multiple replicas would race the schema_migrations table.
	if getEnvDefault("MIGRATE_ON_BOOT", "") == "true" && repos.DB != nil {
		slog.Info("migrations: MIGRATE_ON_BOOT enabled, applying pending migrations")
		if n, err := migrations.ApplyUp(repos.DB); err != nil {
			logx.Fatal("migrations failed", "error", err)
		} else if n > 0 {
			slog.Info("migrations applied", "count", n)
		} else {
			slog.Info("migrations: schema already up to date")
		}
	}
	if repos.DB != nil {
		if err := ops.BootstrapOperators(repos.DB); err != nil {
			logx.Fatal("operator bootstrap failed", "error", err)
		}
	}

	// --- Services ---
	audit := service.NewAuditService(repos.AuditRepo)

	// --- Auth + sessions ---
	authSvc := service.NewAuthService(repos.Users, repos.Sessions, repos.Roles, audit).
		WithAuthTokens(repos.AuthTokens).
		WithStudentProfiles(repos.Students).
		WithDevLogging(authDevLogging(cfg)) // never in production, even if AUTH_LOG_CODES=true

	// --- Durable dispatch queue (G4.1): in PRODUCTION, Redis-up routes
	// outbound email through the worker queue (sync fallback when Redis is
	// down). Dev/staging keep synchronous delivery so console-sent codes
	// and links stay visible without a running worker. ---
	if cfg.IsProduction() {
		if jobQueue := setupJobQueue(cfg.RedisURL); jobQueue != nil {
			authSvc.WithQueue(jobQueue)
		}
	}
	// Outbound WhatsApp notifications (gap #4): enqueue to the worker when
	// Redis is available, else direct-dispatch via the configured sender.
	notifierSvc := service.NewNotifierService(
		func() worker.Queue {
			if q := setupJobQueue(cfg.RedisURL); q != nil {
				return q
			}
			return nil
		}(),
		notification.NewWhatsAppSender(),
	)
	// Conversion funnel: browsing-but-not-enrolling visitors become leads the
	// ops team follows up on WhatsApp (public capture + enrollment-started +
	// auto-CONVERTED on settlement).
	leadsSvc := service.NewLeadService(repos.Leads, notifierSvc, repos.Users, audit)
	// YK-Virtual Plus premium tier (000066): subscription entitlements + usage gates.
	plusSvc := service.NewPlusService(repos.Plus, audit).WithUnitOfWork(repos.UoWFactory)
	plusSvc.EnsureDefaultPlans(ctx)
	// YK-Virtual Plus named Learning Advisor + learning plan (000067).
	advisorSvc := service.NewAdvisorService(repos.Advisor, audit).WithPlus(plusSvc).WithUsers(repos.Users)
	// YK-Virtual Plus Teams (000069): institution seat management. Managers are the
	// institution OWNER/ADMIN (reusing the membership check) or a platform admin.
	// Student dashboard insights (000070): quote, gradebook, review queue,
	// leaderboard, feedback, prefs.
	dashSvc := service.NewDashboardInsightsService(repos.Dash).
		WithPractice(repos.Exams).WithLearning(repos.Learning).WithUsers(repos.Users)
	// (profileAuthz is created after the services block)
	_ = dashSvc
	plusTeamsSvc := service.NewPlusTeamsService(repos.PlusTeams, audit).WithUsers(repos.Users).
		WithManagerCheck(func(ctx context.Context, actorUserID, institutionID uuid.UUID, isAdmin bool) error {
			if isAdmin {
				return nil
			}
			m, err := repos.Institutions.GetMembership(ctx, institutionID, actorUserID)
			if err != nil {
				return domain.ErrForbidden
			}
			if !m.CanManage() {
				return fmt.Errorf("%w: only the institution owner or an admin can manage Plus Teams", domain.ErrForbidden)
			}
			return nil
		})
	// CBT practice exams: tutor-authored papers + timed student attempts.
	examSvc := service.NewPracticeExamService(repos.Exams, repos.Enrollments).WithPlus(plusSvc)
	// Shared CBT practice bank (000072): embedded CSV seeds the bank on first
	// boot only (idempotent — admins can curate afterwards without the seed
	// re-adding anything).
	cbtSvc := service.NewCBTService(repos.CBTBank)
	if n, err := cbtSvc.SeedIfAbsent(ctx, bankdata.CSV()); err != nil {
		slog.Warn("cbt bank seed failed", "error", err)
	} else if n > 0 {
		slog.Info("cbt bank seeded from embedded csv", "questions", n)
	}
	// Learner completion certificates (virtual-school item).
	certSvc := service.NewCertificateService(repos.UoWFactory).WithPlus(plusSvc).WithSiteURL(cfg.SiteURL).
		WithStudentReader(func(ctx context.Context, id uuid.UUID) (string, error) {
			p, err := repos.Students.FindByID(ctx, id)
			if err != nil {
				return "", err
			}
			return strings.TrimSpace(p.FirstName + " " + p.LastName), nil
		}).
		WithOwnership(
			func(ctx context.Context, userID uuid.UUID) (*identity.StudentProfile, error) {
				return repos.Students.FindByUserID(ctx, userID)
			},
			func(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error) {
				return repos.Students.ListByParentUserID(ctx, parentUserID)
			},
		)
	// Virtual-school admissions applications.
	admissionsSvc := service.NewAdmissionsService(repos.UoWFactory).
		WithOwnership(func(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error) {
			return repos.Students.ListByParentUserID(ctx, parentUserID)
		}).
		WithNotifications(repos.Users, notification.NewEmailSender(), cfg.SiteURL)
	// Virtual school, Pillar 1: academic calendar (sessions + terms).
	schoolCalSvc := service.NewSchoolCalendarService(repos.SchoolCalendar)
	googleAuth := service.NewGoogleAuthService(service.GoogleOAuthConfig{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURL,
	}, authSvc).WithStateStore(cacheBackend)
	// G7.1 session cache: 30s resolution cache in front of the DB-backed
	// resolver (logout invalidates the exact token immediately).
	sessionCache := middleware.NewCachingSessionResolver(sessionResolverAdapter{svc: authSvc}, cacheBackend)
	middleware.SetSessionCache(sessionCache)
	sessionAuth := middleware.SessionAuth(sessionCache, "ykv_session")

	tutorSvc := service.NewTutorService(repos.TutorRepo, cacheBackend)
	couponSvc := service.NewCouponService(repos.Coupons)
	bookingSvc := service.NewBookingService(repos.UoWFactory, repos.StudentLink, repos.TutorSubjectChk, audit).
		WithCoupons(couponSvc).WithLeads(leadsSvc)
	vettingSvc := service.NewVettingService(repos.UoWFactory, store, audit,
		service.SubjectReaderAdapter{Repo: repos.SubjectRepo},
		service.SearchInvalidatorAdapter{Fn: func(ctx context.Context) error { return tutorSvc.InvalidateSearchCache(ctx) }})
	providers := map[payment.PaymentProvider]payment_provider.Provider{
		payment.ProviderPaystack:    payment_provider.NewPaystack(cfg.PaystackSecret),
		payment.ProviderFlutterwave: payment_provider.NewFlutterwave(cfg.FlutterwaveSecret),
	}
	paymentSvc := service.NewPaymentService(repos.UoWFactory, providers, audit, repos.EscrowRead)
	// YK-006 fail-closed: refunds stay OFF in production unless explicitly
	// certified and enabled via PAYMENT_REFUNDS_ENABLED=true. The refund flow
	// now calls the gateway BEFORE committing (state-checked, double-refund
	// safe), so ops may enable it once the live-loop refund drill passes.
	if cfg.IsProduction() {
		if strings.EqualFold(os.Getenv("PAYMENT_REFUNDS_ENABLED"), "true") {
			paymentSvc.SetRefundsEnabled(true)
			slog.Info("refunds ENABLED (PAYMENT_REFUNDS_ENABLED=true â€” gateway-backed refund flow active)")
		} else {
			paymentSvc.SetRefundsEnabled(false)
			slog.Warn("refunds DISABLED (production default â€” set PAYMENT_REFUNDS_ENABLED=true after the refund drill, YK-006)")
		}
	}

	subjectSvc := service.NewSubjectService(repos.SubjectRepo, cacheBackend)
	curriculumSvc := service.NewCurriculumService(repos.CurriculaRepo, cacheBackend)
	programmeSvc := service.NewProgrammeService(repos.ProgrammeRepo, cacheBackend)
	cohortSvc := service.NewCohortService(repos.CohortRepo, cacheBackend)

	// --- Messaging + dashboards ---
	messagingSvc := service.NewMessagingService(
		repos.Conversations, repos.Messages, repos.Notifications,
		repos.PrivatePackages, repos.Cohorts, nil).
		WithContactDeps(repos.Vetting, repos.Enrollments, repos.Students, repos.Users).
		WithRealtime(eventBroker) // Phase 5b: instant message pokes
	dashboardSvc := service.NewDashboardService(
		repos.Orders, repos.Escrow, repos.Payouts, repos.Lessons)
	lessonSvc := service.NewLessonService(repos.Lessons, repos.Attendance, repos.LessonNotes,
		repos.Resources, repos.Assignments).
		// A-02: wire the ownership/authorization lookups so teaching-ops
		// authorization is enforced (fail-closed). Without these the service
		// refuses every ownership-checked operation rather than allowing it.
		WithTutorReader(func(ctx context.Context, id uuid.UUID) (*tutor.TutorProfile, error) {
			return repos.TutorRepo.GetByID(ctx, id)
		}).
		WithCohortReader(repos.CohortRepo.GetByID).
		WithRoster(repos.Enrollments, func(ctx context.Context, id uuid.UUID) (*identity.StudentProfile, error) {
			return repos.Students.FindByID(ctx, id)
		}).
		WithEnrollmentAccess(
			func(ctx context.Context, userID uuid.UUID) (*identity.StudentProfile, error) {
				return repos.Students.FindByUserID(ctx, userID)
			},
			func(ctx context.Context, cohortID, studentProfileID uuid.UUID) (bool, error) {
				_, err := repos.Enrollments.GetByCohortAndStudent(ctx, cohortID, studentProfileID)
				if err != nil {
					if errors.Is(err, domain.ErrNotFound) {
						return false, nil
					}
					return false, err
				}
				return true, nil
			},
		)
	portalSvc := service.NewPortalService(repos.Availability, repos.Assignments, repos.Submissions,
		repos.Attendance, repos.Enrollments, repos.Lessons, repos.Orders, repos.Payments)
	onboardingSvc := service.NewOnboardingService(repos.Students, repos.StudentLinks, audit)
	contentSvc := service.NewContentService(
		repos.Blog, repos.Redirects, repos.TutorRepo, repos.ProgrammeRepo, cacheBackend).
		WithTestimonials(repos.Testimonials)
	lmsStarterSvc := service.NewLMSStarterService(repos.Lessons, repos.Resources, repos.Assignments, repos.LessonNotes)
	adminSvc := service.NewAdminService(repos.Stats, repos.AdminBlog, repos.Institutions,
		repos.Referrals, repos.Reviews, audit).
		WithSupport(repos.SupportTickets).
		WithCohortAdmin(repos.CohortAdmin, repos.LessonAdmin).
		WithTutors(repos.TutorRepo).
		WithVetting(repos.Vetting).
		WithEnrollments(repos.Enrollments).                // pending-enrolment admin view
		WithTutorLookup(repos.Vetting.GetProfileByUserID). // user-detail tutor summary
		WithContentSignoff(repos.Testimonials, repos.ProgrammeLifecycle).
		WithCatalogueCache(cacheBackend)
	// Paystack one-click payouts (transfers) â€” explicit opt-in. The provider
	// itself fails closed unless a real PAYSTACK_SECRET is present, so a
	// placeholder secret can never fake a money-moving transfer.
	if os.Getenv("PAYSTACK_TRANSFER_ENABLED") == "true" && cfg.PaystackSecret != "" {
		adminSvc.WithTransferProvider(payment_provider.NewPaystack(cfg.PaystackSecret))
		slog.Info("payouts: Paystack transfers ENABLED (PAYSTACK_TRANSFER_ENABLED=true)")
	} else {
		slog.Info("payouts: Paystack transfers disabled (set PAYSTACK_TRANSFER_ENABLED=true to enable one-click payouts)")
	}
	adminHandler := httpapi.NewAdminHandler(adminSvc).WithPayments(paymentSvc).WithStorage(store).WithNotifier(notifierSvc).WithMail(notification.NewEmailSender())
	adminSvc.WithPayments(repos.Orders, repos.Payouts).
		WithPaymentRows(repos.Payments).
		WithStudents(repos.Students).
		WithTutorConsole(repos.SubjectRepo, repos.TutorSubjects).
		WithLMSStarter(lmsStarterSvc.EnsureCohortPack).
		WithLeads(repos.Leads)
	adminSvc.WithUsers(repos.Users, repos.Roles)
	adminSvc.WithAuditLogs(repos.AuditRepo)
	learningSvc := service.NewLearningService(repos.Learning, repos.Grading, repos.ProgressReports,
		repos.Assignments, audit).WithNotifications(messagingSvc).
		WithScope(repos.CohortRepo, repos.TutorSubjects).
		// P5 / 000068: completing a diagnostic auto-authors a Plus learning plan.
		WithDiagnosticPlanner(func(ctx context.Context, parentUserID, studentProfileID uuid.UUID,
			subject string, score, total float64) error {
			_, err := advisorSvc.GeneratePlanFromScore(ctx, parentUserID, studentProfileID, subject, score, total)
			return err
		})
	analyticsSvc := service.NewAnalyticsService(repos.Analytics)
	// On-demand recorded-lesson library (migration 000064). Public catalogue +
	// admin curation; playback gated by lesson participation per viewer.
	librarySvc := service.NewLibraryService(repos.Library, repos.Lessons).WithPlus(plusSvc).
		WithStudentResolvers(
			func(ctx context.Context, userID uuid.UUID) (*identity.StudentProfile, error) {
				return repos.Students.FindByUserID(ctx, userID)
			},
			func(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error) {
				return repos.Students.ListByParentUserID(ctx, parentUserID)
			},
		)
	supportSvc := service.NewSupportService(repos.SupportTickets).WithNotifier(notifierSvc)
	reviewSvc := service.NewReviewService(repos.Reviews, repos.TutorRepo, audit)
	referralSvc := service.NewReferralService(repos.Referrals, repos.Wallets, audit).WithUsers(repos.Users)
	institutionSvc := service.NewInstitutionService(repos.Institutions, audit).WithStudents(repos.Students)
	paymentSvc.WithReferrals(referralSvc)
	paymentSvc.WithReceipts(repos.Users, notification.NewEmailSender(), cfg.SiteURL)
	paymentSvc.WithWhatsApp(notifierSvc)
	paymentSvc.WithLeads(leadsSvc)
	paymentSvc.WithPlus(plusSvc)
	authSvc.WithReferrals(referralSvc)

	// --- AI assistant (phase 33) ---
	chatSvc := service.NewChatService(repos.Chat, supportSvc, repos.Users).WithPlus(plusSvc)
	chatSvc.WithNotifier(notifierSvc)
	chatSvc.WithContextBuilder(buildChatContext(programmeSvc, cohortSvc, tutorSvc))
	if cfg.ChatbotEnabled && cfg.GeminiAPIKey != "" {
		chatSvc.WithProvider(service.NewGeminiProvider(cfg.GeminiAPIKey, cfg.GeminiModel).
			WithGuard(cfg.AIMaxTokensPerRequest, cfg.AIDailyBudgetTokens))
		slog.Info("chat: Gemini provider enabled", "model", cfg.GeminiModel)
	} else {
		slog.Info("chat: knowledge-base replies (set GEMINI_API_KEY to enable Gemini)")
	}
	pushSvc := service.NewPushService(repos.Devices, service.NewExpoPushSender(cfg.ExpoAccessToken))
	chatSvc.WithPusher(pushSvc)
	chatHandler := httpapi.NewChatHandler(chatSvc)
	accountSvc := service.NewAccountService(repos.Users, repos.Roles, repos.Sessions,
		repos.Devices, repos.Students, repos.StudentLinks, repos.Chat, audit)
	accountHandler := httpapi.NewAccountHandler(accountSvc).WithStorage(store).
		WithMalwareScanner(storage.NewDefaultMalwareScanner(getEnvDefault("CLAMAV_ADDR", "")))
	deviceHandler := httpapi.NewDeviceHandler(pushSvc)

	// --- Transport ---
	// G1: object-level authorization â€” profile IDs resolve through the session.
	profileAuthz := httpapi.NewProfileAuthorizer(repos.Students, repos.Vetting)

	// --- Meeting links (G4.2): stub in dev, Whereby when configured ---
	meetingProvider := meeting.Provider(meeting.StubMeetingProvider{})
	meetingStub := true
	switch strings.ToLower(strings.TrimSpace(cfg.MeetingProvider)) {
	case "whereby":
		if cfg.WherebyAPIKey != "" {
			meetingProvider = meeting.NewWhereby(cfg.WherebyAPIKey)
			meetingStub = false
		}
	case "jitsi":
		meetingProvider = meeting.NewJitsi()
		meetingStub = false
	}
	// A-10: stub emits fake meet.ykvirtual.local URLs. Forbidden in production.
	// Free path: MEETING_PROVIDER=jitsi (public meet.jit.si rooms).
	telemetry.MeetingProviderStub(strings.ToLower(cfg.MeetingProvider), meetingStub)
	if meetingStub && cfg.IsProduction() {
		logx.Fatal("meeting provider resolved to STUB in production â€” set MEETING_PROVIDER=jitsi (free) or whereby + WHEREBY_API_KEY")
	}
	meetingSvc := service.NewMeetingService(repos.Meeting, meetingProvider)

	handlers := &httpapi.Handlers{
		Subjects:       httpapi.NewSubjectHandler(subjectSvc),
		Curricula:      httpapi.NewCurriculaHandler(curriculumSvc),
		Tutors:         httpapi.NewTutorHandler(tutorSvc),
		Programmes:     httpapi.NewProgrammeHandler(programmeSvc),
		Cohorts:        httpapi.NewCohortHandler(cohortSvc),
		Bookings:       httpapi.NewBookingHandler(bookingSvc),
		Coupons:        httpapi.NewCouponHandler(couponSvc),
		Notifier:       httpapi.NewNotifierHandler(notifierSvc),
		Certificates:   httpapi.NewCertificateHandler(certSvc),
		Admissions:     httpapi.NewAdmissionsHandler(admissionsSvc),
		SchoolCalendar: httpapi.NewSchoolCalendarHandler(schoolCalSvc),
		Library:        httpapi.NewLibraryHandler(librarySvc),
		Plus:           httpapi.NewPlusHandler(plusSvc),
		Advisor:        httpapi.NewAdvisorHandler(advisorSvc),
		PlusTeams:      httpapi.NewPlusTeamsHandler(plusTeamsSvc),
		Payments: httpapi.NewPaymentHandler(paymentSvc, map[payment.PaymentProvider]string{
			payment.ProviderPaystack:    cfg.PaystackSecret,
			payment.ProviderFlutterwave: cfg.FlutterwaveSecret,
		}, cfg.SiteURL),
		Vetting:      httpapi.NewVettingHandler(vettingSvc),
		AdminVetting: httpapi.NewAdminVettingHandler(vettingSvc),
		Messaging:    httpapi.NewMessagingHandler(messagingSvc),
		Dashboard:    httpapi.NewDashboardHandler(dashboardSvc, profileAuthz),
		Recommendations: httpapi.NewRecommendationHandler(
			service.NewRecommendationService(repos.Cohorts, repos.ProgrammeRepo, repos.TutorRepo, repos.Students)),
		Content:           httpapi.NewContentHandler(contentSvc),
		Auth:              httpapi.NewAuthHandlerWithCookieDomain(authSvc, cfg.Environment == "production", cfg.SiteURL, cfg.CookieDomain, googleAuth),
		SessionContext:    httpapi.NewSessionContextHandler(repos.Students, repos.Vetting),
		Admin:             adminHandler,
		Support:           httpapi.NewSupportHandler(supportSvc),
		Growth:            httpapi.NewGrowthHandler(reviewSvc, referralSvc, institutionSvc, repos.TutorRepo),
		Institutions:      httpapi.NewInstitutionHandler(institutionSvc),
		LessonOps:         httpapi.NewLessonOpsHandler(lessonSvc),
		Meeting:           httpapi.NewMeetingHandler(meetingSvc, profileAuthz),
		Chat:              chatHandler,
		Events:            httpapi.NewEventsHandler(eventBroker),
		Devices:           deviceHandler,
		Account:           accountHandler,
		Leads:             httpapi.NewLeadsHandler(leadsSvc),
		PracticeExams:     httpapi.NewPracticeExamHandler(examSvc, profileAuthz),
		CBTBank:           httpapi.NewCBTBankHandler(cbtSvc),
		Banks:             httpapi.NewBankHandler(payment_provider.NewBankResolver(cfg.PaystackSecret)),
		Onboarding:        httpapi.NewOnboardingHandler(onboardingSvc),
		Portal:            httpapi.NewPortalHandler(portalSvc, profileAuthz),
		Learning:          httpapi.NewLearningHandler(learningSvc, analyticsSvc, lessonSvc, profileAuthz),
		DashboardInsights: httpapi.NewDashboardInsightsHandler(dashSvc, profileAuthz),
		// Security CF-2: the LocalStorage object-serving route is a DEVELOPMENT
		// facility. In production, objects are served by S3/MinIO directly, so
		// the route must NOT be mounted (a nil handler leaves it unregistered in
		// the router). Mounting it in production exposed an unauthenticated file
		// read vector.
		Objects: httpapi.NewObjectHandlerForEnvironment(localStore, map[bool]string{true: "production", false: cfg.Environment}[cfg.IsProduction()]),
	}
	router := httpapi.NewRouterWithOrigins(Version, handlers, cfg.AllowedOrigins, sessionAuth, readyCheck, cfg.IsProduction())

	// G7.2 distributed rate limiting: Redis-backed counters shared across
	// API instances; the in-memory limiters remain when Redis is absent.
	if rc, ok := rawCache.(*cache.RedisCache); ok {
		router.SetRateLimiters(
			middleware.NewRedisRateLimiter(rc.Raw(), httpapi.RateLimitPerMinute(), time.Minute, "rl:global"),
			middleware.NewRedisRateLimiter(rc.Raw(), httpapi.AuthRateLimitPerMinute(), time.Minute, "rl:auth"),
		)
		slog.Info("ratelimit: Redis-backed limiters active (distributed)")
	} else {
		slog.Info("ratelimit: in-memory limiters (single instance)")
	}

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router.Handler(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("API listening", "version", Version, "port", cfg.Port, "env", cfg.Environment)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logx.Fatal("listen failed", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("shutting down")
	ctxShutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctxShutdown)
}

func setupCache(ctx context.Context, redisURL string, isProduction bool) cache.Cache {
	if rc, err := cache.NewRedis(redisURL); err == nil {
		if err := rc.Ping(ctx); err == nil {
			slog.Info("cache: redis connected", "url", redisURL)
			telemetry.RedisConnected(true)
			return rc
		}
		_ = rc.Close()
	}
	// A-13: the in-memory fallback silently degrades rate limiting, session
	// caching and the job queue to per-instance/direct behaviour â€” publish a
	// metric so ops alerting can fire on it.
	// V-002: an in-memory cache silently makes rate limiting, session
	// caching and the job queue per-instance. That is acceptable only for a
	// deliberately single-instance pilot — so in production we fail fast
	// unless the operator has explicitly accepted the single-instance
	// fallback via ALLOW_SINGLE_INSTANCE_MEMORY_FALLBACK=true.
	if isProduction && os.Getenv("ALLOW_SINGLE_INSTANCE_MEMORY_FALLBACK") != "true" {
		logx.Fatal("REDIS_URL is required in production: shared rate limits, session cache and job dispatch depend on it. For an explicitly accepted single-instance deployment set ALLOW_SINGLE_INSTANCE_MEMORY_FALLBACK=true.")
	}
	telemetry.RedisConnected(false)
	slog.Warn("cache: redis unavailable â€” falling back to in-memory cache")
	return cache.NewInMemoryCache()
}

// setupJobQueue â€” enqueue-side durable queue for the API (G4.1). Returns
// nil when Redis is unreachable (synchronous fallback everywhere).
func setupJobQueue(redisURL string) worker.Queue {
	opts, err := goredis.ParseURL(redisURL)
	if err != nil {
		return nil
	}
	client := goredis.NewClient(opts)
	pingCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(pingCtx).Err(); err != nil {
		_ = client.Close()
		slog.Warn("jobs: redis unavailable â€” direct dispatch (no queue)")
		return nil
	}
	slog.Info("jobs: redis queue connected â€” outbound messages enqueue for the worker")
	return worker.NewRedisQueue(client)
}

// getEnvDefault â€” env value or fallback (demo credentials are overridable;
// hardcoded secrets are removed from source per hardening SEC-003).
// authDevLogging â€” prints plain-text login codes / reset links to logs.
// Always false in production (AUTH_LOG_CODES cannot override). Outside
// production, codes are logged unless AUTH_LOG_CODES is explicitly false.
func authDevLogging(cfg config.Config) bool {
	if cfg.IsProduction() {
		return false
	}
	if strings.EqualFold(os.Getenv("AUTH_LOG_CODES"), "false") {
		return false
	}
	return true
}

func getEnvDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func setupRepositories(ctx context.Context, cfg config.Config) (*Repositories, func() error) {
	pg, err := postgres.New(cfg.DatabaseURL)
	if err != nil {
		if cfg.IsProduction() {
			// Never silently fall back to in-memory in production: a failed
			// database means the service must not serve stale/empty data.
			logx.Fatal("storage init failed", "error", err)
		}
		slog.Warn("postgres unavailable â€” using in-memory store (dev mode)")
		store := memory.NewMemoryStore()
		store.Roles.Seed() // mirror migration 000001 role inserts
		// Exam-hub parity: the memory learning store resolves a learner's
		// confirmed cohorts through the enrollment store.
		store.Learning.WithEnrollmentLister(func(ctx context.Context, studentProfileID uuid.UUID) ([]uuid.UUID, error) {
			out := []uuid.UUID{}
			for _, e := range store.Enrollments.All(ctx) {
				if e.StudentProfileID == studentProfileID && e.Status == booking.EnrollmentConfirmed {
					out = append(out, e.CohortID)
				}
			}
			return out, nil
		})
		// Fixture data is opt-in. It is useful for local visual development but
		// never represents launch data and must not be present by default.
		if cfg.SeedDemoData {
			slog.Warn("explicit development fixture seed enabled")
			seedMemoryTutors(store)
			seedMemoryCatalogue(store)
			seedDemoUsers(store, getEnvDefault("DEMO_PASSWORD", "password123"))
			seedLMSDemo(store)
			seedConsentedTestimonials(store)
		}
		convMem := memory.NewConversationMemory()
		return &Repositories{
			UoWFactory:         memory.NewMemoryUnitOfWorkFactory(store),
			EscrowRead:         store.Escrow,
			CohortRepo:         store.Cohorts,
			SubjectRepo:        store.Subjects,
			ProgrammeRepo:      store.Programmes,
			CurriculaRepo:      store.Curricula,
			Leads:              store.Leads,
			Exams:              memory.NewPracticeExamMemory(),
			CBTBank:            memory.NewCBTMemory(),
			TutorRepo:          store.Tutors,
			AuditRepo:          store.AuditLogs,
			Orders:             store.Orders,
			Coupons:            store.Coupons,
			Admissions:         store.Admissions,
			SchoolCalendar:     memory.NewSchoolCalendarMemory(),
			Payments:           store.Payments,
			Enrollments:        store.Enrollments,
			Escrow:             store.Escrow,
			Payouts:            store.Payouts,
			PrivatePackages:    store.PrivatePkgs,
			Cohorts:            store.Cohorts,
			Lessons:            store.Lessons,
			Conversations:      convMem,
			Messages:           memory.NewMessageMemory(convMem),
			Notifications:      memory.NewNotificationMemory(),
			Blog:               store.Blogs,
			Redirects:          store.Redirects,
			Testimonials:       store.Testimonials,
			Users:              store.Users,
			Sessions:           store.Sessions,
			Roles:              store.Roles,
			AuthTokens:         memory.NewAuthTokenMemory(),
			Stats:              memory.NewStatsMemory(),
			AdminBlog:          memory.NewAdminBlogMemory(),
			Institutions:       memory.NewInstitutionMemory(),
			Referrals:          memory.NewReferralMemory(),
			Reviews:            memory.NewReviewMemory(),
			SupportTickets:     memory.NewSupportMemory(),
			Wallets:            store.Wallets,
			Attendance:         store.Attendance,
			LessonNotes:        memory.NewLessonNoteMemory(),
			Resources:          memory.NewResourceMemory(),
			Assignments:        store.Assignments,
			LessonProgress:     memory.NewLessonProgressMemory(),
			Students:           store.Students,
			StudentLinks:       store.StudentLinks,
			StudentLink:        store.StudentLinks,
			Library:            memory.NewLibraryMemory(),
			Plus:               memory.NewPlusMemory(),
			Advisor:            memory.NewAdvisorMemory(),
			PlusTeams:          memory.NewPlusTeamsMemory(),
			Dash:               memory.NewDashMemory(),
			Vetting:            store.Vetting,
			TutorSubjects:      store.TutorSubj,
			Learning:           store.Learning,
			Grading:            store.Learning,
			ProgressReports:    store.Learning,
			Analytics:          memory.NewAnalyticsMemory(store),
			Availability:       memory.NewAvailabilityMemory(),
			Submissions:        store.Submissions,
			Chat:               memory.NewChatMemory(),
			Devices:            memory.NewDeviceMemory(),
			CohortAdmin:        store.Cohorts,
			LessonAdmin:        store.Lessons,
			Meeting:            memory.NewMeetingMemory(store.Lessons),
			ProgrammeLifecycle: memory.NewProgrammeLifecycleMemory(store.Programmes),
			StorageBackend:     "memory",
			CachePrefix:        "mem:",
		}, func() error { return nil } // in-memory store is always "ready"
	}
	_ = ctx
	return &Repositories{
		UoWFactory:         postgres.NewPgUnitOfWorkFactory(pg),
		EscrowRead:         postgres.NewEscrowHoldRepo(pg.DB()),
		TutorRepo:          postgres.NewTutorRepo(pg.DB()),
		SubjectRepo:        postgres.NewSubjectRepo(pg.DB()),
		ProgrammeRepo:      postgres.NewProgrammeRepo(pg.DB()),
		CurriculaRepo:      postgres.NewCurriculumRepo(pg.DB()),
		Leads:              postgres.NewLeadsRepo(pg.DB()),
		Exams:              postgres.NewPracticeExamRepo(pg.DB()),
		CBTBank:            postgres.NewCBTRepo(pg.DB()),
		CohortRepo:         postgres.NewCohortRepo(pg.DB()),
		StudentLink:        postgres.NewStudentLinkRepo(pg.DB()),
		TutorSubjectChk:    postgres.NewTutorSubjectCheckRepo(pg.DB()),
		AuditRepo:          postgres.NewAuditLogRepo(pg.DB()),
		Orders:             postgres.NewOrderRepo(pg.DB()),
		Coupons:            postgres.NewCouponRepo(pg.DB()),
		Admissions:         postgres.NewAdmissionsRepo(pg.DB()),
		SchoolCalendar:     postgres.NewSchoolCalendarRepo(pg.DB()),
		Payments:           postgres.NewPaymentRepo(pg.DB()),
		Enrollments:        postgres.NewCohortEnrollmentRepo(pg.DB()),
		Escrow:             postgres.NewEscrowHoldRepo(pg.DB()),
		Payouts:            postgres.NewPayoutRepo(pg.DB()),
		PrivatePackages:    postgres.NewPrivatePackageRepo(pg.DB()),
		Cohorts:            postgres.NewCohortRepo(pg.DB()),
		Lessons:            postgres.NewLessonRepo(pg.DB()),
		Conversations:      postgres.NewConversationRepo(pg.DB()),
		Messages:           postgres.NewMessageRepo(pg.DB()),
		Notifications:      postgres.NewNotificationRepo(pg.DB()),
		Blog:               postgres.NewBlogRepo(pg.DB()),
		Redirects:          postgres.NewRedirectRepo(pg.DB()),
		Testimonials:       postgres.NewTestimonialRepo(pg.DB()),
		Users:              postgres.NewUserRepo(pg.DB()),
		Sessions:           postgres.NewSessionRepo(pg.DB()),
		Roles:              postgres.NewRoleRepo(pg.DB()),
		AuthTokens:         postgres.NewAuthTokenRepo(pg.DB()),
		Stats:              postgres.NewStatsRepo(pg.DB()),
		AdminBlog:          postgres.NewAdminBlogRepo(pg.DB()),
		Institutions:       postgres.NewInstitutionRepo(pg.DB()),
		Referrals:          postgres.NewReferralRepo(pg.DB()),
		Reviews:            postgres.NewReviewRepo(pg.DB()),
		SupportTickets:     postgres.NewSupportRepo(pg.DB()),
		Wallets:            postgres.NewWalletRepo(pg.DB()),
		Attendance:         postgres.NewAttendanceRepo(pg.DB()),
		LessonNotes:        postgres.NewLessonNoteRepo(pg.DB()),
		Resources:          postgres.NewResourceRepo(pg.DB()),
		Assignments:        postgres.NewAssignmentRepo(pg.DB()),
		LessonProgress:     postgres.NewLessonProgressRepo(pg.DB()),
		Students:           postgres.NewStudentProfileRepo(pg.DB()),
		StudentLinks:       postgres.NewParentStudentLinkRepo(pg.DB()),
		Library:            postgres.NewLibraryRepo(pg.DB()),
		Plus:               postgres.NewPlusRepo(pg.DB()),
		Advisor:            postgres.NewAdvisorRepo(pg.DB()),
		PlusTeams:          postgres.NewPlusTeamsRepo(pg.DB()),
		Dash:               postgres.NewDashRepo(pg.DB()),
		Vetting:            postgres.NewVettingRepo(pg.DB()),
		TutorSubjects:      postgres.NewTutorSubjectRepo(pg.DB()),
		Learning:           postgres.NewAssessmentRepo(pg.DB()),
		Grading:            postgres.NewGradingRepo(pg.DB()),
		ProgressReports:    postgres.NewProgressReportRepo(pg.DB()),
		Analytics:          postgres.NewAnalyticsRepo(pg.DB()),
		Availability:       postgres.NewAvailabilityRepo(pg.DB()),
		Submissions:        postgres.NewSubmissionRepo(pg.DB()),
		Chat:               postgres.NewChatRepo(pg.DB()),
		Devices:            postgres.NewDeviceRepo(pg.DB()),
		CohortAdmin:        postgres.NewCohortRepo(pg.DB()),
		LessonAdmin:        postgres.NewLessonRepo(pg.DB()),
		Meeting:            postgres.NewMeetingRepo(pg.DB()),
		ProgrammeLifecycle: postgres.NewProgrammeLifecycleRepo(pg.DB()),
		StorageBackend:     "postgres",
		CachePrefix:        "pg:",
		DB:                 pg.DB(),
	}, func() error { return pg.DB().PingContext(ctx) }
}

// sessionResolverAdapter â€” bridges AuthService.Me into the middleware's
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

// seedConsentedTestimonials â€” dev-mode testimonials that MIRROR PRODUCTION
// RULES: every row has consent_given + a consent source recorded, and only
// then is it published (G5.3). The web carousel consumes these through the
// consent-gated /content/testimonials endpoint â€” identical data path to prod.
func seedConsentedTestimonials(store *memory.MemoryStore) {
	now := time.Now()
	store.Testimonials.Seed(content.Testimonial{
		AuthorName: "Mrs. Soetan", AuthorLocation: strPtr("Lekki, Lagos"),
		Body:   "My daughter scored among the highest in her common entrance exam into a top school and got admitted the same day! It's been very gratifying to see her improve under her tutor, to the point where she now contends with the top students in class.",
		Rating: intPtr(5), IsFeatured: true, ConsentGiven: true, IsPublic: true,
		ConsentSource: strPtr("demo-consent-form-v1"), ConsentDate: &now,
		PublishedAt: &now, CreatedAt: now,
	})
	store.Testimonials.Seed(content.Testimonial{
		AuthorName: "Mrs. Alice", AuthorLocation: strPtr("Uyo, AkwaIbom"),
		Body:   "The lessons have been very productive. My son's grades have really improved, and even his school teachers commend his new confidence. He now answers questions in class, and scores higher than most of his classmates.",
		Rating: intPtr(5), IsFeatured: true, ConsentGiven: true, IsPublic: true,
		ConsentSource: strPtr("demo-consent-form-v1"), ConsentDate: &now,
		PublishedAt: &now, CreatedAt: now,
	})
	store.Testimonials.Seed(content.Testimonial{
		AuthorName: "Pamilerin", AuthorLocation: strPtr("Wuse, Abuja"),
		Body:   "Mr. Wisdom who is teaching my son is very knowledgeable in his field. He is also very patient and has been able to make my son always look forward to having learning sessions with him.",
		Rating: intPtr(5), IsFeatured: false, ConsentGiven: true, IsPublic: true,
		ConsentSource: strPtr("demo-consent-form-v1"), ConsentDate: &now,
		PublishedAt: &now, CreatedAt: now,
	})
}

func strPtr(s string) *string { return &s }
func intPtr(i int) *int       { return &i }

// seedMemoryTutors â€” explicit local-development fixture data (matches the frontend mock
// tutors chinasa/oluwatobi) so reviews, search and profiles work without
// Postgres.
func seedMemoryTutors(store *memory.MemoryStore) {
	oluwatobi := uuid.MustParse("00000000-0000-0000-0000-000000000102")
	demoTutorUser := uuid.MustParse("00000000-0000-0000-0000-0000000000a3")
	store.Tutors.Seed(tutor.TutorSearchResult{
		Profile: tutor.TutorProfile{
			ID: oluwatobi, UserID: demoTutorUser, Slug: "oluwatobi", DisplayName: "Oluwatobi",
			Status: tutor.TutorStatusApproved, IsPublic: true,
			RatingAvg: 4.6, RatingCount: 20, RankingScore: 95.2,
			AcceptsOnline: true, AcceptsInPerson: true,
		},
		Subjects: []string{"Mathematics", "Physics"}, SubjectSlugs: []string{"mathematics", "physics"},
	})
	// Mirror into the vetting store so the demo tutor's SESSION resolves to
	// this profile (G1.2: ResolveTutor â†’ GetProfileByUserID). Without this
	// link the demo tutor's own-lesson/earnings surfaces 403 in dev.
	store.Vetting.SeedProfile(&tutor.TutorProfile{
		ID: oluwatobi, UserID: demoTutorUser, Slug: "oluwatobi",
		DisplayName: "Oluwatobi", Status: tutor.TutorStatusApproved, IsPublic: true,
		RatingAvg: 4.6, RatingCount: 20, RankingScore: 95.2, Currency: "NGN",
		Timezone: "Africa/Lagos", AcceptsOnline: true, AcceptsInPerson: true,
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
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

// seedMemoryCatalogue â€” dev-mode curriculum catalogue (subjects +
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

	// Curricula + levels (mirrors migration 000052) so learner "current
	// level" dropdowns work in dev mode.
	nigID := uuid.MustParse("00000000-0000-0000-0000-00000000b001")
	britID := uuid.MustParse("00000000-0000-0000-0000-00000000b002")
	store.Curricula.SeedCurriculum(academics.Curriculum{ID: nigID, Name: "Nigerian Curriculum", Slug: "nigerian", IsActive: true, CreatedAt: now})
	store.Curricula.SeedCurriculum(academics.Curriculum{ID: britID, Name: "British Curriculum", Slug: "british", IsActive: true, CreatedAt: now})
	nigerianLevels := []struct {
		name string
		slug string
		ord  int
	}{
		{"Primary 1", "primary-1", 10}, {"Primary 2", "primary-2", 11}, {"Primary 3", "primary-3", 12},
		{"Primary 4", "primary-4", 13}, {"Primary 5", "primary-5", 14}, {"Primary 6", "primary-6", 15},
		{"JSS1", "jss1", 20}, {"JSS2", "jss2", 21}, {"JSS3", "jss3", 22},
		{"SSS1", "sss1", 30}, {"SSS2", "sss2", 31}, {"SSS3", "sss3", 32},
	}
	for _, l := range nigerianLevels {
		store.Curricula.SeedLevel(academics.Level{ID: uuid.New(), CurriculumID: nigID, Name: l.name, Slug: l.slug, SortOrder: l.ord})
	}
	britishLevels := []struct {
		name string
		slug string
		ord  int
	}{
		{"Reception", "reception", 5},
		{"Year 1", "year-1", 11}, {"Year 2", "year-2", 12}, {"Year 3", "year-3", 13},
		{"Year 4", "year-4", 14}, {"Year 5", "year-5", 15}, {"Year 6", "year-6", 16},
		{"Year 7", "year-7", 17}, {"Year 8", "year-8", 18}, {"Year 9", "year-9", 19},
		{"Year 10", "year-10", 20}, {"Year 11", "year-11", 21},
		{"Year 12", "year-12", 30}, {"Year 13", "year-13", 31},
	}
	for _, l := range britishLevels {
		store.Curricula.SeedLevel(academics.Level{ID: uuid.New(), CurriculumID: britID, Name: l.name, Slug: l.slug, SortOrder: l.ord})
	}

	p1 := uuid.MustParse("00000000-0000-0000-0000-00000000d001")
	p2 := uuid.MustParse("00000000-0000-0000-0000-00000000d002")
	store.Programmes.Seed(academics.Programme{ID: p1, Title: "Nigerian Curriculum (Core Maths)", Slug: "nigerian-curriculum", Format: academics.FormatCohort, Status: academics.ProgrammePublished, Currency: "NGN", IsFeatured: true, CreatedAt: now})
	store.Programmes.Seed(academics.Programme{ID: p2, Title: "British Curriculum (IGCSE Prep)", Slug: "british-curriculum", Format: academics.FormatCohort, Status: academics.ProgrammePublished, Currency: "NGN", IsFeatured: false, CreatedAt: now})

	// Demo cohorts (published) + scheduled lessons so the cohort flow works
	// end-to-end in dev (list â†’ detail â†’ enroll â†’ checkout).
	oluwatobiID := uuid.MustParse("00000000-0000-0000-0000-000000000102")
	c1 := uuid.MustParse("00000000-0000-0000-0000-00000000c010")
	c2 := uuid.MustParse("00000000-0000-0000-0000-00000000c011")
	c3 := uuid.MustParse("00000000-0000-0000-0000-00000000c012")
	desc1 := "Live classes Tue/Thu/Sat evenings + weekly mock CBT."
	desc2 := "Small-group live sessions with a certified specialist."
	desc3 := "Rolling enrolment Â· weekend cohorts Â· past papers."
	store.Cohorts.Seed(&booking.Cohort{
		ID: c1, ProgrammeID: p1, Title: "UTME 2026 Mastery â€” 320+ Programme", Slug: "utme-2026-mastery",
		TutorProfileID: &oluwatobiID, Capacity: 60, EnrolledCount: 41,
		StartDate: now.Add(25 * 24 * time.Hour), EndDate: now.Add(145 * 24 * time.Hour),
		ScheduleDesc: &desc1, Timezone: "Africa/Lagos", LocationMode: "ONLINE",
		Fee: 35000, Currency: "NGN", Status: booking.CohortPublished,
		CreatedAt: now, UpdatedAt: now,
	})
	store.Cohorts.Seed(&booking.Cohort{
		ID: c2, ProgrammeID: p2, Title: "IGCSE Computer Science â€” 2026 Cohort", Slug: "igcse-computer-science",
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

	// Vet competency question bank (mathematics) â€” dev-mode stand-in for the
	// SQL-seeded bank; correct answer is always option index 1 so e2e can
	// answer deterministically.
	bank := []struct {
		q string
		o []string
	}{
		{"What is 7 Ã— 6?", []string{"36", "42", "48", "54"}},
		{"What is 15% of 200?", []string{"20", "30", "35", "40"}},
		{"Solve for x: 2x + 4 = 12", []string{"2", "4", "6", "8"}},
		{"What is the square root of 144?", []string{"10", "12", "14", "16"}},
		{"What is 3/4 as a decimal?", []string{"0.25", "0.75", "0.5", "1.25"}},
		{"What is the area of a 6Ã—9 rectangle?", []string{"36", "54", "63", "72"}},
	}
	for _, item := range bank {
		store.Vetting.SeedQuestion(vetting.AssessmentQuestion{
			SubjectID: mathsID, Question: item.q, Options: item.o,
			CorrectIndex: 1, Difficulty: vetting.DiffMedium, IsActive: true,
		})
	}
}

// seedLMSDemo â€” LMS demo content for the seeded UTME cohort (c010) so the
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
		{"What is 7 Ã— 6?", []string{"36", "42", "48", "54"}},
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
	content := "Worksheet attached â€” factorisation and linear equations completed."
	score := 17.0
	feedback := "Strong on factorisation; review linear equations 4â€“6."
	store.Learning.SeedSubmission(learning.GradedSubmission{
		ID: uuid.New(), AssignmentID: a1, StudentProfileID: studentID,
		Content: &content, Score: &score, Feedback: &feedback,
		SubmittedAt: now.Add(-24 * time.Hour), GradedAt: &now,
	})
}

// seedDemoUsers â€” explicit local-development fixtures only. Never enable these
// accounts in staging or production. Password is provided only through DEMO_PASSWORD.
func seedDemoUsers(store *memory.MemoryStore, demoPassword string) {
	hash, _ := bcrypt.GenerateFromPassword([]byte(demoPassword), bcrypt.DefaultCost)
	now := time.Now()
	verified := now

	users := []struct {
		id    uuid.UUID
		email string
		role  string
	}{
		{uuid.MustParse("00000000-0000-0000-0000-0000000000a1"), "admin@ykaycollege.com", "SUPER_ADMIN"},
		{uuid.MustParse("00000000-0000-0000-0000-0000000000a2"), "parent@ykaycollege.com", "PARENT"},
		{uuid.MustParse("00000000-0000-0000-0000-0000000000a3"), "tutor@ykaycollege.com", "TUTOR"},
		{uuid.MustParse("00000000-0000-0000-0000-0000000000a4"), "student@ykaycollege.com", "STUDENT"},
	}
	for _, u := range users {
		if _, err := store.Users.FindByEmail(context.Background(), u.email); err == nil {
			continue // already seeded
		}
		_ = store.Users.Create(context.Background(), &identity.User{
			ID: u.id, Email: u.email, PasswordHash: string(hash),
			Status: identity.UserStatusActive, Timezone: "Africa/Lagos",
			EmailVerifiedAt: &verified,
			// OnboardedAt set so demo logins route straight to the role
			// dashboard instead of the first-time onboarding wizard (G6 fix:
			// "login not routing properly" â€” seed accounts were active but not
			// marked onboarded, so destinationFor sent them to /onboarding).
			OnboardedAt: &now,
			CreatedAt:   now, UpdatedAt: now,
		})
		role, _ := store.Roles.FindByName(context.Background(), u.role)
		if role != nil {
			_ = store.Roles.AssignToUser(context.Background(), u.id, role.ID)
		}
	}

	// Demo learner: owned by the demo STUDENT account (a4) and linked to the
	// demo PARENT account (a2) via a parent_student_link â€” mirrors the G1
	// session-resolution rules (student sees own profile; parent sees links).
	parentID := uuid.MustParse("00000000-0000-0000-0000-0000000000a2")
	studentUserID := uuid.MustParse("00000000-0000-0000-0000-0000000000a4")
	learner := identity.StudentProfile{
		ID:     uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		UserID: &studentUserID, FirstName: "Ada", LastName: "Bello",
		Timezone: "Africa/Lagos", GuardianConsent: true,
		CreatedAt: now, UpdatedAt: now,
	}
	_ = store.Students.Create(context.Background(), &learner)
	_ = store.StudentLinks.Create(context.Background(), &identity.ParentStudentLink{
		ID: uuid.New(), ParentUserID: parentID, StudentProfileID: learner.ID,
		Relationship: "PARENT", IsPrimary: true, CreatedAt: now,
	})
}

// buildChatContext â€” grounding context for the AI assistant: a compact,
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

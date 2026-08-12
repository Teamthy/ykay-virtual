package httpapi

import (
	"encoding/json"
	"net/http"
	"time"

	"ykay-virtual/internal/middleware"
	"ykay-virtual/pkg"
)

// Router assembles the API: middleware chain (request-id → logger → recover →
// rate-limit) + versioned routes per api/openapi.yaml.

type Router struct {
	mux            *http.ServeMux
	rateLimiter    *middleware.RateLimiter
	authLimiter    *middleware.RateLimiter
	Version        string
	allowedOrigins string
	sessionAuth    func(http.Handler) http.Handler
	readyCheck     func() error
	blockFrames    bool
}

// NewRouter — fail-closed defaults (no cross-origin) + no frame blocking.
func NewRouter(version string, handlers *Handlers, sessionAuth func(http.Handler) http.Handler, readyCheck func() error) *Router {
	return NewRouterWithOrigins(version, handlers, "", sessionAuth, readyCheck, false)
}

// NewRouterWithOrigins — explicit CORS allowlist, auth-route rate limiter,
// liveness/readiness endpoints and optional frame blocking (production).
func NewRouterWithOrigins(version string, handlers *Handlers, allowedOrigins string, sessionAuth func(http.Handler) http.Handler, readyCheck func() error, blockFrames bool) *Router {
	mux := http.NewServeMux()
	rl := middleware.NewRateLimiter(300, time.Minute)    // sliding window: 300 req/min default
	authRL := middleware.NewRateLimiter(40, time.Minute) // auth endpoints: 40 req/min per IP (SEC-005)
	authRate := func(h http.HandlerFunc) http.HandlerFunc { return authRL.Middleware(h).ServeHTTP }

	// Health: /health (basic), /health/live (process), /health/ready (deps)
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "ok", "version": version, "time": time.Now().UTC(),
		})
	})
	mux.HandleFunc("GET /health/live", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok"})
	})
	mux.HandleFunc("GET /health/ready", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if readyCheck != nil {
			if err := readyCheck(); err != nil {
				w.WriteHeader(http.StatusServiceUnavailable)
				_ = json.NewEncoder(w).Encode(map[string]any{"status": "not_ready", "reason": err.Error()})
				return
			}
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"status": "ready"})
	})

	v1 := "/api/v1"

	// Auth + sessions (Phase 7)
	mux.HandleFunc("POST "+v1+"/auth/register", authRate(handlers.Auth.Register))
	mux.HandleFunc("POST "+v1+"/auth/login", authRate(handlers.Auth.Login))
	mux.HandleFunc("POST "+v1+"/auth/logout", handlers.Auth.Logout)
	mux.HandleFunc("GET "+v1+"/auth/me", handlers.Auth.Me)
	mux.HandleFunc("POST "+v1+"/auth/verify-email/request", authRate(handlers.Auth.ResendVerification))
	mux.HandleFunc("POST "+v1+"/auth/verify-email/confirm", handlers.Auth.ConfirmVerification)
	mux.HandleFunc("POST "+v1+"/auth/password-reset/request", authRate(handlers.Auth.RequestPasswordReset))
	mux.HandleFunc("POST "+v1+"/auth/password-reset/confirm", authRate(handlers.Auth.ConfirmPasswordReset))
	mux.HandleFunc("POST "+v1+"/auth/login-code/request", authRate(handlers.Auth.RequestLoginCode))
	mux.HandleFunc("POST "+v1+"/auth/login-code/confirm", authRate(handlers.Auth.ConfirmLoginCode))
	mux.HandleFunc("GET "+v1+"/auth/google/url", handlers.Auth.GoogleAuthURL)
	mux.HandleFunc("GET "+v1+"/auth/google/callback", handlers.Auth.GoogleCallback)
	mux.HandleFunc("POST "+v1+"/auth/google/exchange", authRate(handlers.Auth.GoogleExchange))
	mux.HandleFunc("POST "+v1+"/auth/login/mobile", authRate(handlers.Auth.MobileLogin))
	mux.HandleFunc("POST "+v1+"/auth/login-code/mobile/confirm", authRate(handlers.Auth.MobileLoginCodeConfirm))
	mux.HandleFunc("POST "+v1+"/auth/me/role", handlers.Auth.SetRole)
	mux.HandleFunc("POST "+v1+"/auth/me/password", handlers.Auth.ChangePassword)

	// AI assistant + human handoff (phase 33)
	mux.HandleFunc("POST "+v1+"/chat/threads", handlers.Chat.CreateThread)
	mux.HandleFunc("GET "+v1+"/chat/threads", handlers.Chat.ListThreads)
	mux.HandleFunc("GET "+v1+"/chat/threads/{threadId}/messages", handlers.Chat.ListMessages)
	mux.HandleFunc("POST "+v1+"/chat/threads/{threadId}/messages", authRate(handlers.Chat.SendMessage))
	mux.HandleFunc("POST "+v1+"/chat/threads/{threadId}/escalate", handlers.Chat.Escalate)
	mux.HandleFunc("POST "+v1+"/chat/threads/{threadId}/rating", handlers.Chat.RateThread)

	// Account hub (phase 37)
	mux.HandleFunc("PUT "+v1+"/auth/me/profile", handlers.Account.UpdateProfile)
	mux.HandleFunc("GET "+v1+"/auth/me/export", handlers.Account.ExportData)
	mux.HandleFunc("POST "+v1+"/auth/me/delete", handlers.Account.DeleteAccount)

	// Push devices (M4)
	mux.HandleFunc("POST "+v1+"/me/devices", handlers.Devices.RegisterDevice)
	mux.HandleFunc("GET "+v1+"/me/devices", handlers.Devices.ListDevices)
	mux.HandleFunc("DELETE "+v1+"/me/devices/{deviceId}", handlers.Devices.RemoveDevice)

	// Agent inbox (C4–C6)
	mux.HandleFunc("GET "+v1+"/admin/chat/threads", handlers.Chat.ListAllThreads)
	mux.HandleFunc("GET "+v1+"/admin/chat/threads/{threadId}/messages", handlers.Chat.ListThreadMessages)
	mux.HandleFunc("POST "+v1+"/admin/chat/threads/{threadId}/reply", handlers.Chat.AgentReply)
	mux.HandleFunc("POST "+v1+"/admin/chat/threads/{threadId}/close", handlers.Chat.CloseThread)
	mux.HandleFunc("GET "+v1+"/admin/chat/analytics", handlers.Chat.ChatAnalytics)
	mux.HandleFunc("GET "+v1+"/admin/chat/csat.csv", handlers.Chat.CSATExport)
	mux.HandleFunc("GET "+v1+"/admin/chat/analytics/trends", handlers.Chat.ChatTrends)

	// Catalogue (public, cached 60-300s)
	mux.HandleFunc("GET "+v1+"/subjects", handlers.Subjects.List)
	mux.HandleFunc("GET "+v1+"/subjects/{slug}", handlers.Subjects.GetBySlug)
	mux.HandleFunc("GET "+v1+"/tutors/search", handlers.Tutors.Search)
	mux.HandleFunc("GET "+v1+"/tutors/{slug}", handlers.Tutors.GetBySlug)
	mux.HandleFunc("GET "+v1+"/programmes", handlers.Programmes.List)
	mux.HandleFunc("GET "+v1+"/programmes/{slug}", handlers.Programmes.GetBySlug)
	mux.HandleFunc("GET "+v1+"/programmes/{slug}/tutors", handlers.Programmes.Tutors)
	mux.HandleFunc("GET "+v1+"/cohorts", handlers.Cohorts.List)
	mux.HandleFunc("GET "+v1+"/cohorts/{id}", handlers.Cohorts.GetByID)
	mux.HandleFunc("GET "+v1+"/cohorts/{id}/lessons", handlers.LessonOps.ListCohortLessons)
	mux.HandleFunc("GET "+v1+"/cohorts/{id}/resources", handlers.LessonOps.ListResources)
	mux.HandleFunc("GET "+v1+"/cohorts/{id}/assignments", handlers.LessonOps.ListAssignments)
	mux.HandleFunc("POST "+v1+"/cohorts/{id}/assignments", handlers.LessonOps.CreateAssignment)
	mux.HandleFunc("POST "+v1+"/cohorts/{id}/resources", handlers.LessonOps.CreateResource)
	mux.HandleFunc("GET "+v1+"/cohorts/{id}/enrollments", handlers.LessonOps.ListCohortEnrollments)
	mux.HandleFunc("POST "+v1+"/lessons/{lessonId}/attendance", handlers.LessonOps.MarkAttendance)
	mux.HandleFunc("GET "+v1+"/lessons/{lessonId}/attendance", handlers.LessonOps.ListAttendance)
	mux.HandleFunc("POST "+v1+"/lessons/{lessonId}/notes", handlers.LessonOps.AddNote)
	mux.HandleFunc("GET "+v1+"/lessons/{lessonId}/notes", handlers.LessonOps.ListNotes)

	// Bookings + payments (Phase 3)
	mux.HandleFunc("POST "+v1+"/bookings", handlers.Bookings.Create)
	mux.HandleFunc("POST "+v1+"/payments/initiate", handlers.Payments.Initiate)
	mux.HandleFunc("POST "+v1+"/payments/webhooks/{provider}", handlers.Payments.Webhook)

	// Tutor vetting (Phase 4)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/profile", handlers.Vetting.CreateProfile)
	mux.HandleFunc("GET "+v1+"/tutors/me/vetting/profile", handlers.Vetting.GetMyProfile)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/profiles/{profileId}/subjects", handlers.Vetting.AddSubject)
	mux.HandleFunc("GET "+v1+"/tutors/me/vetting/profiles/{profileId}/subjects", handlers.Vetting.ListMySubjects)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/profiles/{profileId}/submit", handlers.Vetting.Submit)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/profiles/{profileId}/documents", handlers.Vetting.RequestDocumentUpload)
	mux.HandleFunc("GET "+v1+"/tutors/me/vetting/documents/{documentId}", handlers.Vetting.GetDocumentURL)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/profiles/{profileId}/assessments", handlers.Vetting.StartAssessment)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/assessments/{attemptId}/submit", handlers.Vetting.SubmitAssessment)

	// Admin vetting queue (Phase 4)
	mux.HandleFunc("GET "+v1+"/admin/vetting/queue", handlers.AdminVetting.ListQueue)
	mux.HandleFunc("GET "+v1+"/admin/vetting/profiles/{profileId}", handlers.AdminVetting.GetProfile)
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/review", handlers.AdminVetting.action("review"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/interview", handlers.AdminVetting.action("interview"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/verify", handlers.AdminVetting.action("verify"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/approve", handlers.AdminVetting.action("approve"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/reject", handlers.AdminVetting.action("reject"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/hold", handlers.AdminVetting.action("hold"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/suspend", handlers.AdminVetting.action("suspend"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/documents/{documentId}/review", handlers.AdminVetting.ReviewDocument)

	// Messaging + notifications (Phase 5)
	mux.HandleFunc("GET "+v1+"/me/conversations", handlers.Messaging.ListConversations)
	mux.HandleFunc("POST "+v1+"/me/conversations", handlers.Messaging.CreateConversation)
	mux.HandleFunc("GET "+v1+"/me/conversations/{conversationId}/messages", handlers.Messaging.ListMessages)
	mux.HandleFunc("POST "+v1+"/me/conversations/{conversationId}/messages", handlers.Messaging.SendMessage)
	mux.HandleFunc("POST "+v1+"/me/conversations/{conversationId}/read", handlers.Messaging.MarkRead)
	mux.HandleFunc("GET "+v1+"/me/notifications", handlers.Messaging.ListNotifications)
	mux.HandleFunc("GET "+v1+"/me/notifications/unread-count", handlers.Messaging.UnreadCount)
	mux.HandleFunc("POST "+v1+"/me/notifications/{notificationId}/read", handlers.Messaging.MarkNotificationRead)
	mux.HandleFunc("POST "+v1+"/me/notifications/read-all", handlers.Messaging.MarkAllRead)

	// Content engine (Phase 6 SEO)
	mux.HandleFunc("GET "+v1+"/content/testimonials", handlers.Content.ListTestimonials)
	mux.HandleFunc("POST "+v1+"/admin/testimonials", handlers.Content.CreateTestimonial)
	mux.HandleFunc("GET "+v1+"/content/blog", handlers.Content.ListPosts)
	mux.HandleFunc("GET "+v1+"/content/blog/{slug}", handlers.Content.GetPost)
	mux.HandleFunc("GET "+v1+"/subjects/{slug}/related", handlers.Content.Related)
	mux.HandleFunc("GET "+v1+"/redirects/{slug}", handlers.Content.ResolveRedirect)

	// Dashboards (Phase 5 portals)
	mux.HandleFunc("GET "+v1+"/me/orders", handlers.Dashboard.MyOrders)
	mux.HandleFunc("GET "+v1+"/me/lessons", handlers.Dashboard.MyLessons)
	mux.HandleFunc("GET "+v1+"/me/tutor-lessons", handlers.Dashboard.MyTutorLessons)
	mux.HandleFunc("GET "+v1+"/me/earnings", handlers.Dashboard.MyEarnings)

	// Learning, Assessment & Reporting (Phase 11c)
	mux.HandleFunc("POST "+v1+"/learning/assessments", handlers.Learning.CreateAssessment)
	mux.HandleFunc("GET "+v1+"/learning/assessments", handlers.Learning.ListAssessments)
	mux.HandleFunc("POST "+v1+"/learning/assessments/{id}/start", handlers.Learning.StartAssessment)
	mux.HandleFunc("POST "+v1+"/learning/assessments/{id}/submit", handlers.Learning.SubmitAssessment)
	mux.HandleFunc("GET "+v1+"/learning/assignments/{assignmentId}/submissions", handlers.Learning.ListSubmissions)
	mux.HandleFunc("POST "+v1+"/learning/submissions/{submissionId}/grade", handlers.Learning.GradeSubmission)
	mux.HandleFunc("POST "+v1+"/learning/progress-reports", handlers.Learning.CreateProgressReport)
	mux.HandleFunc("GET "+v1+"/learning/progress-reports", handlers.Learning.ListProgressReports)
	mux.HandleFunc("GET "+v1+"/admin/analytics", handlers.Learning.Analytics)
	mux.HandleFunc("GET "+v1+"/admin/reports/attendance.csv", handlers.Learning.AttendanceCSV)
	mux.HandleFunc("GET "+v1+"/admin/reports/revenue.csv", handlers.Learning.RevenueCSV)

	// Portal surfaces (Phase 11b)
	mux.HandleFunc("GET "+v1+"/me/availability", handlers.Portal.ListAvailability)
	mux.HandleFunc("POST "+v1+"/me/availability", handlers.Portal.UpsertAvailability)
	mux.HandleFunc("DELETE "+v1+"/me/availability/{id}", handlers.Portal.DeleteAvailability)
	mux.HandleFunc("GET "+v1+"/me/availability-exceptions", handlers.Portal.ListExceptions)
	mux.HandleFunc("POST "+v1+"/me/availability-exceptions", handlers.Portal.UpsertException)
	mux.HandleFunc("DELETE "+v1+"/me/availability-exceptions/{id}", handlers.Portal.DeleteException)
	mux.HandleFunc("GET "+v1+"/me/assignments", handlers.Portal.MyAssignments)
	mux.HandleFunc("POST "+v1+"/me/assignments/{assignmentId}/submit", handlers.Portal.SubmitAssignment)
	mux.HandleFunc("GET "+v1+"/me/submissions", handlers.Portal.MySubmissions)
	mux.HandleFunc("GET "+v1+"/me/attendance-summary", handlers.Portal.AttendanceSummary)
	mux.HandleFunc("GET "+v1+"/me/orders/{orderId}", handlers.Portal.OrderReceipt)

	// Onboarding (Phase 10b)
	mux.HandleFunc("POST "+v1+"/me/learners", handlers.Onboarding.CreateLearner)
	mux.HandleFunc("GET "+v1+"/me/learners", handlers.Onboarding.ListLearners)

	// Growth: reviews, referrals, institutions (Phase 10)
	mux.HandleFunc("POST "+v1+"/reviews", handlers.Growth.CreateReview)
	mux.HandleFunc("GET "+v1+"/tutors/{slug}/reviews", handlers.Growth.ListTutorReviews)
	mux.HandleFunc("GET "+v1+"/me/referral-code", handlers.Growth.GetMyCode)
	mux.HandleFunc("POST "+v1+"/referrals/apply", handlers.Growth.ApplyReferral)
	mux.HandleFunc("GET "+v1+"/me/referrals", handlers.Growth.ListMyReferrals)
	mux.HandleFunc("POST "+v1+"/institutions", handlers.Growth.CreateInstitution)

	// Support tickets (Phase 9 site)
	mux.HandleFunc("POST "+v1+"/support/tickets", handlers.Support.CreateTicket)

	// Admin console (Phase 11)
	mux.HandleFunc("GET "+v1+"/admin/stats", handlers.Admin.Stats)
	mux.HandleFunc("GET "+v1+"/admin/stats/overview2", handlers.Admin.Stats2)
	mux.HandleFunc("GET "+v1+"/admin/support", handlers.Admin.ListSupport)
	mux.HandleFunc("POST "+v1+"/admin/support/{ticketId}/status", handlers.Admin.SetSupportStatus)
	mux.HandleFunc("GET "+v1+"/admin/cohorts", handlers.Admin.ListCohorts)
	mux.HandleFunc("POST "+v1+"/admin/cohorts", handlers.Admin.CreateCohort)
	mux.HandleFunc("POST "+v1+"/admin/cohorts/{cohortId}/status", handlers.Admin.SetCohortStatus)
	mux.HandleFunc("GET "+v1+"/admin/lessons/today", handlers.Admin.LessonsToday)
	mux.HandleFunc("POST "+v1+"/admin/orders/{orderId}/confirm-payment", handlers.Admin.ConfirmManualPayment)
	mux.HandleFunc("GET "+v1+"/admin/orders", handlers.Admin.ListOrders)
	mux.HandleFunc("POST "+v1+"/admin/orders/{orderId}/refund", handlers.Admin.RefundOrder)
	mux.HandleFunc("GET "+v1+"/admin/payouts", handlers.Admin.ListPayouts)
	mux.HandleFunc("GET "+v1+"/admin/blog", handlers.Admin.ListPosts)
	mux.HandleFunc("POST "+v1+"/admin/blog", handlers.Admin.CreatePost)
	mux.HandleFunc("PUT "+v1+"/admin/blog/{postId}", handlers.Admin.UpdatePost)
	mux.HandleFunc("POST "+v1+"/admin/blog/{postId}/status", handlers.Admin.SetPostStatus)
	mux.HandleFunc("GET "+v1+"/admin/institutions", handlers.Admin.ListInstitutions)
	mux.HandleFunc("GET "+v1+"/admin/referrals", handlers.Admin.ListReferrals)
	mux.HandleFunc("GET "+v1+"/admin/reviews", handlers.Admin.ListReviews)
	mux.HandleFunc("POST "+v1+"/admin/reviews/{reviewId}/moderate", handlers.Admin.ModerateReview)

	// Dev object serving (LocalStorage signed URLs)
	if handlers.Objects != nil {
		mux.HandleFunc("GET /objects/{bucket}/{key...}", handlers.Objects.Serve)
	}

	// JSON 404s for unknown API + root paths — the API never returns HTML,
	// so browser clients always get a parseable error envelope (auth UX fix:
	// "Request failed 404" was an HTML Next.js 404 page reaching apiFetch).
	mux.HandleFunc("/api/v1/", func(w http.ResponseWriter, r *http.Request) {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "endpoint not found", nil)
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "not found", nil)
	})

	return &Router{mux: mux, rateLimiter: rl, authLimiter: authRL, Version: version, allowedOrigins: allowedOrigins, sessionAuth: sessionAuth, readyCheck: readyCheck, blockFrames: blockFrames}
}

func (rt *Router) Handler() http.Handler {
	var h http.Handler = rt.mux
	h = middleware.RequestID(h)
	h = middleware.Logger(h)
	h = middleware.Recover(h)
	h = middleware.CORS(rt.allowedOrigins)(h)
	h = middleware.SecurityHeaders(rt.blockFrames)(h)
	if rt.sessionAuth != nil {
		h = rt.sessionAuth(h)
	}
	h = rt.rateLimiter.Middleware(h)
	return h
}

// Handlers — dependency container so the router stays declarative.
type Handlers struct {
	Subjects     *SubjectHandler
	Tutors       *TutorHandler
	Programmes   *ProgrammeHandler
	Cohorts      *CohortHandler
	Bookings     *BookingHandler
	Payments     *PaymentHandler
	Vetting      *VettingHandler
	AdminVetting *AdminVettingHandler
	Messaging    *MessagingHandler
	Dashboard    *DashboardHandler
	Content      *ContentHandler
	Auth         *AuthHandler
	Admin        *AdminHandler
	Support      *SupportHandler
	Growth       *GrowthHandler
	LessonOps    *LessonOpsHandler
	Chat         *ChatHandler
	Devices      *DeviceHandler
	Account      *AccountHandler
	Onboarding   *OnboardingHandler
	Portal       *PortalHandler
	Learning     *LearningHandler
	Objects      *ObjectHandler
}

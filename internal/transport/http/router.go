package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/telemetry"
	"ykay-virtual/pkg"
)

// Router assembles the API: middleware chain (request-id â†’ logger â†’ recover â†’
// rate-limit) + versioned routes per api/openapi.yaml.

// HTTPRateLimiter â€” common contract for the in-memory and Redis-backed
// limiters (G7.2). The router defaults to in-memory; main swaps in the
// Redis-backed pair when a shared Redis is available.
type HTTPRateLimiter interface {
	Middleware(http.Handler) http.Handler
}

type Router struct {
	mux            *http.ServeMux
	rateLimiter    HTTPRateLimiter
	authLimiter    HTTPRateLimiter
	Version        string
	allowedOrigins string
	sessionAuth    func(http.Handler) http.Handler
	readyCheck     func() error
	blockFrames    bool
}

// NewRouter â€” fail-closed defaults (no cross-origin) + no frame blocking.
func NewRouter(version string, handlers *Handlers, sessionAuth func(http.Handler) http.Handler, readyCheck func() error) *Router {
	return NewRouterWithOrigins(version, handlers, "", sessionAuth, readyCheck, false)
}

// NewRouterWithOrigins â€” explicit CORS allowlist, auth-route rate limiter,
// liveness/readiness endpoints and optional frame blocking (production).
func NewRouterWithOrigins(version string, handlers *Handlers, allowedOrigins string, sessionAuth func(http.Handler) http.Handler, readyCheck func() error, blockFrames bool) *Router {
	mux := http.NewServeMux()
	// RATE_LIMIT_PER_MINUTE tunes the global per-IP window (default 300;
	// load tests raise it to measure raw throughput â€” see scripts/loadtest.sh).
	rl := middleware.NewRateLimiter(RateLimitPerMinute(), time.Minute)
	// auth endpoints: 40 req/min per IP by default (SEC-005). Env-tunable via
	// AUTH_RATE_LIMIT_PER_MINUTE so test harnesses (browser E2E runs many auth
	// steps in a burst) can raise the window without weakening production
	// (default stays 40 unless explicitly overridden).
	authRL := middleware.NewRateLimiter(AuthRateLimitPerMinute(), time.Minute)
	rt := &Router{
		mux: mux, rateLimiter: rl, authLimiter: authRL, Version: version,
		allowedOrigins: allowedOrigins, sessionAuth: sessionAuth,
		readyCheck: readyCheck, blockFrames: blockFrames,
	}
	// authRate reads rt.authLimiter at REQUEST time (not construction time), so
	// the Redis-backed distributed limiter installed by SetRateLimiters (G7.2)
	// actually guards the auth endpoints. Previously the closure captured the
	// in-memory limiter forever, making the distributed pair dead code (CF-3).
	authRate := func(h http.HandlerFunc) http.HandlerFunc { return rt.authLimiter.Middleware(h).ServeHTTP }

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

	// Metrics scrape endpoint (G3.3). Always token-gated: production requires
	// METRICS_TOKEN (config.Validate); non-production falls back to a
	// documented dev token so the endpoint is never open.
	mux.Handle("GET /metrics", telemetry.DefaultMetrics().HandlerWithToken(metricsToken()))

	v1 := "/api/v1"

	// Auth + sessions (Phase 7)
	mux.HandleFunc("POST "+v1+"/auth/register", authRate(handlers.Auth.Register))
	mux.HandleFunc("POST "+v1+"/auth/login", authRate(handlers.Auth.Login))
	mux.HandleFunc("POST "+v1+"/auth/mfa/confirm", authRate(handlers.Auth.ConfirmMFA))
	mux.HandleFunc("POST "+v1+"/auth/logout", handlers.Auth.Logout)
	mux.HandleFunc("GET "+v1+"/auth/me", handlers.Auth.Me)
	mux.HandleFunc("GET "+v1+"/auth/me/context", handlers.SessionContext.Get)
	mux.HandleFunc("POST "+v1+"/auth/me/onboarded", handlers.Auth.MarkOnboarded)
	mux.HandleFunc("GET "+v1+"/me/recommendations", handlers.Recommendations.Get)
	mux.HandleFunc("POST "+v1+"/auth/verify-email/request", authRate(handlers.Auth.ResendVerification))
	mux.HandleFunc("POST "+v1+"/auth/verify-email/confirm", handlers.Auth.ConfirmVerification)
	mux.HandleFunc("POST "+v1+"/auth/password-reset/request", authRate(handlers.Auth.RequestPasswordReset))
	mux.HandleFunc("POST "+v1+"/auth/password-reset/confirm", authRate(handlers.Auth.ConfirmPasswordReset))
	mux.HandleFunc("POST "+v1+"/auth/login-code/request", authRate(handlers.Auth.RequestLoginCode))
	mux.HandleFunc("POST "+v1+"/auth/login-code/confirm", authRate(handlers.Auth.ConfirmLoginCode))
	mux.HandleFunc("GET "+v1+"/auth/google/url", handlers.Auth.GoogleMobileURL)
	mux.HandleFunc("GET "+v1+"/auth/google/callback", handlers.Auth.GoogleCallback)
	mux.HandleFunc("GET "+v1+"/auth/google/callback-mobile", authRate(handlers.Auth.GoogleMobileCallback))
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
	mux.HandleFunc("POST "+v1+"/me/avatar", handlers.Account.UploadAvatar)
	mux.HandleFunc("POST "+v1+"/me/uploads", handlers.Account.UploadResource)
	mux.HandleFunc("GET "+v1+"/auth/me/export", handlers.Account.ExportData)
	mux.HandleFunc("POST "+v1+"/auth/me/delete", handlers.Account.DeleteAccount)

	// Push devices (M4)
	mux.HandleFunc("POST "+v1+"/me/devices", handlers.Devices.RegisterDevice)
	mux.HandleFunc("GET "+v1+"/me/devices", handlers.Devices.ListDevices)
	mux.HandleFunc("DELETE "+v1+"/me/devices/{deviceId}", handlers.Devices.RemoveDevice)

	// Agent inbox (C4â€“C6)
	mux.HandleFunc("GET "+v1+"/admin/chat/threads", handlers.Chat.ListAllThreads)
	mux.HandleFunc("GET "+v1+"/admin/chat/threads/{threadId}/messages", handlers.Chat.ListThreadMessages)
	mux.HandleFunc("POST "+v1+"/admin/chat/threads/{threadId}/reply", handlers.Chat.AgentReply)
	mux.HandleFunc("POST "+v1+"/admin/chat/threads/{threadId}/close", handlers.Chat.CloseThread)
	mux.HandleFunc("GET "+v1+"/admin/chat/analytics", handlers.Chat.ChatAnalytics)
	mux.HandleFunc("GET "+v1+"/admin/chat/csat.csv", handlers.Chat.CSATExport)
	mux.HandleFunc("GET "+v1+"/admin/chat/analytics/trends", handlers.Chat.ChatTrends)

	// Leads (public capture + admin follow-up console)
	mux.HandleFunc("POST "+v1+"/leads", authRate(handlers.Leads.Capture))
	mux.HandleFunc("GET "+v1+"/admin/leads", handlers.Leads.List)
	mux.HandleFunc("GET "+v1+"/admin/overview", handlers.Admin.OperationsOverview)
	mux.HandleFunc("POST "+v1+"/admin/email/test", handlers.Admin.SendTestEmail)
	mux.HandleFunc("POST "+v1+"/admin/leads/{leadId}/status", handlers.Leads.UpdateStatus)

	// Practice exams (CBT): tutors author papers, students sit timed attempts.
	mux.HandleFunc("POST "+v1+"/tutor/exams", handlers.PracticeExams.TutorCreate)
	mux.HandleFunc("GET "+v1+"/tutor/exams", handlers.PracticeExams.TutorList)
	mux.HandleFunc("GET "+v1+"/tutor/exams/{id}", handlers.PracticeExams.TutorGet)
	mux.HandleFunc("PUT "+v1+"/tutor/exams/{id}", handlers.PracticeExams.TutorUpdate)
	mux.HandleFunc("DELETE "+v1+"/tutor/exams/{id}", handlers.PracticeExams.TutorDelete)
	mux.HandleFunc("GET "+v1+"/tutor/exams/{id}/attempts", handlers.PracticeExams.TutorAttempts)
	mux.HandleFunc("GET "+v1+"/learning/exams", handlers.PracticeExams.StudentList)
	mux.HandleFunc("GET "+v1+"/learning/exams/{id}", handlers.PracticeExams.StudentGet)
	mux.HandleFunc("POST "+v1+"/learning/exams/{id}/attempts", handlers.PracticeExams.StartAttempt)
	mux.HandleFunc("POST "+v1+"/learning/exams/attempts/{attemptId}/submit", handlers.PracticeExams.SubmitAttempt)
	mux.HandleFunc("GET "+v1+"/learning/exams/attempts", handlers.PracticeExams.StudentAttempts)
	mux.HandleFunc("GET "+v1+"/learning/exams/attempts/{attemptId}", handlers.PracticeExams.AttemptReview)

	// Catalogue (public, cached 60-300s)
	mux.HandleFunc("GET "+v1+"/site/contact", handlers.Notifier.GetContactInfo)
	mux.HandleFunc("GET "+v1+"/curricula", handlers.Curricula.List)
	mux.HandleFunc("GET "+v1+"/subjects", handlers.Subjects.List)
	mux.HandleFunc("GET "+v1+"/subjects/{slug}", handlers.Subjects.GetBySlug)
	mux.Handle("GET "+v1+"/tutors/search", cache60(handlers.Tutors.Search))
	mux.HandleFunc("GET "+v1+"/tutors/{slug}", handlers.Tutors.GetBySlug)
	mux.HandleFunc("GET "+v1+"/programmes", handlers.Programmes.List)
	mux.HandleFunc("GET "+v1+"/programmes/{slug}", handlers.Programmes.GetBySlug)
	mux.Handle("GET "+v1+"/programmes/{slug}/tutors", cache60(handlers.Programmes.Tutors))
	mux.Handle("GET "+v1+"/cohorts", cache60(handlers.Cohorts.List))
	mux.Handle("GET "+v1+"/cohorts/{id}", cache60(handlers.Cohorts.GetByID))
	mux.HandleFunc("GET "+v1+"/cohorts/{id}/lessons", handlers.LessonOps.ListCohortLessons)
	mux.HandleFunc("GET "+v1+"/cohorts/{id}/resources", handlers.LessonOps.ListResources)
	mux.HandleFunc("GET "+v1+"/cohorts/{id}/assignments", handlers.LessonOps.ListAssignments)
	mux.HandleFunc("POST "+v1+"/cohorts/{id}/assignments", handlers.LessonOps.CreateAssignment)
	mux.HandleFunc("POST "+v1+"/cohorts/{id}/resources", handlers.LessonOps.CreateResource)
	mux.HandleFunc("GET "+v1+"/cohorts/{id}/enrollments", handlers.LessonOps.ListCohortEnrollments)
	mux.HandleFunc("POST "+v1+"/lessons/{lessonId}/attendance", handlers.LessonOps.MarkAttendance)
	mux.HandleFunc("GET "+v1+"/lessons/{lessonId}/attendance", handlers.LessonOps.ListAttendance)
	mux.HandleFunc("POST "+v1+"/lessons/{lessonId}/notes", handlers.LessonOps.AddNote)
	mux.HandleFunc("POST "+v1+"/lessons/{lessonId}/reschedule", handlers.LessonOps.RescheduleLesson)
	mux.HandleFunc("POST "+v1+"/lessons/{lessonId}/cancel", handlers.LessonOps.CancelLesson)
	mux.HandleFunc("POST "+v1+"/lessons/{lessonId}/transcript", handlers.LessonOps.SetLessonTranscript)
	mux.HandleFunc("POST "+v1+"/admin/lessons", handlers.LessonOps.ScheduleLesson)
	mux.HandleFunc("POST "+v1+"/admin/lessons/{lessonId}/video", handlers.LessonOps.SetRecordedVideo)
	mux.HandleFunc("GET "+v1+"/me/recorded-lessons", handlers.LessonOps.MyRecordedLibrary)
	mux.HandleFunc("GET "+v1+"/lessons/{lessonId}/notes", handlers.LessonOps.ListNotes)

	// Meeting links (G4.2) â€” tutor opens/refreshes, participants join
	// inside the server-enforced join window.
	mux.HandleFunc("POST "+v1+"/lessons/{lessonId}/meeting-link", handlers.Meeting.OpenOrRefresh)
	mux.HandleFunc("GET "+v1+"/lessons/{lessonId}/meeting-link", handlers.Meeting.Join)

	// Bookings + payments (Phase 3)
	mux.HandleFunc("POST "+v1+"/bookings", handlers.Bookings.Create)
	mux.HandleFunc("POST "+v1+"/coupons/validate", handlers.Coupons.Validate)
	mux.HandleFunc("GET "+v1+"/admin/coupons", handlers.Coupons.List)
	mux.HandleFunc("POST "+v1+"/admin/coupons", handlers.Coupons.Create)
	mux.HandleFunc("POST "+v1+"/admin/notifications/whatsapp", handlers.Notifier.SendWhatsApp)
	mux.HandleFunc("POST "+v1+"/admin/cohorts/{cohortId}/certificates", handlers.Certificates.IssueForCohort)
	mux.HandleFunc("GET "+v1+"/me/certificates", handlers.Certificates.ListMine)
	mux.HandleFunc("GET "+v1+"/me/certificates/{id}", handlers.Certificates.GetMine)
	mux.HandleFunc("GET "+v1+"/certificates/verify", handlers.Certificates.Verify)
	mux.HandleFunc("POST "+v1+"/admissions/apply", handlers.Admissions.Apply)
	mux.HandleFunc("GET "+v1+"/admissions/me", handlers.Admissions.ListMine)
	// Parent: accept an offer (auto-enrol + fee wiring) and manage supporting documents.
	mux.HandleFunc("POST "+v1+"/me/admissions/{id}/accept", handlers.Admissions.Accept)
	mux.HandleFunc("GET "+v1+"/me/admissions/{id}/documents", handlers.Admissions.ListMyDocuments)
	mux.HandleFunc("POST "+v1+"/me/admissions/{id}/documents", handlers.Admissions.AddDocument)
	mux.HandleFunc("DELETE "+v1+"/me/admissions/{id}/documents/{docId}", handlers.Admissions.RemoveMyDocument)
	// Admin queue + review/offer + read documents.
	mux.HandleFunc("GET "+v1+"/admin/admissions", handlers.Admissions.ListQueue)
	mux.HandleFunc("POST "+v1+"/admin/admissions/{id}/status", handlers.Admissions.SetStatus)
	mux.HandleFunc("GET "+v1+"/admin/admissions/{id}/documents", handlers.Admissions.ListDocuments)

	// Virtual school, Pillar 1: academic calendar (sessions + terms). Admin
	// manages the calendar; the public read powers "current term" states on
	// web/mobile (anonymous-cacheable, same policy as the catalogue).
	mux.HandleFunc("POST "+v1+"/admin/school/sessions", handlers.SchoolCalendar.CreateSession)
	mux.HandleFunc("GET "+v1+"/admin/school/sessions", handlers.SchoolCalendar.ListSessions)
	mux.HandleFunc("PUT "+v1+"/admin/school/sessions/{id}", handlers.SchoolCalendar.UpdateSession)
	mux.HandleFunc("POST "+v1+"/admin/school/sessions/{id}/status", handlers.SchoolCalendar.SetSessionStatus)
	mux.HandleFunc("POST "+v1+"/admin/school/sessions/{id}/terms", handlers.SchoolCalendar.CreateTerm)
	mux.HandleFunc("GET "+v1+"/admin/school/sessions/{id}/terms", handlers.SchoolCalendar.ListTerms)
	mux.HandleFunc("PUT "+v1+"/admin/school/terms/{id}", handlers.SchoolCalendar.UpdateTerm)
	mux.HandleFunc("POST "+v1+"/admin/school/terms/{id}/status", handlers.SchoolCalendar.SetTermStatus)
	mux.Handle("GET "+v1+"/school/calendar/current", cache60(handlers.SchoolCalendar.CurrentCalendar))

	// On-demand recorded-lesson library (migration 000064). Public browse is
	// anonymous-cacheable (metadata only — the service strips video/transcript
	// for non-participants, so the cache can never leak paid content). Admin
	// routes curate the catalogue.
	mux.Handle("GET "+v1+"/library", cache60(handlers.Library.Catalogue))
	mux.Handle("GET "+v1+"/library/featured", cache60(handlers.Library.Featured))
	mux.HandleFunc("GET "+v1+"/library/{lessonId}", handlers.Library.Get)
	mux.HandleFunc("GET "+v1+"/admin/library", handlers.Library.ListAdmin)
	mux.HandleFunc("PUT "+v1+"/admin/library/{lessonId}", handlers.Library.UpdateMeta)

	mux.HandleFunc("POST "+v1+"/private-tuition/requests", handlers.Bookings.CreatePrivateRequest)
	mux.HandleFunc("GET "+v1+"/private-tuition/requests", handlers.Bookings.ListMyPrivateRequests)
	mux.HandleFunc("GET "+v1+"/private-tuition/requests/{id}", handlers.Bookings.GetPrivateRequest)
	mux.HandleFunc("GET "+v1+"/admin/private-tuition/requests", handlers.Bookings.ListPrivateRequests)
	mux.HandleFunc("POST "+v1+"/admin/private-tuition/requests/{id}/match", handlers.Bookings.MatchPrivateRequest)
	mux.HandleFunc("POST "+v1+"/payments/initiate", handlers.Payments.Initiate)
	mux.HandleFunc("POST "+v1+"/payments/webhooks/{provider}", handlers.Payments.Webhook)

	// Tutor vetting (Phase 4)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/profile", handlers.Vetting.CreateProfile)
	mux.HandleFunc("GET "+v1+"/tutors/me/vetting/profile", handlers.Vetting.GetMyProfile)
	mux.HandleFunc("GET "+v1+"/tutors/banks", handlers.Banks.List)
	mux.HandleFunc("POST "+v1+"/tutors/banks/resolve", handlers.Banks.Resolve)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/profiles/{profileId}/subjects", handlers.Vetting.AddSubject)
	mux.HandleFunc("GET "+v1+"/tutors/me/vetting/profiles/{profileId}/subjects", handlers.Vetting.ListMySubjects)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/profiles/{profileId}/submit", handlers.Vetting.Submit)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/profiles/{profileId}/bank", handlers.Vetting.UpdateBankDetails)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/profiles/{profileId}/documents", handlers.Vetting.RequestDocumentUpload)
	mux.HandleFunc("GET "+v1+"/tutors/me/vetting/documents/{documentId}", handlers.Vetting.GetDocumentURL)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/profiles/{profileId}/assessments", handlers.Vetting.StartAssessment)
	mux.HandleFunc("POST "+v1+"/tutors/me/vetting/assessments/{attemptId}/submit", handlers.Vetting.SubmitAssessment)

	// Admin vetting queue (Phase 4)
	mux.HandleFunc("GET "+v1+"/admin/vetting/queue", handlers.AdminVetting.ListQueue)
	mux.HandleFunc("GET "+v1+"/admin/tutors", handlers.Admin.ListTutors)
	mux.HandleFunc("POST "+v1+"/admin/tutors", handlers.Admin.UpsertTutor)
	mux.HandleFunc("GET "+v1+"/admin/vetting/profiles/{profileId}", handlers.AdminVetting.GetProfile)
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/review", handlers.AdminVetting.action("review"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/interview", handlers.AdminVetting.action("interview"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/verify", handlers.AdminVetting.action("verify"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/approve", handlers.AdminVetting.action("approve"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/reject", handlers.AdminVetting.action("reject"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/hold", handlers.AdminVetting.action("hold"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/suspend", handlers.AdminVetting.action("suspend"))
	mux.HandleFunc("POST "+v1+"/admin/vetting/profiles/{profileId}/public", handlers.AdminVetting.SetPublic)
	mux.HandleFunc("POST "+v1+"/admin/vetting/documents/{documentId}/review", handlers.AdminVetting.ReviewDocument)

	// Messaging + notifications (Phase 5)
	mux.HandleFunc("GET "+v1+"/me/conversations", handlers.Messaging.ListConversations)
	mux.HandleFunc("POST "+v1+"/me/conversations", handlers.Messaging.CreateConversation)
	mux.HandleFunc("GET "+v1+"/me/conversation-contacts", handlers.Messaging.Contacts)
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

	// On-demand video lesson progress (000035)
	mux.HandleFunc("POST "+v1+"/learning/lessons/{lessonId}/progress", handlers.Learning.RecordLessonProgress)
	mux.HandleFunc("GET "+v1+"/learning/lessons/{lessonId}/progress", handlers.Learning.GetLessonProgress)
	mux.HandleFunc("GET "+v1+"/me/learning/progress", handlers.Learning.MyLessonProgress)
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
	mux.HandleFunc("POST "+v1+"/me/orders/{orderId}/verify", handlers.Payments.VerifyOrder)
	// Phase 5b realtime: the user's SSE event stream (message.new pokes).
	mux.HandleFunc("GET "+v1+"/me/events", handlers.Events.Stream)

	// Onboarding (Phase 10b)
	mux.HandleFunc("POST "+v1+"/me/learners", handlers.Onboarding.CreateLearner)
	mux.HandleFunc("GET "+v1+"/me/learners", handlers.Onboarding.ListLearners)
	mux.HandleFunc("POST "+v1+"/me/learner-profile", handlers.Onboarding.EnsureOwnProfile)

	// Growth: reviews, referrals, institutions (Phase 10)
	mux.HandleFunc("POST "+v1+"/reviews", handlers.Growth.CreateReview)
	mux.HandleFunc("GET "+v1+"/tutors/{slug}/reviews", handlers.Growth.ListTutorReviews)
	mux.HandleFunc("GET "+v1+"/me/referral-code", handlers.Growth.GetMyCode)
	mux.HandleFunc("POST "+v1+"/referrals/apply", handlers.Growth.ApplyReferral)
	mux.HandleFunc("GET "+v1+"/referrals/{code}", handlers.Growth.LookupCode)
	mux.HandleFunc("GET "+v1+"/me/referrals", handlers.Growth.ListMyReferrals)
	mux.HandleFunc("POST "+v1+"/institutions", handlers.Growth.CreateInstitution)
	// B2B self-serve console: public profile + user-scoped management routes
	// (membership/role/student authorization enforced in the service layer).
	mux.HandleFunc("GET "+v1+"/institutions/{slug}", handlers.Institutions.GetBySlug)
	mux.HandleFunc("GET "+v1+"/me/institutions", handlers.Institutions.ListMine)
	mux.HandleFunc("GET "+v1+"/me/institutions/{id}", handlers.Institutions.GetByID)
	mux.HandleFunc("PUT "+v1+"/me/institutions/{id}", handlers.Institutions.Update)
	mux.HandleFunc("GET "+v1+"/me/institutions/{id}/memberships", handlers.Institutions.ListMemberships)
	mux.HandleFunc("POST "+v1+"/me/institutions/{id}/members", handlers.Institutions.InviteMember)
	mux.HandleFunc("PUT "+v1+"/me/institutions/{id}/members/{userId}/role", handlers.Institutions.SetMemberRole)
	mux.HandleFunc("DELETE "+v1+"/me/institutions/{id}/members/{userId}", handlers.Institutions.RemoveMember)
	mux.HandleFunc("GET "+v1+"/me/institutions/{id}/students", handlers.Institutions.ListStudents)
	mux.HandleFunc("POST "+v1+"/me/institutions/{id}/students", handlers.Institutions.AddStudent)
	mux.HandleFunc("DELETE "+v1+"/me/institutions/{id}/students/{studentId}", handlers.Institutions.RemoveStudent)

	// Support tickets (Phase 9 site)
	mux.HandleFunc("POST "+v1+"/support/tickets", handlers.Support.CreateTicket)

	// Admin console (Phase 11)
	mux.HandleFunc("GET "+v1+"/admin/stats", handlers.Admin.Stats)
	// SUPER_ADMIN â€” user/role management
	mux.HandleFunc("GET "+v1+"/admin/users", handlers.Admin.ListUsers)
	mux.HandleFunc("GET "+v1+"/admin/users/roles", handlers.Admin.ListRoles)
	mux.HandleFunc("GET "+v1+"/admin/users/{userId}/detail", handlers.Admin.GetUserDetail)
	mux.HandleFunc("GET "+v1+"/admin/audit", handlers.Admin.ListAuditLogs)
	mux.HandleFunc("POST "+v1+"/admin/users/{userId}/role", handlers.Admin.SetUserRole)
	mux.HandleFunc("POST "+v1+"/admin/users/{userId}/status", handlers.Admin.SetUserStatus)
	mux.HandleFunc("GET "+v1+"/admin/stats/overview2", handlers.Admin.Stats2)
	mux.HandleFunc("GET "+v1+"/admin/support", handlers.Admin.ListSupport)
	mux.HandleFunc("POST "+v1+"/admin/support/{ticketId}/status", handlers.Admin.SetSupportStatus)
	mux.HandleFunc("GET "+v1+"/admin/cohorts", handlers.Admin.ListCohorts)
	mux.HandleFunc("POST "+v1+"/admin/cohorts", handlers.Admin.CreateCohort)
	mux.HandleFunc("PUT "+v1+"/admin/cohorts/{cohortId}", handlers.Admin.UpdateCohort)
	mux.HandleFunc("GET "+v1+"/admin/pending-enrollments", handlers.Admin.ListPendingEnrollments)
	mux.HandleFunc("POST "+v1+"/admin/cohorts/{cohortId}/status", handlers.Admin.SetCohortStatus)
	mux.HandleFunc("POST "+v1+"/admin/cohorts/{cohortId}/tutor", handlers.Admin.AssignCohortTutor)
	mux.HandleFunc("POST "+v1+"/admin/cohorts/{cohortId}/banner", handlers.Admin.UploadCohortBanner)
	mux.HandleFunc("POST "+v1+"/me/cohorts/{cohortId}/join", handlers.Admin.RequestCohortJoin)
	mux.HandleFunc("GET "+v1+"/admin/cohort-joins", handlers.Admin.ListCohortJoins)
	mux.HandleFunc("POST "+v1+"/admin/cohort-joins/{id}/review", handlers.Admin.ReviewCohortJoin)
	mux.HandleFunc("GET "+v1+"/admin/programmes/{slug}/roster", handlers.Admin.ProgrammeRoster)
	mux.HandleFunc("POST "+v1+"/admin/programmes", handlers.Admin.CreateProgramme)
	mux.HandleFunc("PUT "+v1+"/admin/programmes/{programmeId}", handlers.Admin.UpdateProgramme)
	// G5.3 â€” catalogue sign-off: publish/unpublish programmes and
	// testimonials without a code deployment (admin-only, audited).
	mux.HandleFunc("POST "+v1+"/admin/programmes/{programmeId}/status", handlers.Admin.SetProgrammeStatus)
	mux.HandleFunc("POST "+v1+"/admin/testimonials/{testimonialId}/public", handlers.Admin.SetTestimonialPublic)
	mux.HandleFunc("GET "+v1+"/admin/lessons/today", handlers.Admin.LessonsToday)
	mux.HandleFunc("POST "+v1+"/admin/orders/{orderId}/confirm-payment", handlers.Admin.ConfirmManualPayment)
	mux.HandleFunc("GET "+v1+"/admin/orders", handlers.Admin.ListOrders)
	mux.HandleFunc("GET "+v1+"/admin/orders/{orderId}", handlers.Admin.GetOrder)
	mux.HandleFunc("POST "+v1+"/admin/orders/{orderId}/refund", handlers.Admin.RefundOrder)
	mux.HandleFunc("GET "+v1+"/admin/payouts", handlers.Admin.ListPayouts)
	mux.HandleFunc("POST "+v1+"/admin/payouts/{payoutId}/paid", handlers.Admin.ConfirmPayoutPaid)
	mux.HandleFunc("POST "+v1+"/admin/payouts/{payoutId}/paystack", handlers.Admin.PayoutViaPaystack)
	mux.HandleFunc("POST "+v1+"/admin/payouts/{payoutId}/paystack/otp", handlers.Admin.CompletePaystackTransfer)
	mux.HandleFunc("GET "+v1+"/admin/blog", handlers.Admin.ListPosts)
	mux.HandleFunc("POST "+v1+"/admin/blog", handlers.Admin.CreatePost)
	mux.HandleFunc("PUT "+v1+"/admin/blog/{postId}", handlers.Admin.UpdatePost)
	mux.HandleFunc("POST "+v1+"/admin/blog/{postId}/status", handlers.Admin.SetPostStatus)
	mux.HandleFunc("GET "+v1+"/admin/institutions", handlers.Admin.ListInstitutions)
	mux.HandleFunc("PUT "+v1+"/admin/institutions/{id}", handlers.Institutions.AdminUpdate)
	mux.HandleFunc("POST "+v1+"/admin/institutions/{id}/status", handlers.Institutions.AdminSetStatus)
	mux.HandleFunc("GET "+v1+"/admin/referrals", handlers.Admin.ListReferrals)
	mux.HandleFunc("GET "+v1+"/admin/reviews", handlers.Admin.ListReviews)
	mux.HandleFunc("POST "+v1+"/admin/reviews/{reviewId}/moderate", handlers.Admin.ModerateReview)

	// Dev object serving (LocalStorage signed URLs)
	if handlers.Objects != nil {
		mux.HandleFunc("GET /objects/{bucket}/{key...}", handlers.Objects.Serve)
	}

	// JSON 404s for unknown API + root paths â€” the API never returns HTML,
	// so browser clients always get a parseable error envelope (auth UX fix:
	// "Request failed 404" was an HTML Next.js 404 page reaching apiFetch).
	mux.HandleFunc("/api/v1/", func(w http.ResponseWriter, r *http.Request) {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "endpoint not found", nil)
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		pkg.WriteError(w, http.StatusNotFound, string(pkg.CodeNotFound), "not found", nil)
	})

	return rt
}

// SetRateLimiters swaps in alternate limiter implementations (G7.2: the
// Redis-backed pair when a shared Redis is available). Call before serving.
func (rt *Router) SetRateLimiters(global, auth HTTPRateLimiter) {
	if global != nil {
		rt.rateLimiter = global
	}
	if auth != nil {
		rt.authLimiter = auth
	}
}

// cache60 â€” 60s anonymous browser cache + 5min stale-while-revalidate for
// public catalogue GETs (F-4). Authenticated requests are never cached.
func cache60(h http.HandlerFunc) http.Handler {
	return middleware.PublicCacheForAnonymous(60)(h)
}

// privateNoStorePrefixes â€” CDN defense-in-depth: every user-scoped or
// mutating API area gets Cache-Control: no-store so no shared cache can
// ever store one user's data, even under a misconfigured "Cache Everything"
// rule. Public catalogue handlers (cache60) deliberately re-stamp public
// for anonymous reads on the same prefixes. See docs/CDN_SETUP.md.
func privateNoStorePrefixes(v1 string) []string {
	return []string{
		v1 + "/me",
		v1 + "/auth",
		v1 + "/admin",
		v1 + "/payments",
		v1 + "/chat",
		v1 + "/learning",
		v1 + "/lessons",
		v1 + "/tutor",
		v1 + "/tutors/me",
		v1 + "/tutors/banks",
		v1 + "/private-tuition",
		v1 + "/bookings",
		v1 + "/coupons",
		v1 + "/certificates",
		v1 + "/admissions",
		v1 + "/referrals",
		v1 + "/reviews",
		v1 + "/institutions",
		v1 + "/support",
		v1 + "/leads",
		v1 + "/notifications",
		v1 + "/devices",
		v1 + "/objects",
	}
}

func (rt *Router) Handler() http.Handler {
	var h http.Handler = rt.mux
	h = telemetry.DefaultMetrics().Middleware(h)
	// F-4: transparent gzip for compressible JSON responses (3â€“6Ã— faster on
	// mobile networks). See internal/middleware/gzip.go.
	h = middleware.Gzip(h)
	// CDN defense-in-depth: private paths are explicitly no-store.
	h = middleware.NewPrivateNoStore(privateNoStorePrefixes("/api/v1")).Middleware(h)
	h = middleware.Logger(h)
	h = middleware.Recover(h)
	h = middleware.RequestID(h)
	h = middleware.CORS(rt.allowedOrigins)(h)
	h = middleware.SecurityHeaders(rt.blockFrames)(h)
	if rt.sessionAuth != nil {
		h = rt.sessionAuth(h)
	}
	h = rt.rateLimiter.Middleware(h)
	return h
}

// Handlers â€” dependency container so the router stays declarative.
type Handlers struct {
	Subjects        *SubjectHandler
	Curricula       *CurriculaHandler
	Tutors          *TutorHandler
	Programmes      *ProgrammeHandler
	Cohorts         *CohortHandler
	Bookings        *BookingHandler
	Coupons         *CouponHandler
	Notifier        *NotifierHandler
	Certificates    *CertificateHandler
	Admissions      *AdmissionsHandler
	SchoolCalendar  *SchoolCalendarHandler
	Library         *LibraryHandler
	Payments        *PaymentHandler
	Vetting         *VettingHandler
	AdminVetting    *AdminVettingHandler
	Messaging       *MessagingHandler
	Dashboard       *DashboardHandler
	Recommendations *RecommendationHandler
	Content         *ContentHandler
	Auth            *AuthHandler
	SessionContext  *SessionContextHandler
	Admin           *AdminHandler
	Support         *SupportHandler
	Growth          *GrowthHandler
	Institutions    *InstitutionHandler
	LessonOps       *LessonOpsHandler
	Meeting         *MeetingHandler
	Chat            *ChatHandler
	Events          *EventsHandler
	Devices         *DeviceHandler
	Account         *AccountHandler
	Leads           *LeadsHandler
	PracticeExams   *PracticeExamHandler
	Banks           *BankHandler
	Onboarding      *OnboardingHandler
	Portal          *PortalHandler
	Learning        *LearningHandler
	Objects         *ObjectHandler
}

// rateLimitPerMinute â€” global per-IP rate limit (env-tunable, G7 capacity).
// Default raised from 300 to 1200/min per IP to comfortably absorb legitimate
// concurrent bursts (e.g. a shared proxy/NAT concentrating many users behind
// one IP) while still protecting against abuse. Override per environment via
// RATE_LIMIT_PER_MINUTE.
func RateLimitPerMinute() int {
	return envInt("RATE_LIMIT_PER_MINUTE", 1200)
}

// AuthRateLimitPerMinute â€” per-IP rate limit for authentication endpoints.
// Default 120/min: enough headroom for several users signing in from one
// shared IP (households, school labs, offices behind NAT â€” a core NUVORA
// market) while still throttling credential stuffing (~2 auth attempts/sec).
// The key is per-CLIENT-IP via TRUST_PROXY (clientIP); without TRUST_PROXY
// every user behind the proxy shares one bucket and the limit collapses
// platform-wide. Env-tunable via AUTH_RATE_LIMIT_PER_MINUTE.
func AuthRateLimitPerMinute() int {
	return envInt("AUTH_RATE_LIMIT_PER_MINUTE", 20)
}

// envInt reads a positive integer env var, falling back to def on empty/parse
// failure or non-positive values.
func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		var n int
		if _, err := fmt.Sscanf(v, "%d", &n); err == nil && n > 0 {
			return n
		}
	}
	return def
}

// metricsToken â€” the bearer token guarding GET /metrics. Production always
// sets METRICS_TOKEN (config.Validate fails otherwise); dev/staging fall back
// to a documented default so the scrape endpoint is never open.
func metricsToken() string {
	if t := os.Getenv("METRICS_TOKEN"); strings.TrimSpace(t) != "" {
		return t
	}
	if os.Getenv("ENVIRONMENT") == "production" {
		return "" // unreachable: config.Validate already failed on boot
	}
	return "nuvora-dev-metrics"
}

package httpapi

import (
	"encoding/json"
	"net/http"
	"time"

	"ykay-virtual/internal/middleware"
)

// Router assembles the API: middleware chain (request-id → logger → recover →
// rate-limit) + versioned routes per api/openapi.yaml.

type Router struct {
	mux            *http.ServeMux
	rateLimiter    *middleware.RateLimiter
	Version        string
	allowedOrigins string
	sessionAuth    func(http.Handler) http.Handler
}

func NewRouter(version string, handlers *Handlers, sessionAuth func(http.Handler) http.Handler) *Router {
	return NewRouterWithOrigins(version, handlers, "*", sessionAuth)
}

func NewRouterWithOrigins(version string, handlers *Handlers, allowedOrigins string, sessionAuth func(http.Handler) http.Handler) *Router {
	mux := http.NewServeMux()
	rl := middleware.NewRateLimiter(100, time.Minute) // sliding window: 100 req/min default

	// Health
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "ok", "version": version, "time": time.Now().UTC(),
		})
	})

	v1 := "/api/v1"

	// Auth + sessions (Phase 7)
	mux.HandleFunc("POST "+v1+"/auth/register", handlers.Auth.Register)
	mux.HandleFunc("POST "+v1+"/auth/login", handlers.Auth.Login)
	mux.HandleFunc("POST "+v1+"/auth/logout", handlers.Auth.Logout)
	mux.HandleFunc("GET "+v1+"/auth/me", handlers.Auth.Me)
	mux.HandleFunc("POST "+v1+"/auth/verify-email/request", handlers.Auth.ResendVerification)
	mux.HandleFunc("POST "+v1+"/auth/verify-email/confirm", handlers.Auth.ConfirmVerification)
	mux.HandleFunc("POST "+v1+"/auth/password-reset/request", handlers.Auth.RequestPasswordReset)
	mux.HandleFunc("POST "+v1+"/auth/password-reset/confirm", handlers.Auth.ConfirmPasswordReset)

	// Catalogue (public, cached 60-300s)
	mux.HandleFunc("GET "+v1+"/subjects", handlers.Subjects.List)
	mux.HandleFunc("GET "+v1+"/subjects/{slug}", handlers.Subjects.GetBySlug)
	mux.HandleFunc("GET "+v1+"/tutors/search", handlers.Tutors.Search)
	mux.HandleFunc("GET "+v1+"/tutors/{slug}", handlers.Tutors.GetBySlug)
	mux.HandleFunc("GET "+v1+"/programmes", handlers.Programmes.List)
	mux.HandleFunc("GET "+v1+"/programmes/{slug}", handlers.Programmes.GetBySlug)
	mux.HandleFunc("GET "+v1+"/cohorts/{id}", handlers.Cohorts.GetByID)

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
	mux.HandleFunc("GET "+v1+"/content/blog", handlers.Content.ListPosts)
	mux.HandleFunc("GET "+v1+"/content/blog/{slug}", handlers.Content.GetPost)
	mux.HandleFunc("GET "+v1+"/subjects/{slug}/related", handlers.Content.Related)
	mux.HandleFunc("GET "+v1+"/redirects/{slug}", handlers.Content.ResolveRedirect)

	// Dashboards (Phase 5 portals)
	mux.HandleFunc("GET "+v1+"/me/orders", handlers.Dashboard.MyOrders)
	mux.HandleFunc("GET "+v1+"/me/lessons", handlers.Dashboard.MyLessons)
	mux.HandleFunc("GET "+v1+"/me/tutor-lessons", handlers.Dashboard.MyTutorLessons)
	mux.HandleFunc("GET "+v1+"/me/earnings", handlers.Dashboard.MyEarnings)

	// Dev object serving (LocalStorage signed URLs)
	if handlers.Objects != nil {
		mux.HandleFunc("GET /objects/{bucket}/{key...}", handlers.Objects.Serve)
	}

	return &Router{mux: mux, rateLimiter: rl, Version: version, allowedOrigins: allowedOrigins, sessionAuth: sessionAuth}
}

func (rt *Router) Handler() http.Handler {
	var h http.Handler = rt.mux
	h = middleware.RequestID(h)
	h = middleware.Logger(h)
	h = middleware.Recover(h)
	h = middleware.CORS(rt.allowedOrigins)(h)
	if rt.sessionAuth != nil {
		h = rt.sessionAuth(h)
	}
	h = middleware.AuthBridge(h)
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
	Objects      *ObjectHandler
}

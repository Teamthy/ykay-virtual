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
	mux         *http.ServeMux
	rateLimiter *middleware.RateLimiter
	Version     string
}

func NewRouter(version string, handlers *Handlers) *Router {
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

	// Dev object serving (LocalStorage signed URLs)
	if handlers.Objects != nil {
		mux.HandleFunc("GET /objects/{bucket}/{key...}", handlers.Objects.Serve)
	}

	return &Router{mux: mux, rateLimiter: rl, Version: version}
}

func (rt *Router) Handler() http.Handler {
	var h http.Handler = rt.mux
	h = middleware.RequestID(h)
	h = middleware.Logger(h)
	h = middleware.Recover(h)
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
	Objects      *ObjectHandler
}

package httpapi

import (
	"net/http"

	"github.com/google/uuid"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// DashboardInsightsHandler — student dashboard widgets: daily quote, lesson
// feedback, gradebook, XP/leaderboard, review queue, dashboard prefs.
type DashboardInsightsHandler struct {
	svc   *service.DashboardInsightsService
	authz *ProfileAuthorizer
}

func NewDashboardInsightsHandler(svc *service.DashboardInsightsService, authz *ProfileAuthorizer) *DashboardInsightsHandler {
	return &DashboardInsightsHandler{svc: svc, authz: authz}
}

// Quote — GET /api/v1/me/dashboard/quote. Daily, per-user.
func (h *DashboardInsightsHandler) Quote(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	q := service.DailyQuote(actor.UserID, h.svc.Now())
	pkg.WriteSuccess(w, http.StatusOK, map[string]string{"quote": q}, nil)
}

// Feedback — POST /api/v1/me/lessons/{lessonId}/feedback.
func (h *DashboardInsightsHandler) Feedback(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	lessonID, err := uuid.Parse(r.PathValue("lessonId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid lesson id", nil))
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, r.URL.Query().Get("student_profile_id"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req struct {
		Rating  int     `json:"rating"`
		Comment *string `json:"comment"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	f, err := h.svc.SubmitFeedback(r.Context(), service.FeedbackInput{
		LessonID: lessonID, StudentProfileID: studentID, Rating: req.Rating, Comment: req.Comment,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, f, nil)
}

// Gradebook — GET /api/v1/me/dashboard/gradebook.
func (h *DashboardInsightsHandler) Gradebook(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, r.URL.Query().Get("student_profile_id"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	rows, err := h.svc.Gradebook(r.Context(), studentID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, rows, nil)
}

// ReviewQueue — GET /api/v1/me/dashboard/review-queue.
func (h *DashboardInsightsHandler) ReviewQueue(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, r.URL.Query().Get("student_profile_id"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	items, err := h.svc.ReviewQueue(r.Context(), studentID, 20)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, items, nil)
}

// Leaderboard — GET /api/v1/me/dashboard/leaderboard.
func (h *DashboardInsightsHandler) Leaderboard(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, r.URL.Query().Get("student_profile_id"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	rows, err := h.svc.Leaderboard(r.Context(), studentID, 20)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, rows, nil)
}

// GetPrefs — GET /api/v1/me/dashboard/prefs.
func (h *DashboardInsightsHandler) GetPrefs(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	p, err := h.svc.GetPrefs(r.Context(), actor.UserID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, p, nil)
}

// UpdatePrefs — PUT /api/v1/me/dashboard/prefs.
func (h *DashboardInsightsHandler) UpdatePrefs(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		LeaderboardOptIn *bool     `json:"leaderboard_opt_in"`
		WeeklyGoal       *int      `json:"weekly_goal"`
		Widgets          *[]string `json:"widgets"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	p, err := h.svc.UpdatePrefs(r.Context(), actor.UserID, service.PrefsInput{
		LeaderboardOptIn: req.LeaderboardOptIn, WeeklyGoal: req.WeeklyGoal, Widgets: req.Widgets,
	})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, p, nil)
}

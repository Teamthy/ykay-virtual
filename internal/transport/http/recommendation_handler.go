package httpapi

import (
	"net/http"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// RecommendationHandler — GET /api/v1/me/recommendations (suggestions
// engine). Everything is session-resolved: the service ranks cohorts,
// programmes and tutors against the session user's learners.
type RecommendationHandler struct {
	svc *service.RecommendationService
}

func NewRecommendationHandler(svc *service.RecommendationService) *RecommendationHandler {
	return &RecommendationHandler{svc: svc}
}

func (h *RecommendationHandler) Get(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	recs, err := h.svc.ForSession(r.Context(), actor.UserID, actor.Roles)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, recs, nil)
}

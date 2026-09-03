package httpapi

import (
	"net/http"

	"github.com/google/uuid"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// AdvisorHandler — YK-Virtual Plus named Learning Advisor + learning plan.
type AdvisorHandler struct {
	svc *service.AdvisorService
}

func NewAdvisorHandler(svc *service.AdvisorService) *AdvisorHandler {
	return &AdvisorHandler{svc: svc}
}

// GetMyAdvisor — GET /api/v1/me/advisor (Plus).
func (h *AdvisorHandler) GetMyAdvisor(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	v, err := h.svc.GetMyAdvisor(r.Context(), actor.UserID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, v, nil)
}

// AssignAdvisor — PUT /api/v1/admin/plus/{userId}/advisor (admin).
func (h *AdvisorHandler) AssignAdvisor(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	userID, err := uuid.Parse(r.PathValue("userId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid user id", nil))
		return
	}
	var req struct {
		AdvisorUserID string  `json:"advisor_user_id"`
		Note          *string `json:"note"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	advisorID, err := uuid.Parse(req.AdvisorUserID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid advisor_user_id", nil))
		return
	}
	v, err := h.svc.AssignAdvisor(r.Context(), actor.UserID, userID, advisorID, req.Note)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, v, nil)
}

// GetMyLearningPlan — GET /api/v1/me/advisor/plan?student_profile_id= (Plus).
func (h *AdvisorHandler) GetMyLearningPlan(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	sid, err := parseQueryUUIDOpt(r, "student_profile_id")
	if err != nil || sid == nil {
		WriteAppError(w, pkg.BadRequest("student_profile_id is required", nil))
		return
	}
	p, err := h.svc.GetMyLearningPlan(r.Context(), actor.UserID, *sid)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, p, nil)
}

// SetLearningPlan — PUT /api/v1/admin/plus/{userId}/plan (admin/advisor).
func (h *AdvisorHandler) SetLearningPlan(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	userID, err := uuid.Parse(r.PathValue("userId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid user id", nil))
		return
	}
	var req struct {
		StudentProfileID string  `json:"student_profile_id"`
		Goals            *string `json:"goals"`
		FocusAreas       *string `json:"focus_areas"`
		Recommendations  *string `json:"recommendations"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	sid, err := uuid.Parse(req.StudentProfileID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid student_profile_id", nil))
		return
	}
	p, err := h.svc.SetLearningPlan(r.Context(), actor.UserID, userID, sid, req.Goals, req.FocusAreas, req.Recommendations)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, p, nil)
}

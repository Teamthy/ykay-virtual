package httpapi

import (
	"net/http"
	"time"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// RevisionHandler — adaptive revision planner (feature 1, migration 000075).
type RevisionHandler struct {
	svc   *service.RevisionService
	authz *ProfileAuthorizer
}

func NewRevisionHandler(svc *service.RevisionService, authz *ProfileAuthorizer) *RevisionHandler {
	return &RevisionHandler{svc: svc, authz: authz}
}

// List — GET /api/v1/me/revision-plans?student_profile_id=
func (h *RevisionHandler) List(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, r.URL.Query().Get("student_profile_id"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	plans, err := h.svc.ListPlans(r.Context(), studentID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, plans, nil)
}

type createPlanReq struct {
	Subject     string `json:"subject"`
	Exam        string `json:"exam"`
	WindowStart string `json:"window_start"` // YYYY-MM-DD
	WindowEnd   string `json:"window_end"`
}

// Create — POST /api/v1/me/revision-plans. Seeds tasks from weak topics.
func (h *RevisionHandler) Create(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, r.URL.Query().Get("student_profile_id"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	var req createPlanReq
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if req.Subject == "" {
		WriteAppError(w, pkg.BadRequest("subject is required", nil))
		return
	}
	start, err1 := time.Parse("2006-01-02", req.WindowStart)
	end, err2 := time.Parse("2006-01-02", req.WindowEnd)
	if err1 != nil || err2 != nil {
		WriteAppError(w, pkg.BadRequest("window_start and window_end must be YYYY-MM-DD", nil))
		return
	}
	plan, err := h.svc.CreatePlan(r.Context(), studentID, req.Subject, req.Exam, start, end)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, plan, nil)
}

// Rebalance — POST /api/v1/me/revision-plans/{id}/rebalance.
func (h *RevisionHandler) Rebalance(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	changed, err := h.svc.Rebalance(r.Context(), id)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]int{"reprioritised": changed}, nil)
}

// Tasks — GET /api/v1/me/revision-plans/{id}/tasks. The plan's week timeline.
func (h *RevisionHandler) Tasks(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	_, tasks, err := h.svc.GetPlan(r.Context(), id)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, tasks, nil)
}

// CompleteTask — POST /api/v1/me/revision-plans/tasks/{id}/complete (idempotent).
func (h *RevisionHandler) CompleteTask(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := ParseUUID(r, "id")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.CompleteTask(r.Context(), id); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]bool{"completed": true}, nil)
}

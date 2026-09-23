package httpapi

import (
	"net/http"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// MasteryHandler — topic-mastery heatmap (feature 2). The student's own view,
// and a parent's per-child view (student_profile_id resolves through the
// parent↔learner link, never trusting the client).
type MasteryHandler struct {
	svc   *service.MasteryService
	authz *ProfileAuthorizer
}

func NewMasteryHandler(svc *service.MasteryService, authz *ProfileAuthorizer) *MasteryHandler {
	return &MasteryHandler{svc: svc, authz: authz}
}

// Get — GET /api/v1/me/learning/mastery?subject=&student_profile_id=
func (h *MasteryHandler) Get(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	studentID, err := h.authz.ResolveStudent(r.Context(), actor, r.URL.Query().Get("student_profile_id"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	cells, err := h.svc.Mastery(r.Context(), studentID, r.URL.Query().Get("subject"))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	// Empty array (never fabricated scores) when there is no attempt history.
	pkg.WriteSuccess(w, http.StatusOK, cells, nil)
}

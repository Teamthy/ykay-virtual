package httpapi

import (
	"net/http"

	"ykay-virtual/internal/domain/admissions"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// AdmissionsHandler — virtual-school admissions applications.
type AdmissionsHandler struct {
	svc *service.AdmissionsService
}

func NewAdmissionsHandler(svc *service.AdmissionsService) *AdmissionsHandler {
	return &AdmissionsHandler{svc: svc}
}

// Apply — POST /api/v1/admissions/apply (parent/guardian).
func (h *AdmissionsHandler) Apply(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		InstitutionID    string `json:"institution_id"`
		ProgrammeID      string `json:"programme_id"`
		CohortID         string `json:"cohort_id"`
		StudentProfileID string `json:"student_profile_id"`
		ApplicantName    string `json:"applicant_name"`
		CurrentLevel     string `json:"current_level"`
		PreferredTerm    string `json:"preferred_term"`
		Notes            string `json:"notes"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if req.StudentProfileID == "" {
		WriteAppError(w, pkg.BadRequest("student_profile_id is required", nil))
		return
	}
	sid, err := uuid.Parse(req.StudentProfileID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid student_profile_id", nil))
		return
	}
	in := service.ApplicationInput{
		StudentProfileID: sid,
		ApplicantName:    req.ApplicantName,
		CurrentLevel:     req.CurrentLevel,
		PreferredTerm:    req.PreferredTerm,
		Notes:            req.Notes,
	}
	var perr error
	if req.InstitutionID != "" {
		if in.InstitutionID, perr = parseUUIDOpt(req.InstitutionID); perr != nil {
			WriteAppError(w, pkg.BadRequest("invalid institution_id", nil))
			return
		}
	}
	if req.ProgrammeID != "" {
		if in.ProgrammeID, perr = parseUUIDOpt(req.ProgrammeID); perr != nil {
			WriteAppError(w, pkg.BadRequest("invalid programme_id", nil))
			return
		}
	}
	if req.CohortID != "" {
		if in.CohortID, perr = parseUUIDOpt(req.CohortID); perr != nil {
			WriteAppError(w, pkg.BadRequest("invalid cohort_id", nil))
			return
		}
	}
	app, err := h.svc.Apply(r.Context(), actor.UserID, in)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, app, nil)
}

// ListMine — GET /api/v1/admissions/me (parent).
func (h *AdmissionsHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	apps, err := h.svc.ListMine(r.Context(), actor.UserID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, apps, nil)
}

// ListQueue — GET /api/v1/admin/admissions (admin).
func (h *AdmissionsHandler) ListQueue(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	p := ParsePagination(r)
	status := r.URL.Query().Get("status")
	apps, total, err := h.svc.ListQueue(r.Context(), status, p.Page, p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, apps, p.Meta(total))
}

// SetStatus — POST /api/v1/admin/admissions/{id}/status (admin).
func (h *AdmissionsHandler) SetStatus(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid application id", nil))
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	app, err := h.svc.SetStatus(r.Context(), actor.UserID, id, admissions.Status(req.Status))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, app, nil)
}

func parseUUIDOpt(s string) (*uuid.UUID, error) {
	u, err := uuid.Parse(s)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

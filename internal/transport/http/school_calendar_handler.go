package httpapi

import (
	"net/http"
	"time"

	"ykay-virtual/internal/domain/school"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// SchoolCalendarHandler â€” virtual-school academic calendar (Pillar 1):
// admin CRUD + lifecycle for sessions and terms, plus the public
// current-calendar read for web/mobile.
type SchoolCalendarHandler struct {
	svc *service.SchoolCalendarService
}

func NewSchoolCalendarHandler(svc *service.SchoolCalendarService) *SchoolCalendarHandler {
	return &SchoolCalendarHandler{svc: svc}
}

func requireAdmin(w http.ResponseWriter, r *http.Request) bool {
	actor := requireActor(w, r)
	if actor == nil {
		return false
	}
	if !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return false
	}
	return true
}

type sessionRequest struct {
	InstitutionID string `json:"institution_id"`
	Name          string `json:"name"`
	StartsOn      string `json:"starts_on"` // YYYY-MM-DD
	EndsOn        string `json:"ends_on"`   // YYYY-MM-DD
}

func (req *sessionRequest) toInput() (service.SessionInput, error) {
	var in service.SessionInput
	in.Name = req.Name
	var err error
	if in.StartsOn, err = time.Parse("2006-01-02", req.StartsOn); err != nil {
		return in, pkg.BadRequest("invalid starts_on â€” expected YYYY-MM-DD", nil)
	}
	if in.EndsOn, err = time.Parse("2006-01-02", req.EndsOn); err != nil {
		return in, pkg.BadRequest("invalid ends_on â€” expected YYYY-MM-DD", nil)
	}
	if req.InstitutionID != "" {
		id, perr := uuid.Parse(req.InstitutionID)
		if perr != nil {
			return in, pkg.BadRequest("invalid institution_id", nil)
		}
		in.InstitutionID = &id
	}
	return in, nil
}

type termRequest struct {
	Name               string `json:"name"`
	Number             int    `json:"number"`
	StartsOn           string `json:"starts_on"`                      // YYYY-MM-DD
	EndsOn             string `json:"ends_on"`                        // YYYY-MM-DD
	EnrollmentOpensAt  string `json:"enrollment_opens_at,omitempty"`  // RFC3339, optional
	EnrollmentClosesAt string `json:"enrollment_closes_at,omitempty"` // RFC3339, optional
}

func (req *termRequest) toInput() (service.TermInput, error) {
	var in service.TermInput
	in.Name = req.Name
	in.Number = req.Number
	var err error
	if in.StartsOn, err = time.Parse("2006-01-02", req.StartsOn); err != nil {
		return in, pkg.BadRequest("invalid starts_on â€” expected YYYY-MM-DD", nil)
	}
	if in.EndsOn, err = time.Parse("2006-01-02", req.EndsOn); err != nil {
		return in, pkg.BadRequest("invalid ends_on â€” expected YYYY-MM-DD", nil)
	}
	if req.EnrollmentOpensAt != "" {
		t, perr := time.Parse(time.RFC3339, req.EnrollmentOpensAt)
		if perr != nil {
			return in, pkg.BadRequest("invalid enrollment_opens_at â€” expected RFC3339", nil)
		}
		in.EnrollmentOpensAt = &t
	}
	if req.EnrollmentClosesAt != "" {
		t, perr := time.Parse(time.RFC3339, req.EnrollmentClosesAt)
		if perr != nil {
			return in, pkg.BadRequest("invalid enrollment_closes_at â€” expected RFC3339", nil)
		}
		in.EnrollmentClosesAt = &t
	}
	return in, nil
}

// CreateSession â€” POST /api/v1/admin/school/sessions
func (h *SchoolCalendarHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	var req sessionRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	in, err := req.toInput()
	if err != nil {
		WriteAppError(w, err)
		return
	}
	sess, err := h.svc.CreateSession(r.Context(), in)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, sess, nil)
}

// ListSessions â€” GET /api/v1/admin/school/sessions?institution_id=
func (h *SchoolCalendarHandler) ListSessions(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	var institutionID *uuid.UUID
	if raw := r.URL.Query().Get("institution_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("invalid institution_id", nil))
			return
		}
		institutionID = &id
	}
	sessions, err := h.svc.ListSessions(r.Context(), institutionID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, sessions, nil)
}

// UpdateSession â€” PUT /api/v1/admin/school/sessions/{id}
func (h *SchoolCalendarHandler) UpdateSession(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid session id", nil))
		return
	}
	var req sessionRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	in, err := req.toInput()
	if err != nil {
		WriteAppError(w, err)
		return
	}
	sess, err := h.svc.UpdateSession(r.Context(), id, in)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, sess, nil)
}

// SetSessionStatus â€” POST /api/v1/admin/school/sessions/{id}/status
func (h *SchoolCalendarHandler) SetSessionStatus(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid session id", nil))
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	sess, err := h.svc.SetSessionStatus(r.Context(), id, school.SessionStatus(req.Status))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, sess, nil)
}

// CreateTerm â€” POST /api/v1/admin/school/sessions/{id}/terms
func (h *SchoolCalendarHandler) CreateTerm(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	sessionID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid session id", nil))
		return
	}
	var req termRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	in, err := req.toInput()
	if err != nil {
		WriteAppError(w, err)
		return
	}
	term, err := h.svc.CreateTerm(r.Context(), sessionID, in)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, term, nil)
}

// ListTerms â€” GET /api/v1/admin/school/sessions/{id}/terms
func (h *SchoolCalendarHandler) ListTerms(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	sessionID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid session id", nil))
		return
	}
	terms, err := h.svc.ListTerms(r.Context(), sessionID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, terms, nil)
}

// UpdateTerm â€” PUT /api/v1/admin/school/terms/{id}
func (h *SchoolCalendarHandler) UpdateTerm(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid term id", nil))
		return
	}
	var req termRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	in, err := req.toInput()
	if err != nil {
		WriteAppError(w, err)
		return
	}
	term, err := h.svc.UpdateTerm(r.Context(), id, in)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, term, nil)
}

// SetTermStatus â€” POST /api/v1/admin/school/terms/{id}/status
func (h *SchoolCalendarHandler) SetTermStatus(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid term id", nil))
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	term, err := h.svc.SetTermStatus(r.Context(), id, school.TermStatus(req.Status))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, term, nil)
}

// CurrentCalendar â€” GET /api/v1/school/calendar/current?institution_id=
// (public, anonymous-cacheable). Answers 200 with { active: false } when no
// session is live for the scope, so clients render an empty state.
func (h *SchoolCalendarHandler) CurrentCalendar(w http.ResponseWriter, r *http.Request) {
	var institutionID *uuid.UUID
	if raw := r.URL.Query().Get("institution_id"); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			WriteAppError(w, pkg.BadRequest("invalid institution_id", nil))
			return
		}
		institutionID = &id
	}
	view, err := h.svc.CurrentCalendar(r.Context(), institutionID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, view, nil)
}

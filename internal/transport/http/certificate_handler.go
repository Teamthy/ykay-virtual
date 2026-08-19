package httpapi

import (
	"net/http"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// CertificateHandler — issue + serve learner completion certificates.
type CertificateHandler struct {
	svc *service.CertificateService
}

func NewCertificateHandler(svc *service.CertificateService) *CertificateHandler {
	return &CertificateHandler{svc: svc}
}

// IssueForCohort — POST /api/v1/admin/cohorts/{cohortId}/certificates (admin).
// Issues a certificate to every confirmed enrollment of a completed cohort.
func (h *CertificateHandler) IssueForCohort(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	cohortID, err := uuid.Parse(r.PathValue("cohortId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid cohort id", nil))
		return
	}
	issued, err := h.svc.IssueForCohort(r.Context(), cohortID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, map[string]any{
		"issued":       len(issued),
		"certificates": issued,
	}, nil)
}

// ListMine — GET /api/v1/me/certificates (owner). Lists the certificates the
// actor may view (their own + linked learners').
func (h *CertificateHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	certs, err := h.svc.ListForUser(r.Context(), actor.UserID, 100)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, certs, nil)
}

// GetMine — GET /api/v1/me/certificates/{id} (owner).
func (h *CertificateHandler) GetMine(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid certificate id", nil))
		return
	}
	c, err := h.svc.GetOwned(r.Context(), actor.UserID, id)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, c, nil)
}

// Verify — GET /api/v1/certificates/verify?credential=NUV-000123. Public
// verification by credential number.
func (h *CertificateHandler) Verify(w http.ResponseWriter, r *http.Request) {
	num := r.URL.Query().Get("credential")
	if num == "" {
		WriteAppError(w, pkg.BadRequest("credential query param is required", nil))
		return
	}
	c, err := h.svc.GetByCredential(r.Context(), num)
	if err != nil {
		WriteAppError(w, pkg.NotFound("certificate not found"))
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"valid":             true,
		"learner_name":      c.LearnerName,
		"title":             c.Title,
		"programme_title":   c.ProgrammeTitle,
		"issued_by":         c.IssuedBy,
		"issued_at":         c.IssuedAt,
		"credential_number": c.CredentialNumber,
	}, nil)
}

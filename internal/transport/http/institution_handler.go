package httpapi

import (
	"net/http"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// InstitutionHandler — B2B self-serve console + public profile + admin
// management. Membership is authorized in the service layer (OWNER/ADMIN can
// manage); platform admin routes additionally require a staff session.
type InstitutionHandler struct {
	svc *service.InstitutionService
}

func NewInstitutionHandler(svc *service.InstitutionService) *InstitutionHandler {
	return &InstitutionHandler{svc: svc}
}

// GetBySlug — GET /api/v1/institutions/{slug} (public profile).
func (h *InstitutionHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	inst, err := h.svc.GetBySlug(r.Context(), slug)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, inst, nil)
}

// ListMine — GET /api/v1/me/institutions (self-serve console home).
func (h *InstitutionHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	views, err := h.svc.ListMine(r.Context(), actor.UserID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, views, nil)
}

// GetByID — GET /api/v1/me/institutions/{id} (scoped detail).
func (h *InstitutionHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	inst, err := h.svc.GetByID(r.Context(), actor.UserID, id, actor.IsAdmin)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, inst, nil)
}

// Update — PUT /api/v1/me/institutions/{id} (OWNER/ADMIN).
func (h *InstitutionHandler) Update(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	var req struct {
		Name        *string                      `json:"name"`
		Type        *institution.InstitutionType `json:"type"`
		Email       *string                      `json:"email"`
		Phone       *string                      `json:"phone"`
		Website     *string                      `json:"website"`
		LogoURL     *string                      `json:"logo_url"`
		Description *string                      `json:"description"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	in := service.InstitutionUpdateInput{
		Name: req.Name, Type: req.Type, Email: req.Email, Phone: req.Phone,
		Website: req.Website, LogoURL: req.LogoURL, Description: req.Description,
	}
	inst, err := h.svc.Update(r.Context(), actor.UserID, id, actor.IsAdmin, in)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, inst, nil)
}

// ListMemberships — GET /api/v1/me/institutions/{id}/memberships.
func (h *InstitutionHandler) ListMemberships(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	members, err := h.svc.ListMemberships(r.Context(), actor.UserID, id)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, members, nil)
}

// InviteMember — POST /api/v1/me/institutions/{id}/members.
func (h *InstitutionHandler) InviteMember(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	var req struct {
		UserID string                     `json:"user_id"`
		Role   institution.MembershipRole `json:"role"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	target, err := uuid.Parse(req.UserID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid user_id", nil))
		return
	}
	m, err := h.svc.InviteMember(r.Context(), actor.UserID, id, target, req.Role)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, m, nil)
}

// SetMemberRole — PUT /api/v1/me/institutions/{id}/members/{userId}/role.
func (h *InstitutionHandler) SetMemberRole(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	target, err := uuid.Parse(r.PathValue("userId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid user id", nil))
		return
	}
	var req struct {
		Role institution.MembershipRole `json:"role"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.SetMemberRole(r.Context(), actor.UserID, id, target, req.Role); err != nil {
		WriteAppError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// RemoveMember — DELETE /api/v1/me/institutions/{id}/members/{userId}.
func (h *InstitutionHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	target, err := uuid.Parse(r.PathValue("userId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid user id", nil))
		return
	}
	if err := h.svc.RemoveMember(r.Context(), actor.UserID, id, target); err != nil {
		WriteAppError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ListStudents — GET /api/v1/me/institutions/{id}/students.
func (h *InstitutionHandler) ListStudents(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	students, err := h.svc.ListStudents(r.Context(), actor.UserID, id)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, students, nil)
}

// AddStudent — POST /api/v1/me/institutions/{id}/students.
func (h *InstitutionHandler) AddStudent(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	var req struct {
		StudentProfileID string `json:"student_profile_id"`
		EnrollmentRef    string `json:"enrollment_ref"`
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
	v, err := h.svc.AddStudent(r.Context(), actor.UserID, id, sid, req.EnrollmentRef)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, v, nil)
}

// RemoveStudent — DELETE /api/v1/me/institutions/{id}/students/{studentId}.
func (h *InstitutionHandler) RemoveStudent(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	sid, err := uuid.Parse(r.PathValue("studentId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid student id", nil))
		return
	}
	if err := h.svc.RemoveStudent(r.Context(), actor.UserID, id, sid); err != nil {
		WriteAppError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Admin routes ---

// AdminUpdate — PUT /api/v1/admin/institutions/{id} (platform admin).
func (h *InstitutionHandler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	var req struct {
		Name        *string                      `json:"name"`
		Type        *institution.InstitutionType `json:"type"`
		Email       *string                      `json:"email"`
		Phone       *string                      `json:"phone"`
		Website     *string                      `json:"website"`
		LogoURL     *string                      `json:"logo_url"`
		Description *string                      `json:"description"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	in := service.InstitutionUpdateInput{
		Name: req.Name, Type: req.Type, Email: req.Email, Phone: req.Phone,
		Website: req.Website, LogoURL: req.LogoURL, Description: req.Description,
	}
	inst, err := h.svc.Update(r.Context(), actor.UserID, id, true, in)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, inst, nil)
}

// AdminSetStatus — POST /api/v1/admin/institutions/{id}/status
// { active?: bool, verified?: bool }.
func (h *InstitutionHandler) AdminSetStatus(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	var req struct {
		Active   *bool `json:"active"`
		Verified *bool `json:"verified"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	var inst *institution.Institution
	if req.Active != nil {
		inst, err = h.svc.SetActive(r.Context(), id, *req.Active)
		if err != nil {
			WriteAppError(w, err)
			return
		}
	}
	if req.Verified != nil {
		inst, err = h.svc.SetVerified(r.Context(), id, *req.Verified)
		if err != nil {
			WriteAppError(w, err)
			return
		}
	}
	if inst == nil {
		inst, err = h.svc.GetByID(r.Context(), actor.UserID, id, true)
		if err != nil {
			WriteAppError(w, err)
			return
		}
	}
	pkg.WriteSuccess(w, http.StatusOK, inst, nil)
}

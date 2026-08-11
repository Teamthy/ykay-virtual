package httpapi

import (
	"net/http"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// AdminVettingHandler — admin review queue:
//   - GET  /api/v1/admin/vetting/queue?status=&page=&page_size=
//   - GET  /api/v1/admin/vetting/profiles/{profileId}          (full dossier)
//   - POST /api/v1/admin/vetting/profiles/{profileId}/review   start review
//   - POST /api/v1/admin/vetting/profiles/{profileId}/interview
//   - POST /api/v1/admin/vetting/profiles/{profileId}/verify
//   - POST /api/v1/admin/vetting/profiles/{profileId}/approve
//   - POST /api/v1/admin/vetting/profiles/{profileId}/reject   {reason}
//   - POST /api/v1/admin/vetting/profiles/{profileId}/hold     {reason}
//   - POST /api/v1/admin/vetting/profiles/{profileId}/suspend  {reason}
//   - POST /api/v1/admin/vetting/documents/{documentId}/review {approve, reason}

type AdminVettingHandler struct {
	svc *service.VettingService
}

func NewAdminVettingHandler(svc *service.VettingService) *AdminVettingHandler {
	return &AdminVettingHandler{svc: svc}
}

func (h *AdminVettingHandler) ListQueue(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	p := ParsePagination(r)
	status := r.URL.Query().Get("status")
	if status == "" {
		status = p.Filters["status"]
	}
	profiles, total, err := h.svc.ListQueue(r.Context(), status, p.Page, p.PageSize)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, profiles, p.Meta(total))
}

func (h *AdminVettingHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	profileID, err := uuid.Parse(r.PathValue("profileId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("profile_id must be a valid UUID", nil))
		return
	}
	detail, err := h.svc.GetProfileDetail(r.Context(), profileID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, detail, nil)
}

func (h *AdminVettingHandler) ReviewDocument(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return
	}
	docID, err := uuid.Parse(r.PathValue("documentId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("document_id must be a valid UUID", nil))
		return
	}
	var req struct {
		Approve bool   `json:"approve"`
		Reason  string `json:"reason"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.ReviewDocument(r.Context(), actor.UserID, docID, req.Approve, req.Reason); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"reviewed": true}, nil)
}

type adminActionReq struct {
	Reason string `json:"reason"`
}

func (h *AdminVettingHandler) action(step string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor := requireActor(w, r)
		if actor == nil || !actor.IsAdmin {
			WriteAppError(w, pkg.Forbidden("admin access required"))
			return
		}
		profileID, err := uuid.Parse(r.PathValue("profileId"))
		if err != nil {
			WriteAppError(w, pkg.BadRequest("profile_id must be a valid UUID", nil))
			return
		}
		var req adminActionReq
		_ = DecodeJSON(r, &req)

		var svcErr error
		switch step {
		case "review":
			svcErr = h.svc.StartReview(r.Context(), actor.UserID, profileID)
		case "interview":
			svcErr = h.svc.MoveToInterview(r.Context(), actor.UserID, profileID)
		case "verify":
			svcErr = h.svc.MoveToVerification(r.Context(), actor.UserID, profileID)
		case "approve":
			svcErr = h.svc.Approve(r.Context(), actor.UserID, profileID)
		case "reject":
			svcErr = h.svc.Reject(r.Context(), actor.UserID, profileID, req.Reason)
		case "hold":
			svcErr = h.svc.Hold(r.Context(), actor.UserID, profileID, req.Reason)
		case "suspend":
			svcErr = h.svc.Suspend(r.Context(), actor.UserID, profileID, req.Reason)
		default:
			WriteAppError(w, pkg.BadRequest("unknown action", nil))
			return
		}
		if svcErr != nil {
			WriteAppError(w, svcErr)
			return
		}
		pkg.WriteSuccess(w, http.StatusOK, map[string]any{"action": step, "profile_id": profileID.String()}, nil)
	}
}

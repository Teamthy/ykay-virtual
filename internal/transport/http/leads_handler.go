package httpapi

import (
	"net/http"
	"strconv"
	"strings"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// LeadsHandler — public lead capture + admin follow-up console.
type LeadsHandler struct {
	svc *service.LeadService
}

func NewLeadsHandler(svc *service.LeadService) *LeadsHandler { return &LeadsHandler{svc: svc} }

// requireAdminGate — admin-only access check (same contract as the admin
// console handlers).
func (h *LeadsHandler) requireAdminGate(w http.ResponseWriter, r *http.Request) *uuid.UUID {
	actor := requireActor(w, r)
	if actor == nil || !actor.IsAdmin {
		WriteAppError(w, pkg.Forbidden("admin access required"))
		return nil
	}
	return &actor.UserID
}

// Capture — POST /api/v1/leads (public). Callback requests and browse
// captures from the marketing pages. A honeypot field rejects bots.
func (h *LeadsHandler) Capture(w http.ResponseWriter, r *http.Request) {
	var req struct {
		service.CaptureLeadInput
		Website string `json:"website"` // honeypot — humans never fill it
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if strings.TrimSpace(req.Website) != "" {
		// Pretend success so bots learn nothing.
		pkg.WriteSuccess(w, http.StatusCreated, map[string]any{"received": true}, nil)
		return
	}
	if req.Phone != "" {
		req.Phone = strings.TrimSpace(req.Phone)
	}
	lead, err := h.svc.Capture(r.Context(), req.CaptureLeadInput)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, map[string]any{"received": true, "id": lead.ID}, nil)
}

// List — GET /admin/leads?status=NEW&page=1 (admin).
func (h *LeadsHandler) List(w http.ResponseWriter, r *http.Request) {
	if h.requireAdminGate(w, r) == nil {
		return
	}
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	size, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 20
	}
	list, total, err := h.svc.List(r.Context(), r.URL.Query().Get("status"), page, size)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	counts, err := h.svc.Counts(r.Context())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	meta := pkg.NewPaginationMeta(page, size, total)
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"leads": list, "counts": counts}, &meta)
}

// UpdateStatus — POST /admin/leads/{leadId}/status {status} (admin).
func (h *LeadsHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	adminID := h.requireAdminGate(w, r)
	if adminID == nil {
		return
	}
	leadID, err := uuid.Parse(r.PathValue("leadId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("leadId must be a valid UUID", nil))
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	lead, err := h.svc.UpdateStatus(r.Context(), *adminID, leadID, strings.ToUpper(strings.TrimSpace(req.Status)))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, lead, nil)
}

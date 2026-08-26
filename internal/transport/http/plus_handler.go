package httpapi

import (
	"net/http"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// PlusHandler — NUVORA Plus premium tier: status, activation, cancellation.
type PlusHandler struct {
	svc *service.PlusService
}

func NewPlusHandler(svc *service.PlusService) *PlusHandler {
	return &PlusHandler{svc: svc}
}

// GetMyPlan — GET /api/v1/me/plus (my subscription + entitlements).
func (h *PlusHandler) GetMyPlan(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	status, err := h.svc.GetMyPlan(r.Context(), actor.UserID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, status, nil)
}

// ListPlans — GET /api/v1/plus/plans (public pricing catalogue).
func (h *PlusHandler) ListPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.svc.ListPlans(r.Context())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, plans, nil)
}

// Activate — POST /api/v1/me/plus/activate { plan_code, trial? }.
func (h *PlusHandler) Activate(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		PlanCode string `json:"plan_code"`
		Trial    bool   `json:"trial"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	sub, err := h.svc.ActivatePlan(r.Context(), actor.UserID, req.PlanCode, req.Trial)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, sub, nil)
}

// Cancel — POST /api/v1/me/plus/cancel.
func (h *PlusHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	if err := h.svc.CancelPlan(r.Context(), actor.UserID); err != nil {
		WriteAppError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Purchase — POST /api/v1/me/plus/purchase { plan_code }.
// Creates a PENDING order for the plan price; the user pays through the normal
// payment flow and Plus is activated on settlement.
func (h *PlusHandler) Purchase(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req struct {
		PlanCode string `json:"plan_code"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	order, err := h.svc.PurchasePlus(r.Context(), actor.UserID, req.PlanCode)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, map[string]any{
		"order": order,
	}, nil)
}

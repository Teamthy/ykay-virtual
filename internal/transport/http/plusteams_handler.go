package httpapi

import (
	"net/http"

	"github.com/google/uuid"

	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// PlusTeamsHandler — YK-Virtual Plus Teams seat management (000069). Institution
// OWNER/ADMIN (or platform admin) manage seats; the institution console shows
// allocation + holders.
type PlusTeamsHandler struct {
	svc *service.PlusTeamsService
}

func NewPlusTeamsHandler(svc *service.PlusTeamsService) *PlusTeamsHandler {
	return &PlusTeamsHandler{svc: svc}
}

// GetAllocation — GET /api/v1/me/institutions/{id}/plus.
func (h *PlusTeamsHandler) GetAllocation(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	a, err := h.svc.GetAllocation(r.Context(), id)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, a, nil)
}

// SetSeats — PUT /api/v1/me/institutions/{id}/plus/seats { total_seats }.
func (h *PlusTeamsHandler) SetSeats(w http.ResponseWriter, r *http.Request) {
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
		TotalSeats int `json:"total_seats"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	a, err := h.svc.SetSeats(r.Context(), actor.UserID, id, actor.IsAdmin, req.TotalSeats)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, a, nil)
}

// AssignSeat — POST /api/v1/me/institutions/{id}/plus/seats { user_id }.
func (h *PlusTeamsHandler) AssignSeat(w http.ResponseWriter, r *http.Request) {
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
		UserID string `json:"user_id"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	uid, err := uuid.Parse(req.UserID)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid user_id", nil))
		return
	}
	seat, err := h.svc.AssignSeat(r.Context(), actor.UserID, id, uid, actor.IsAdmin)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, seat, nil)
}

// ReleaseSeat — DELETE /api/v1/me/institutions/{id}/plus/seats/{userId}.
func (h *PlusTeamsHandler) ReleaseSeat(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	uid, err := uuid.Parse(r.PathValue("userId"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid user id", nil))
		return
	}
	if err := h.svc.ReleaseSeat(r.Context(), actor.UserID, id, uid, actor.IsAdmin); err != nil {
		WriteAppError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ListSeats — GET /api/v1/me/institutions/{id}/plus/seats.
func (h *PlusTeamsHandler) ListSeats(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteAppError(w, pkg.BadRequest("invalid institution id", nil))
		return
	}
	seats, err := h.svc.ListSeats(r.Context(), actor.UserID, id, actor.IsAdmin)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, seats, nil)
}

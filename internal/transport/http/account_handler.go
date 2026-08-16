package httpapi

import (
	"encoding/json"
	"net/http"

	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// AccountHandler — self-service /account (phase 37).

type AccountHandler struct {
	svc *service.AccountService
}

func NewAccountHandler(svc *service.AccountService) *AccountHandler {
	return &AccountHandler{svc: svc}
}

func (h *AccountHandler) requireUser(w http.ResponseWriter, r *http.Request) (*uuid.UUID, bool) {
	actor, ok := middleware.ActorFromContext(r.Context())
	if !ok || actor.UserID == uuid.Nil {
		pkg.WriteError(w, http.StatusUnauthorized, string(pkg.CodeUnauthorized), "authentication required", nil)
		return nil, false
	}
	return &actor.UserID, true
}

// UpdateProfile — PUT /auth/me/profile
func (h *AccountHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	var req service.UpdateProfileInput
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	user, err := h.svc.UpdateProfile(r.Context(), *userID, req)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"id": user.ID.String(), "email": user.Email,
		"first_name": user.FirstName, "last_name": user.LastName,
		"phone": user.Phone, "timezone": user.Timezone,
		"status": string(user.Status),
	}, nil)
}

// ExportData — GET /auth/me/export (JSON download)
func (h *AccountHandler) ExportData(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	data, err := h.svc.ExportData(r.Context(), *userID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", `attachment; filename="nuvora-export.json"`)
	_ = json.NewEncoder(w).Encode(data)
}

// DeleteAccount — POST /auth/me/delete
func (h *AccountHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	if err := h.svc.DeleteAccount(r.Context(), *userID); err != nil {
		WriteAppError(w, err)
		return
	}
	middleware.ClearSessionCookie(w, r, middleware.DefaultCookieConfig(false))
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"deleted": true}, nil)
}

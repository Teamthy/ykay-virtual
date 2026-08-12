package httpapi

import (
	"net/http"

	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// DeviceHandler — push-device registry for the mobile app / PWA (M4).
// All routes require a session (cookie or bearer).

type DeviceHandler struct {
	svc *service.PushService
}

func NewDeviceHandler(svc *service.PushService) *DeviceHandler {
	return &DeviceHandler{svc: svc}
}

func (h *DeviceHandler) requireUser(w http.ResponseWriter, r *http.Request) (*uuid.UUID, bool) {
	actor, ok := middleware.ActorFromContext(r.Context())
	if !ok || actor.UserID == uuid.Nil {
		pkg.WriteError(w, http.StatusUnauthorized, string(pkg.CodeUnauthorized), "authentication required", nil)
		return nil, false
	}
	return &actor.UserID, true
}

// RegisterDevice — POST /me/devices {token, platform?, app_version?}
func (h *DeviceHandler) RegisterDevice(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	var req struct {
		Token      string `json:"token"`
		Platform   string `json:"platform"`
		AppVersion string `json:"app_version"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	d, err := h.svc.RegisterDevice(r.Context(), *userID, req.Token, req.Platform, req.AppVersion)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, d, nil)
}

// ListDevices — GET /me/devices
func (h *DeviceHandler) ListDevices(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	list, err := h.svc.ListDevices(r.Context(), *userID)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, list, nil)
}

// RemoveDevice — DELETE /me/devices/{deviceId}
func (h *DeviceHandler) RemoveDevice(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	deviceID, err := ParseUUID(r, "deviceId")
	if err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.RemoveDevice(r.Context(), deviceID, *userID); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"removed": true}, nil)
}

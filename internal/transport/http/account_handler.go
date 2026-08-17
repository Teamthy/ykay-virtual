package httpapi

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/service"
	"ykay-virtual/internal/storage"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// AccountHandler — self-service /account (phase 37).

type AccountHandler struct {
	svc     *service.AccountService
	storage storage.Storage
}

func NewAccountHandler(svc *service.AccountService) *AccountHandler {
	return &AccountHandler{svc: svc}
}

// WithStorage wires the object store used for avatar uploads.
func (h *AccountHandler) WithStorage(st storage.Storage) *AccountHandler {
	h.storage = st
	return h
}

// avatarExts maps accepted content types to file extensions.
var avatarExts = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
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

// UploadAvatar — POST /me/avatar (raw image body, Content-Type header).
// The upload guard enforces the size + MIME allowlist before the object is
// stored; the resulting PUBLIC object URL is persisted on the user row and
// returned so the client can refresh the session cache.
func (h *AccountHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	if h.storage == nil {
		WriteAppError(w, pkg.Conflict("avatar storage is not configured"))
		return
	}
	ct := strings.ToLower(strings.TrimSpace(r.Header.Get("Content-Type")))
	if ct == "" {
		ct = "image/jpeg"
	}
	ext, ok := avatarExts[ct]
	if !ok {
		WriteAppError(w, pkg.BadRequest("avatar must be JPEG, PNG or WebP", nil))
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 11<<20) // 11 MiB hard cap (guard allows 10)
	data, err := io.ReadAll(r.Body)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("could not read avatar: "+err.Error(), nil))
		return
	}
	key := "avatars/" + userID.String() + ext
	if err := h.storage.Upload(r.Context(), storage.BucketPublic, key, data, ct); err != nil {
		WriteAppError(w, err)
		return
	}
	url := h.storage.GetPublicURL(storage.BucketPublic, key)
	_, err = h.svc.UpdateProfile(r.Context(), *userID, service.UpdateProfileInput{AvatarURL: &url})
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"avatar_url": url}, nil)
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

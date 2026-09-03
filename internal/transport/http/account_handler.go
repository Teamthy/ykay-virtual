package httpapi

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"

	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/service"
	"ykay-virtual/internal/storage"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// AccountHandler — self-service /account (phase 37).

type AccountHandler struct {
	svc       *service.AccountService
	storage   storage.Storage
	cookieCfg middleware.CookieConfig
	uploadGuard
}

// uploadGuard — shared upload safety for any handler that stores raw bodies:
// malware signature scan (gap #5) + image magic-byte verification.
type uploadGuard struct {
	malware storage.MalwareScanner
}

// WithMalwareScanner wires an upload malware scanner (gap #5). Defaults to the
// always-on signature scanner when nil.
func (h *AccountHandler) WithMalwareScanner(m storage.MalwareScanner) *AccountHandler {
	h.malware = m
	return h
}

// rejectIfMalware scans file bytes and, if anything is found, writes a 422 and
// returns true so the caller stops before storing. Fails closed: a scan error
// rejects the upload (never store unsanitized content).
func (h *uploadGuard) rejectIfMalware(w http.ResponseWriter, r *http.Request, data []byte) bool {
	if h.malware == nil {
		h.malware = storage.NewDefaultMalwareScanner("")
	}
	res, err := h.malware.Scan(r.Context(), data)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("upload blocked: malware scanner unavailable: "+err.Error(), nil))
		return true
	}
	if !res.Clean {
		WriteAppError(w, pkg.Unprocessable("upload blocked: "+res.Threat))
		return true
	}
	return false
}

// sniffImageType returns the real image content type from magic bytes ("" when
// the data is not a JPEG/PNG image) — the header is never trusted, so a
// renamed executable or polyglot is rejected outright.
func sniffImageType(data []byte) string {
	if len(data) < 12 {
		return ""
	}
	switch {
	case bytes.Equal(data[:2], []byte{0xff, 0xd8}): // JPEG
		return "image/jpeg"
	case bytes.Equal(data[:8], []byte{0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a}): // PNG
		return "image/png"
	}
	return ""
}

// resourceExts maps accepted upload content types to file extensions (LMS
// materials: documents, spreadsheets, presentations, images, media).
var resourceExts = map[string]string{
	"application/pdf":    ".pdf",
	"image/jpeg":         ".jpg",
	"image/png":          ".png",
	"image/webp":         ".webp",
	"application/msword": ".doc",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":   ".docx",
	"application/vnd.ms-powerpoint":                                             ".ppt",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
	"application/vnd.ms-excel":                                                  ".xls",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         ".xlsx",
	"video/mp4":                ".mp4",
	"video/webm":               ".webm",
	"audio/mpeg":               ".mp3",
	"text/plain":               ".txt",
	"text/markdown":            ".md",
	"application/octet-stream": ".bin",
}

func NewAccountHandler(svc *service.AccountService) *AccountHandler {
	cfg := middleware.DefaultCookieConfig(os.Getenv("ENVIRONMENT") == "production")
	cfg.Domain = os.Getenv("COOKIE_DOMAIN")
	return &AccountHandler{svc: svc, cookieCfg: cfg}
}

func (h *AccountHandler) WithCookieConfig(cfg middleware.CookieConfig) *AccountHandler {
	h.cookieCfg = cfg
	return h
}

// WithStorage wires the object store used for avatar uploads.
func (h *AccountHandler) WithStorage(st storage.Storage) *AccountHandler {
	h.storage = st
	return h
}

// avatarExts maps accepted content types to file extensions. Profile photos
// are JPEG/PNG only (product requirement) — never a pasted URL.
var avatarExts = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
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
		"bio": user.Bio, "preferred_language": user.PreferredLanguage,
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
	r.Body = http.MaxBytesReader(w, r.Body, 11<<20) // 11 MiB hard cap (guard allows 10)
	data, err := io.ReadAll(r.Body)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("could not read avatar: "+err.Error(), nil))
		return
	}
	// Gap #5: malware scan + image-magic verification before storing.
	if h.rejectIfMalware(w, r, data) {
		return
	}
	// The sniffed content type is authoritative: profile photos must be a real
	// JPEG or PNG file (never a URL, never a renamed executable).
	ct := sniffImageType(data)
	ext, ok := avatarExts[ct]
	if !ok {
		WriteAppError(w, pkg.BadRequest("avatar must be a JPEG or PNG image (upload the file, not a URL)", nil))
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

// UploadResource — POST /me/uploads (authenticated). Raw file body uploaded to
// the public bucket; returns the object URL for use as an LMS material. MIME is
// validated against an allowlist and size is capped server-side (25 MiB so
// short lesson videos can be hosted on the free plan).
func (h *AccountHandler) UploadResource(w http.ResponseWriter, r *http.Request) {
	userID, ok := h.requireUser(w, r)
	if !ok {
		return
	}
	if h.storage == nil {
		WriteAppError(w, pkg.Conflict("object storage is not configured"))
		return
	}
	ct := strings.ToLower(strings.TrimSpace(r.Header.Get("Content-Type")))
	ext, ok := resourceExts[ct]
	if !ok {
		WriteAppError(w, pkg.BadRequest("file type not allowed (PDF, Office, images, mp4/webm/mp3)", nil))
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 26<<20) // 26 MiB cap (hard), 25 MiB effective
	data, err := io.ReadAll(r.Body)
	if err != nil {
		WriteAppError(w, pkg.BadRequest("could not read upload: "+err.Error(), nil))
		return
	}
	if len(data) > 25<<20 {
		WriteAppError(w, pkg.BadRequest("file exceeds the 25 MiB limit", nil))
		return
	}
	if len(data) == 0 {
		WriteAppError(w, pkg.BadRequest("empty upload", nil))
		return
	}
	// Gap #5: malware scan before the object is stored.
	if h.rejectIfMalware(w, r, data) {
		return
	}
	key := "uploads/" + userID.String() + "/" + uuid.NewString() + ext
	if err := h.storage.Upload(r.Context(), storage.BucketPublic, key, data, ct); err != nil {
		WriteAppError(w, err)
		return
	}
	url := h.storage.GetPublicURL(storage.BucketPublic, key)
	pkg.WriteSuccess(w, http.StatusCreated, map[string]any{"url": url, "content_type": ct, "size": len(data)}, nil)
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
	w.Header().Set("Content-Disposition", `attachment; filename="yk-virtual-export.json"`)
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
	middleware.ClearSessionCookie(w, r, h.cookieCfg)
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"deleted": true}, nil)
}

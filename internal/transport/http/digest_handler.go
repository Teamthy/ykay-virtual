package httpapi

import (
	"net/http"
	"time"

	"ykay-virtual/internal/domain/digest"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// DigestHandler — weekly parent progress digest (000076).
// GET  /me/digest-prefs — current toggle + last-sent watermark.
// PUT  /me/digest-prefs — { "enabled": bool } toggle.
type DigestHandler struct {
	digest *service.DigestService
}

func NewDigestHandler(digest *service.DigestService) *DigestHandler {
	return &DigestHandler{digest: digest}
}

type digestPrefsResponse struct {
	Enabled    bool       `json:"enabled"`
	LastSentAt *time.Time `json:"last_sent_at,omitempty"`
}

func toDigestPrefsResponse(p *digest.Prefs) digestPrefsResponse {
	return digestPrefsResponse{Enabled: p.Enabled, LastSentAt: p.LastSentAt}
}

// Get returns the caller's prefs (default enabled=true when never toggled).
func (h *DigestHandler) Get(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	prefs, err := h.digest.GetPrefs(r.Context(), actor.UserID)
	if err != nil || prefs == nil {
		http.Error(w, "could not load digest preferences", http.StatusInternalServerError)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, toDigestPrefsResponse(prefs), nil)
}

type digestPrefsRequest struct {
	Enabled bool `json:"enabled"`
}

// Set toggles the caller's weekly digest on or off.
func (h *DigestHandler) Set(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	var req digestPrefsRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.digest.SetEnabled(r.Context(), actor.UserID, req.Enabled); err != nil {
		http.Error(w, "could not update digest preferences", http.StatusInternalServerError)
		return
	}
	prefs, err := h.digest.GetPrefs(r.Context(), actor.UserID)
	if err != nil || prefs == nil {
		http.Error(w, "could not reload digest preferences", http.StatusInternalServerError)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, toDigestPrefsResponse(prefs), nil)
}

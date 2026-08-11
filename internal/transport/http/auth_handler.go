package httpapi

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"

	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/service"
	"ykay-virtual/pkg"
)

// AuthHandler — register / login / logout / me with httpOnly-cookie sessions:
//   - POST /api/v1/auth/register   {email, password, roles[]}
//   - POST /api/v1/auth/login      {email, password} → Set-Cookie ykay_session
//   - POST /api/v1/auth/logout     (clears cookie, revokes session)
//   - GET  /api/v1/auth/me         current user + roles

type AuthHandler struct {
	svc *service.AuthService
	cfg middleware.CookieConfig
}

func NewAuthHandler(svc *service.AuthService, secureCookies bool) *AuthHandler {
	return &AuthHandler{svc: svc, cfg: middleware.DefaultCookieConfig(secureCookies)}
}

type userResponse struct {
	ID        string   `json:"id"`
	Email     string   `json:"email"`
	Status    string   `json:"status"`
	Timezone  string   `json:"timezone"`
	Roles     []string `json:"roles"`
	CreatedAt string   `json:"created_at"`
}

func toUserResponse(id, email, status, timezone string, roles []string, createdAt string) userResponse {
	return userResponse{ID: id, Email: email, Status: status, Timezone: timezone, Roles: roles, CreatedAt: createdAt}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req service.RegisterInput
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	user, err := h.svc.Register(r.Context(), req)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusCreated, toUserResponse(
		user.ID.String(), user.Email, string(user.Status), user.Timezone, req.Roles,
		user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	), nil)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	ip := clientIP(r)
	token, user, roles, err := h.svc.Login(r.Context(), req.Email, req.Password, ip, r.UserAgent())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	middleware.SetSessionCookie(w, h.cfg, token)
	pkg.WriteSuccess(w, http.StatusOK, toUserResponse(
		user.ID.String(), user.Email, string(user.Status), user.Timezone, roles,
		user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	), nil)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(h.cfg.Name); err == nil && cookie.Value != "" {
		_ = h.svc.Logout(r.Context(), hashToken(cookie.Value))
	}
	middleware.ClearSessionCookie(w, h.cfg)
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"logged_out": true}, nil)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(h.cfg.Name)
	if err != nil || cookie.Value == "" {
		pkg.WriteError(w, http.StatusUnauthorized, string(pkg.CodeUnauthorized), "not authenticated", nil)
		return
	}
	user, roles, err := h.svc.Me(r.Context(), hashToken(cookie.Value))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, toUserResponse(
		user.ID.String(), user.Email, string(user.Status), user.Timezone, roles,
		user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	), nil)
}

func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i > 0 {
		host = host[:i]
	}
	return host
}

package httpapi

import (
	"crypto/sha256"
	"encoding/hex"
	"net"
	"net/http"
	"strings"

	"ykay-virtual/internal/domain/identity"
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
	svc     *service.AuthService
	cfg     middleware.CookieConfig
	siteURL string
	google  *service.GoogleAuthService
}

func NewAuthHandler(svc *service.AuthService, secureCookies bool, siteURL string, google *service.GoogleAuthService) *AuthHandler {
	if siteURL == "" {
		siteURL = "http://localhost:3000"
	}
	return &AuthHandler{svc: svc, cfg: middleware.DefaultCookieConfig(secureCookies), siteURL: siteURL}
}

type userResponse struct {
	ID        string   `json:"id"`
	Email     string   `json:"email"`
	FirstName string   `json:"first_name,omitempty"`
	LastName  string   `json:"last_name,omitempty"`
	Phone     *string  `json:"phone,omitempty"`
	Status    string   `json:"status"`
	Timezone  string   `json:"timezone"`
	Roles     []string `json:"roles"`
	CreatedAt string   `json:"created_at"`
}

func toUserResponse(id, email, status, timezone string, roles []string, createdAt string) userResponse {
	return userResponse{ID: id, Email: email, Status: status, Timezone: timezone, Roles: roles, CreatedAt: createdAt}
}

func toUserResponseFull(u *identity.User, roles []string) userResponse {
	return userResponse{
		ID: u.ID.String(), Email: u.Email,
		FirstName: u.FirstName, LastName: u.LastName, Phone: u.Phone,
		Status: string(u.Status), Timezone: u.Timezone, Roles: roles,
		CreatedAt: u.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
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

func (h *AuthHandler) RequestLoginCode(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if req.Email == "" {
		WriteAppError(w, pkg.BadRequest("email is required", nil))
		return
	}
	// Anti-enumeration: service always reports success for valid-looking emails.
	if err := h.svc.RequestLoginCode(r.Context(), req.Email); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"sent": true}, nil)
}

func (h *AuthHandler) ConfirmLoginCode(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	ip := clientIP(r)
	token, user, roles, err := h.svc.ConfirmLoginCode(r.Context(), req.Email, req.Code, ip, r.UserAgent())
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

func (h *AuthHandler) GoogleAuthURL(w http.ResponseWriter, r *http.Request) {
	if h.google == nil || !h.google.Enabled() {
		WriteAppError(w, pkg.Conflict("google auth is not configured"))
		return
	}
	u, state, err := h.google.BuildAuthURL()
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"url": u, "state": state}, nil)
}

func (h *AuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	if h.google == nil || !h.google.Enabled() {
		WriteAppError(w, pkg.Conflict("google auth is not configured"))
		return
	}
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if code == "" || state == "" {
		WriteAppError(w, pkg.BadRequest("missing code or state", nil))
		return
	}
	ip := clientIP(r)
	token, user, roles, err := h.google.ExchangeCode(r.Context(), code, state, ip, r.UserAgent())
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
	if raw := middleware.BearerToken(r); raw != "" {
		_ = h.svc.Logout(r.Context(), hashToken(raw))
	}
	middleware.ClearSessionCookie(w, h.cfg)
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"logged_out": true}, nil)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	raw := ""
	if cookie, err := r.Cookie(h.cfg.Name); err == nil && cookie.Value != "" {
		raw = cookie.Value
	} else {
		raw = middleware.BearerToken(r)
	}
	if raw == "" {
		pkg.WriteError(w, http.StatusUnauthorized, string(pkg.CodeUnauthorized), "not authenticated", nil)
		return
	}
	user, roles, err := h.svc.Me(r.Context(), hashToken(raw))
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, toUserResponseFull(user, roles), nil)
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
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	// IPv6 literals come back bracketed from SplitHostPort ([::1]).
	return strings.TrimPrefix(strings.TrimSuffix(host, "]"), "[")
}

// --- Email verification + password reset (Phase 8) ---

// SetRole — POST /auth/me/role {role} — sets the caller's primary role
// (stateful onboarding step 3). Requires a valid session.
func (h *AuthHandler) SetRole(w http.ResponseWriter, r *http.Request) {
	actor, ok := middleware.ActorFromContext(r.Context())
	if !ok {
		pkg.WriteError(w, http.StatusUnauthorized, string(pkg.CodeUnauthorized), "not authenticated", nil)
		return
	}
	var req struct {
		Role string `json:"role"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if strings.TrimSpace(req.Role) == "" {
		WriteAppError(w, pkg.BadRequest("role is required", nil))
		return
	}
	roles, err := h.svc.SetPrimaryRole(r.Context(), actor.UserID, req.Role)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"roles": roles}, nil)
}

// ChangePassword — POST /auth/me/password {new_password} — sets a new
// password for the caller (onboarding "complete your profile" step).
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	actor, ok := middleware.ActorFromContext(r.Context())
	if !ok {
		pkg.WriteError(w, http.StatusUnauthorized, string(pkg.CodeUnauthorized), "not authenticated", nil)
		return
	}
	var req struct {
		NewPassword string `json:"new_password"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.ChangePassword(r.Context(), actor.UserID, req.NewPassword); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"changed": true}, nil)
}

// ResendVerification — POST /auth/verify-email/request {email}
func (h *AuthHandler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.RequestEmailVerification(r.Context(), req.Email, h.siteURL); err != nil {
		WriteAppError(w, err)
		return
	}
	// Always 200 (never reveal account existence).
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"sent": true}, nil)
}

// ConfirmVerification — POST /auth/verify-email/confirm {token}
func (h *AuthHandler) ConfirmVerification(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token string `json:"token"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	user, err := h.svc.VerifyEmail(r.Context(), req.Token)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"verified": true, "status": string(user.Status),
	}, nil)
}

// RequestPasswordReset — POST /auth/password-reset/request {email}
func (h *AuthHandler) RequestPasswordReset(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.RequestPasswordReset(r.Context(), req.Email, h.siteURL); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"sent": true}, nil)
}

// ConfirmPasswordReset — POST /auth/password-reset/confirm {token, new_password}
func (h *AuthHandler) ConfirmPasswordReset(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if err := h.svc.ResetPassword(r.Context(), req.Token, req.NewPassword); err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"reset": true}, nil)
}

// MobileLogin — POST /auth/login/mobile — same credential flow as /auth/login
// but returns the raw session token in the body (native apps store it in the
// OS keychain; no cookie required).
func (h *AuthHandler) MobileLogin(w http.ResponseWriter, r *http.Request) {
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
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"token": token,
		"user": toUserResponse(
			user.ID.String(), user.Email, string(user.Status), user.Timezone, roles,
			user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		),
	}, nil)
}

// MobileLoginCodeConfirm — POST /auth/login-code/mobile/confirm — 6-digit
// code sign-in that returns the raw session token for native apps.
func (h *AuthHandler) MobileLoginCodeConfirm(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	ip := clientIP(r)
	token, user, roles, err := h.svc.ConfirmLoginCode(r.Context(), req.Email, req.Code, ip, r.UserAgent())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"token": token,
		"user": toUserResponse(
			user.ID.String(), user.Email, string(user.Status), user.Timezone, roles,
			user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		),
	}, nil)
}

// GoogleExchange — POST /auth/google/exchange {code, state} — server-to-server
// exchange that returns the raw session token + user (used by the Next.js
// callback route so the session cookie lands on the APP host, not the API).
func (h *AuthHandler) GoogleExchange(w http.ResponseWriter, r *http.Request) {
	if h.google == nil || !h.google.Enabled() {
		WriteAppError(w, pkg.Conflict("google auth is not configured"))
		return
	}
	var req struct {
		Code  string `json:"code"`
		State string `json:"state"`
	}
	if err := DecodeJSON(r, &req); err != nil {
		WriteAppError(w, err)
		return
	}
	if req.Code == "" || req.State == "" {
		WriteAppError(w, pkg.BadRequest("missing code or state", nil))
		return
	}
	ip := clientIP(r)
	token, user, roles, err := h.google.ExchangeCode(r.Context(), req.Code, req.State, ip, r.UserAgent())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{
		"token": token,
		"user":  toUserResponseFull(user, roles),
	}, nil)
}

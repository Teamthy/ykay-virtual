package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
)

// Google OAuth (phase 29). Flow:
//   BuildAuthURL → user consents → GET /auth/google/callback?code=&state=
//   → ExchangeCode (token) → fetch userinfo → upsert user (email verified)
//   → create session (same path as password login) → set cookie.

const (
	googleAuthURL  = "https://accounts.google.com/o/oauth2/v2/auth"
	googleTokenURL = "https://oauth2.googleapis.com/token"
	googleUserURL  = "https://www.googleapis.com/oauth2/v2/userinfo"
	googleScope    = "openid email profile"
	googleStateTTL = 10 * time.Minute
)

type GoogleOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

// GoogleAuthService — OAuth helper on AuthService. The state nonce is stored
// in the shared cache (Redis in production, in-memory in dev) so that:
//   - state is atomic + single-use (GetDel consumes it exactly once),
//   - the store is shared across API replicas (state issued on one instance
//     is valid on the one handling the callback),
//   - the store is bounded by TTL (no unbounded in-memory map).
//
// Without a store the flow fails closed (BuildAuthURL errors).
type GoogleAuthService struct {
	cfg   GoogleOAuthConfig
	auth  *AuthService
	http  *http.Client
	state cache.Cache // shared single-use nonce store (nil → disabled)
}

func NewGoogleAuthService(cfg GoogleOAuthConfig, auth *AuthService) *GoogleAuthService {
	return &GoogleAuthService{
		cfg:  cfg,
		auth: auth,
		http: &http.Client{Timeout: 15 * time.Second},
	}
}

// WithStateStore wires the shared cache used for OAuth state nonces.
func (g *GoogleAuthService) WithStateStore(c cache.Cache) *GoogleAuthService {
	g.state = c
	return g
}

func (g *GoogleAuthService) Enabled() bool { return g.cfg.ClientID != "" && g.cfg.ClientSecret != "" }

// stateKey namespaces a single-use OAuth nonce in the shared cache.
func (g *GoogleAuthService) stateKey(state string) string {
	return cache.CacheKey("oauth:google:state", state)
}

// BuildAuthURL returns the consent URL + the state nonce to echo back.
func (g *GoogleAuthService) BuildAuthURL(ctx context.Context) (string, string, error) {
	if !g.Enabled() {
		return "", "", fmt.Errorf("%w: google auth is not configured", domain.ErrConflict)
	}
	if g.state == nil {
		return "", "", fmt.Errorf("%w: oauth state store is not configured", domain.ErrConflict)
	}
	// Random 24-byte nonce; SetNX makes registration single-writer so a
	// (negligible) collision regenerates instead of overwriting an in-flight
	// nonce.
	var state string
	for attempt := 0; attempt < 5; attempt++ {
		var err error
		if state, err = randomState(); err != nil {
			return "", "", err
		}
		ok, err := g.state.SetNX(ctx, g.stateKey(state), "1", googleStateTTL)
		if err != nil {
			return "", "", fmt.Errorf("store oauth state: %w", err)
		}
		if ok {
			break
		}
	}
	if state == "" {
		return "", "", fmt.Errorf("%w: could not allocate oauth state", domain.ErrConflict)
	}
	q := url.Values{}
	q.Set("client_id", g.cfg.ClientID)
	q.Set("redirect_uri", g.cfg.RedirectURL)
	q.Set("response_type", "code")
	q.Set("scope", googleScope)
	q.Set("state", state)
	q.Set("prompt", "select_account")
	return googleAuthURL + "?" + q.Encode(), state, nil
}

// ExchangeCode — trades the auth code for a token, fetches the profile and
// signs the user in (creates an account on first Google login).
func (g *GoogleAuthService) ExchangeCode(ctx context.Context, code, state, ip, userAgent string) (string, *identity.User, []string, error) {
	if !g.Enabled() {
		return "", nil, nil, fmt.Errorf("%w: google auth is not configured", domain.ErrConflict)
	}
	if g.state == nil {
		return "", nil, nil, fmt.Errorf("%w: oauth state store is not configured", domain.ErrConflict)
	}
	// Validate + consume the state nonce atomically (single-use, shared
	// across replicas, TTL-bounded). An absent/expired/replayed nonce fails
	// closed with 401.
	consumed, err := g.state.GetDel(ctx, g.stateKey(state))
	if err != nil {
		return "", nil, nil, fmt.Errorf("consume oauth state: %w", err)
	}
	if consumed == "" {
		return "", nil, nil, fmt.Errorf("%w: invalid or expired oauth state", domain.ErrUnauthorized)
	}

	// 1) Exchange code → access token.
	form := url.Values{}
	form.Set("code", code)
	form.Set("client_id", g.cfg.ClientID)
	form.Set("client_secret", g.cfg.ClientSecret)
	form.Set("redirect_uri", g.cfg.RedirectURL)
	form.Set("grant_type", "authorization_code")
	res, err := g.http.PostForm(googleTokenURL, form)
	if err != nil {
		return "", nil, nil, fmt.Errorf("google token exchange: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return "", nil, nil, fmt.Errorf("google token exchange: %s %s", res.Status, truncateStr(string(body), 200))
	}
	var tok struct {
		AccessToken string `json:"access_token"`
		IDToken     string `json:"id_token"`
	}
	if err := json.NewDecoder(res.Body).Decode(&tok); err != nil {
		return "", nil, nil, fmt.Errorf("google token decode: %w", err)
	}

	// 2) Fetch profile.
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, googleUserURL, nil)
	req.Header.Set("Authorization", "Bearer "+tok.AccessToken)
	ures, err := g.http.Do(req)
	if err != nil {
		return "", nil, nil, fmt.Errorf("google userinfo: %w", err)
	}
	defer ures.Body.Close()
	if ures.StatusCode != http.StatusOK {
		return "", nil, nil, fmt.Errorf("google userinfo: %s", ures.Status)
	}
	var profile struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
	}
	if err := json.NewDecoder(ures.Body).Decode(&profile); err != nil {
		return "", nil, nil, fmt.Errorf("google userinfo decode: %w", err)
	}
	if profile.Email == "" {
		return "", nil, nil, fmt.Errorf("%w: google account has no email", domain.ErrUnauthorized)
	}

	// 3) Upsert user by email.
	user, err := g.auth.users.FindByEmail(ctx, strings.ToLower(profile.Email))
	if errors.Is(err, domain.ErrNotFound) {
		user, err = g.auth.createOAuthUser(ctx, profile.Email, profile.Name)
	}
	if err != nil {
		return "", nil, nil, err
	}
	if !user.CanLogin() {
		return "", nil, nil, fmt.Errorf("%w: account is not active", domain.ErrForbidden)
	}

	// 4) Session (same path as password login).
	return g.auth.startSession(ctx, user, ip, userAgent)
}

// createOAuthUser — registers a Google-sourced user as email-verified ACTIVE.
func (s *AuthService) createOAuthUser(ctx context.Context, email, name string) (*identity.User, error) {
	now := s.now().UTC()
	user := &identity.User{
		Email:           strings.ToLower(email),
		Status:          identity.UserStatusActive,
		Timezone:        "Africa/Lagos",
		EmailVerifiedAt: &now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	// Password hash: random unguessable (Google users sign in via OAuth only).
	raw, _, _ := newSessionToken()
	user.PasswordHash = raw
	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}
	// Default role: PARENT (families are the core audience); tutors complete
	// the vetting flow which adds the TUTOR role on approval.
	if role, err := s.roles.FindByName(ctx, "PARENT"); err == nil {
		_ = s.roles.AssignToUser(ctx, user.ID, role.ID)
	}
	_ = s.audit.LogStateChange(ctx, &user.ID, identity.AuditCreate, "user",
		&user.ID, nil, map[string]any{"email": user.Email, "method": "google_oauth"}, nil, nil)
	return user, nil
}

func randomState() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func truncateStr(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/notification"
)

// AuthService — registration, session-based login (httpOnly cookie bound),
// logout, current-user lookup and session rotation on privilege change.
//
// Security invariants (per AGENTS.md / PRD):
//   - Passwords hashed with bcrypt (never stored/returned raw)
//   - Sessions: random 32-byte token; only its SHA-256 hash is stored;
//     the raw token lives only in the httpOnly cookie
//   - Sessions rotate on privilege change (role grant/revoke)
//   - Rate limiting on auth endpoints is applied at the transport layer

const (
	SessionTTL    = 30 * 24 * time.Hour
	bcryptCost    = 10
	SessionCookie = "ykay_session"
)

type AuthService struct {
	users     identity.UserRepository
	sessions  identity.SessionRepository
	roles     identity.RoleRepository
	tokens    identity.AuthTokenRepository
	email     notification.EmailSender
	audit     identity.AuditService
	referrals ReferralApplier
	now       func() time.Time
}

func NewAuthService(users identity.UserRepository, sessions identity.SessionRepository,
	roles identity.RoleRepository, audit identity.AuditService) *AuthService {
	return &AuthService{
		users: users, sessions: sessions, roles: roles, audit: audit,
		tokens: nil, email: notification.NewEmailSender(), now: time.Now,
	}
}

// WithAuthTokens wires the token repository (email verification + reset).
func (s *AuthService) WithAuthTokens(tokens identity.AuthTokenRepository) *AuthService {
	s.tokens = tokens
	return s
}

// WithEmailSender overrides the email adapter (tests / custom delivery).
func (s *AuthService) WithEmailSender(email notification.EmailSender) *AuthService {
	s.email = email
	return s
}

// WithReferrals wires the referral applier (register ?ref=CODE support).
func (s *AuthService) WithReferrals(r ReferralApplier) *AuthService {
	s.referrals = r
	return s
}

type RegisterInput struct {
	Email        string   `json:"email"`
	Password     string   `json:"password"`
	Roles        []string `json:"roles"` // e.g. ["PARENT"], ["TUTOR"], ["STUDENT"]
	Phone        *string  `json:"phone,omitempty"`
	Timezone     string   `json:"timezone,omitempty"`
	ReferralCode string   `json:"referral_code,omitempty"`
}

// Register — creates the user with bcrypt hash, assigns roles (validated
// against the roles table), audits the event. Returns the sanitized user.
func (s *AuthService) Register(ctx context.Context, in RegisterInput) (*identity.User, error) {
	email := strings.ToLower(strings.TrimSpace(in.Email))
	if !validEmail(email) {
		return nil, fmt.Errorf("%w: a valid email is required", domain.ErrInvalidInput)
	}
	if len(in.Password) < 8 {
		return nil, fmt.Errorf("%w: password must be at least 8 characters", domain.ErrInvalidInput)
	}
	if len(in.Roles) == 0 {
		return nil, fmt.Errorf("%w: at least one role is required (STUDENT, PARENT, TUTOR)", domain.ErrInvalidInput)
	}
	if in.Timezone == "" {
		in.Timezone = "Africa/Lagos"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcryptCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &identity.User{
		Email:        email,
		Phone:        in.Phone,
		PasswordHash: string(hash),
		Status:       identity.UserStatusPending,
		Timezone:     in.Timezone,
	}
	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}
	for _, roleName := range in.Roles {
		roleName = strings.ToUpper(strings.TrimSpace(roleName))
		role, err := s.roles.FindByName(ctx, roleName)
		if err != nil {
			continue // unknown role names are ignored (defensive)
		}
		_ = s.roles.AssignToUser(ctx, user.ID, role.ID)
	}
	if s.referrals != nil && strings.TrimSpace(in.ReferralCode) != "" {
		// Record the referral (best-effort — never blocks registration).
		_, _ = s.referrals.Apply(ctx, user.ID, in.ReferralCode)
	}
	_ = s.audit.LogStateChange(ctx, &user.ID, identity.AuditCreate, "user",
		&user.ID, nil, map[string]any{"email": user.Email, "roles": in.Roles, "status": user.Status},
		nil, nil)
	return user, nil
}

// Login — verifies credentials, creates a session, returns the raw token
// (the handler puts it in the httpOnly cookie) + the user + roles.
func (s *AuthService) Login(ctx context.Context, email, password, ip, userAgent string) (token string, user *identity.User, roles []string, err error) {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err = s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return "", nil, nil, fmt.Errorf("%w: invalid credentials", domain.ErrUnauthorized)
		}
		return "", nil, nil, err
	}
	if !user.CanLogin() {
		return "", nil, nil, fmt.Errorf("%w: account is not active", domain.ErrForbidden)
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil {
		return "", nil, nil, fmt.Errorf("%w: invalid credentials", domain.ErrUnauthorized)
	}

	raw, hash, err := newSessionToken()
	if err != nil {
		return "", nil, nil, err
	}
	now := s.now().UTC()
	session := &identity.Session{
		UserID:    user.ID,
		TokenHash: hash,
		IPAddress: &ip,
		UserAgent: &userAgent,
		ExpiresAt: now.Add(SessionTTL),
	}
	if err := s.sessions.Create(ctx, session); err != nil {
		return "", nil, nil, err
	}
	_ = s.users.UpdateLastLogin(ctx, user.ID, now)
	roleList, _ := s.roles.RolesForUser(ctx, user.ID)
	roles = make([]string, 0, len(roleList))
	for _, r := range roleList {
		roles = append(roles, r.Name)
	}
	_ = s.audit.LogStateChange(ctx, &user.ID, identity.AuditLogin, "session",
		&session.ID, nil, map[string]any{"email": user.Email, "ip": ip}, nil, nil)
	return raw, user, roles, nil
}

// Me — resolves the current user + roles from a session token hash.
func (s *AuthService) Me(ctx context.Context, tokenHash string) (*identity.User, []string, error) {
	session, err := s.sessions.FindByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil, nil, err
	}
	if session.RevokedAt != nil {
		return nil, nil, fmt.Errorf("%w: session revoked", domain.ErrUnauthorized)
	}
	if session.ExpiresAt.Before(s.now().UTC()) {
		return nil, nil, fmt.Errorf("%w: session expired", domain.ErrUnauthorized)
	}
	user, err := s.users.FindByID(ctx, session.UserID)
	if err != nil {
		return nil, nil, err
	}
	if !user.CanLogin() {
		return nil, nil, fmt.Errorf("%w: account is not active", domain.ErrForbidden)
	}
	roleList, _ := s.roles.RolesForUser(ctx, user.ID)
	roles := make([]string, 0, len(roleList))
	for _, r := range roleList {
		roles = append(roles, r.Name)
	}
	return user, roles, nil
}

// Logout — revokes the session by token hash (cookie cleared by handler).
func (s *AuthService) Logout(ctx context.Context, tokenHash string) error {
	session, err := s.sessions.FindByTokenHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil // idempotent logout
		}
		return err
	}
	return s.sessions.Revoke(ctx, session.ID)
}

// RotateAllSessions — revokes every session for a user (privilege change).
// The user re-authenticates to get a fresh session (session rotation per
// AGENTS.md: "Sessions rotate on privilege change").
func (s *AuthService) RotateAllSessions(ctx context.Context, userID uuid.UUID) error {
	return s.sessions.RevokeAllForUser(ctx, userID)
}

// --- Helpers ---

func newSessionToken() (raw, hash string, err error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", "", fmt.Errorf("generate session token: %w", err)
	}
	raw = base64.RawURLEncoding.EncodeToString(buf)
	sum := sha256.Sum256([]byte(raw))
	return raw, hex.EncodeToString(sum[:]), nil
}

// HashToken — SHA-256 hex of a raw session token (for cookie→lookup).
func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func validEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".")
}

package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/notification"
)

// Magic-link login (phase 18): 6-digit code via email, 10-minute TTL,
// single-use, hashed at rest (sha256 of userID:code), anti-enumeration
// (request always succeeds for valid-looking emails), sessions created via
// the same path as password login.

const (
	loginCodeTTL    = 10 * time.Minute
	loginCodeLength = 6
)

// RequestLoginCode — emails a 6-digit sign-in code. Always returns nil for a
//
// syntactically valid email so the response does not reveal account existence.
func (s *AuthService) RequestLoginCode(ctx context.Context, email string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil // anti-enumeration: pretend success
		}
		return err
	}
	if !user.CanLogin() {
		return nil // suspended/not active: do not leak status either
	}

	code, err := generateLoginCode()
	if err != nil {
		return err
	}

	// One active code per user.
	_ = s.tokens.InvalidateAllForUser(ctx, user.ID, identity.TokenLoginCode)
	token := &identity.AuthToken{
		UserID:    user.ID,
		Purpose:   identity.TokenLoginCode,
		TokenHash: HashToken(fmt.Sprintf("%s:%s", user.ID, code)),
		ExpiresAt: s.now().UTC().Add(loginCodeTTL),
	}
	if err := s.tokens.Create(ctx, token); err != nil {
		return err
	}

	s.logDev("login code for %s: %s (expires in 10 minutes)", user.Email, code)
	if err := s.sendEmail(ctx, user.Email, "Your NUVORA login code",
		notification.BrandEmail(
			"<h1 style=\"margin:0 0 12px;font-size:20px;color:#111111;\">Your NUVORA login code</h1>"+
				"<p style=\"margin:0 0 16px;\">Hi,</p>"+
				"<p style=\"margin:0 0 20px;\">Use this code to verify your email or sign in. It expires in 10 minutes.</p>"+
				"<p style=\"margin:0 0 20px;text-align:center;\"><span style=\"display:inline-block;background:#FFF4CC;color:#111111;font-size:30px;font-weight:800;letter-spacing:0.35em;padding:14px 22px;border-radius:12px;font-family:monospace;\">"+code+"</span></p>"+
				"<p style=\"margin:0;color:#555555;font-size:13px;\">If you did not request this code, ignore this email.</p>")); err != nil {
		slog.Error("login code email failed", "email", user.Email, "error", err)
		return fmt.Errorf("could not send login code: %w", err)
	}
	_ = s.audit.LogStateChange(ctx, &user.ID, identity.AuditLogin, "auth_token",
		nil, nil, map[string]any{"purpose": string(identity.TokenLoginCode)}, nil, nil)
	return nil
}

// ConfirmLoginCode — verifies the code, consumes it and starts a session
// (same session path as password login, including the audit trail).
func (s *AuthService) ConfirmLoginCode(ctx context.Context, email, code, ip, userAgent string) (string, *identity.User, []string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	code = strings.TrimSpace(code)
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		return "", nil, nil, fmt.Errorf("%w: invalid login code", domain.ErrUnauthorized)
	}
	if !user.CanLogin() {
		return "", nil, nil, fmt.Errorf("%w: account is not active", domain.ErrForbidden)
	}

	t, err := s.tokens.FindByHash(ctx, HashToken(fmt.Sprintf("%s:%s", user.ID, code)))
	if err != nil || t.Purpose != identity.TokenLoginCode || t.UserID != user.ID {
		return "", nil, nil, fmt.Errorf("%w: invalid login code", domain.ErrUnauthorized)
	}
	if t.IsConsumed() || s.now().UTC().After(t.ExpiresAt) {
		return "", nil, nil, fmt.Errorf("%w: login code expired", domain.ErrUnauthorized)
	}
	if err := s.tokens.Consume(ctx, t.ID); err != nil {
		return "", nil, nil, err
	}
	// A successful code sign-in proves email ownership: mark the address
	// verified and activate pending accounts (onboarding "verify email" step).
	if user.EmailVerifiedAt == nil {
		now := s.now().UTC()
		user.EmailVerifiedAt = &now
		if user.Status == identity.UserStatusPending {
			user.Status = identity.UserStatusActive
		}
		if err := s.users.Update(ctx, user); err != nil {
			return "", nil, nil, err
		}
	}
	return s.startSession(ctx, user, ip, userAgent)
}

// startSession — shared session creation used by password login and login code.
func (s *AuthService) startSession(ctx context.Context, user *identity.User, ip, userAgent string) (string, *identity.User, []string, error) {
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
	roles := make([]string, 0, len(roleList))
	for _, r := range roleList {
		roles = append(roles, r.Name)
	}
	_ = s.audit.LogStateChange(ctx, &user.ID, identity.AuditLogin, "session",
		&session.ID, nil, map[string]any{"email": user.Email, "ip": ip, "method": "login_code"}, nil, nil)
	return raw, user, roles, nil
}

func generateLoginCode() (string, error) {
	max := big.NewInt(int64(1e6))
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%0*d", loginCodeLength, n.Int64()), nil
}

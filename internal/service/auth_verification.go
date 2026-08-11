package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/url"
	"time"
	"ykay-virtual/internal/notification"

	"golang.org/x/crypto/bcrypt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
)

// Email verification + password reset (Phase 8) — extends AuthService.
// Tokens are single-use (consumed_at), expiring (24h), hash-only-stored.
// Password resets rotate ALL sessions (privilege/credential change).

const (
	authTokenTTL    = 24 * time.Hour
	verifyEmailFrom = "verification@nuvora.com"
	resetFrom       = "security@nuvora.com"
)

// RequestEmailVerification — creates a VERIFY_EMAIL token and emails the
// link. Idempotent per user: outstanding tokens are invalidated first.
func (s *AuthService) RequestEmailVerification(ctx context.Context, email string, siteURL string) error {
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil // never reveal whether an account exists
		}
		return err
	}
	if user.EmailVerifiedAt != nil {
		return nil // already verified
	}
	if s.tokens == nil {
		return errors.New("token store unavailable")
	}
	_ = s.tokens.InvalidateAllForUser(ctx, user.ID, identity.TokenVerifyEmail)

	raw, err := generateAuthToken()
	if err != nil {
		return err
	}
	token := &identity.AuthToken{
		UserID:    user.ID,
		Purpose:   identity.TokenVerifyEmail,
		TokenHash: HashToken(raw),
		ExpiresAt: s.now().UTC().Add(authTokenTTL),
	}
	if err := s.tokens.Create(ctx, token); err != nil {
		return err
	}
	link := fmt.Sprintf("%s/verify-email?token=%s", stringsTrimSlash(siteURL), url.QueryEscape(raw))
	return s.email.Send(ctx, user.Email, "Verify your NUVORA email",
		notification.BrandEmail(
			"<h1 style=\"margin:0 0 12px;font-size:20px;color:#0A1F44;\">Welcome to NUVORA</h1>"+
				"<p style=\"margin:0 0 16px;\">Hi,</p>"+
				"<p style=\"margin:0 0 20px;\">Click the button below to verify your email and activate your NUVORA account:</p>"+
				"<p><a href=\""+link+"\" style=\"display:inline-block;background:#1E5EFF;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;\">Verify email</a></p>"+
				"<p style=\"margin:20px 0 0;color:#8794AC;font-size:13px;\">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>"))
}

// VerifyEmail — consumes the token, marks the email verified and activates
// the account (PENDING_VERIFICATION → ACTIVE).
func (s *AuthService) VerifyEmail(ctx context.Context, rawToken string) (*identity.User, error) {
	if s.tokens == nil {
		return nil, errors.New("token store unavailable")
	}
	token, err := s.tokens.FindByHash(ctx, HashToken(rawToken))
	if err != nil {
		return nil, fmt.Errorf("%w: invalid or expired verification link", domain.ErrInvalidInput)
	}
	if token.Purpose != identity.TokenVerifyEmail {
		return nil, fmt.Errorf("%w: invalid token purpose", domain.ErrInvalidInput)
	}
	if token.IsConsumed() {
		return nil, fmt.Errorf("%w: verification link already used", domain.ErrConflict)
	}
	if token.IsExpired(s.now().UTC()) {
		return nil, fmt.Errorf("%w: verification link expired", domain.ErrInvalidInput)
	}
	user, err := s.users.FindByID(ctx, token.UserID)
	if err != nil {
		return nil, err
	}
	if user.EmailVerifiedAt != nil {
		_ = s.tokens.Consume(ctx, token.ID)
		return user, nil // already verified — idempotent
	}

	now := s.now().UTC()
	user.EmailVerifiedAt = &now
	user.Status = identity.UserStatusActive
	if err := s.users.Update(ctx, user); err != nil {
		return nil, err
	}
	if err := s.tokens.Consume(ctx, token.ID); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &user.ID, identity.AuditUpdate, "user",
		&user.ID, map[string]any{"status": identity.UserStatusPending},
		map[string]any{"status": identity.UserStatusActive, "email_verified": true}, nil, nil)
	return user, nil
}

// RequestPasswordReset — emails a reset link. Never reveals account existence.
func (s *AuthService) RequestPasswordReset(ctx context.Context, email, siteURL string) error {
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil
		}
		return err
	}
	if s.tokens == nil {
		return errors.New("token store unavailable")
	}
	_ = s.tokens.InvalidateAllForUser(ctx, user.ID, identity.TokenPasswordReset)

	raw, err := generateAuthToken()
	if err != nil {
		return err
	}
	token := &identity.AuthToken{
		UserID:    user.ID,
		Purpose:   identity.TokenPasswordReset,
		TokenHash: HashToken(raw),
		ExpiresAt: s.now().UTC().Add(authTokenTTL),
	}
	if err := s.tokens.Create(ctx, token); err != nil {
		return err
	}
	link := fmt.Sprintf("%s/reset-password?token=%s", stringsTrimSlash(siteURL), url.QueryEscape(raw))
	return s.email.Send(ctx, user.Email, "Reset your NUVORA password",
		notification.BrandEmail(
			"<h1 style=\"margin:0 0 12px;font-size:20px;color:#0A1F44;\">Reset your password</h1>"+
				"<p style=\"margin:0 0 16px;\">Hi,</p>"+
				"<p style=\"margin:0 0 20px;\">We received a request to reset your NUVORA password. Click the button below to choose a new one:</p>"+
				"<p><a href=\""+link+"\" style=\"display:inline-block;background:#1E5EFF;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;\">Reset password</a></p>"+
				"<p style=\"margin:20px 0 0;color:#8794AC;font-size:13px;\">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>"))
}

// ResetPassword — consumes the token, updates the bcrypt hash, and rotates
// ALL sessions (credential change = session rotation).
func (s *AuthService) ResetPassword(ctx context.Context, rawToken, newPassword string) error {
	if s.tokens == nil {
		return errors.New("token store unavailable")
	}
	if len(newPassword) < 8 {
		return fmt.Errorf("%w: password must be at least 8 characters", domain.ErrInvalidInput)
	}
	token, err := s.tokens.FindByHash(ctx, HashToken(rawToken))
	if err != nil {
		return fmt.Errorf("%w: invalid or expired reset link", domain.ErrInvalidInput)
	}
	if token.Purpose != identity.TokenPasswordReset {
		return fmt.Errorf("%w: invalid token purpose", domain.ErrInvalidInput)
	}
	if token.IsConsumed() {
		return fmt.Errorf("%w: reset link already used", domain.ErrConflict)
	}
	if token.IsExpired(s.now().UTC()) {
		return fmt.Errorf("%w: reset link expired", domain.ErrInvalidInput)
	}
	user, err := s.users.FindByID(ctx, token.UserID)
	if err != nil {
		return err
	}
	hash, err := bcryptHash(newPassword)
	if err != nil {
		return err
	}
	user.PasswordHash = hash
	if err := s.users.Update(ctx, user); err != nil {
		return err
	}
	if err := s.tokens.Consume(ctx, token.ID); err != nil {
		return err
	}
	_ = s.tokens.InvalidateAllForUser(ctx, user.ID, identity.TokenPasswordReset)
	// Credential change → rotate every session (AGENTS.md session rotation).
	if err := s.sessions.RevokeAllForUser(ctx, user.ID); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &user.ID, identity.AuditUpdate, "user",
		&user.ID, nil, map[string]any{"action": "password_reset"}, nil, nil)
	return nil
}

func generateAuthToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate auth token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func stringsTrimSlash(s string) string {
	if len(s) > 0 && s[len(s)-1] == '/' {
		return s[:len(s)-1]
	}
	return s
}

func bcryptHash(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(hash), nil
}

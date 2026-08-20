package service

import (
	"context"
	"regexp"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
)

// Magic-link login: request → code emailed (anti-enumeration) → wrong code
// rejected → correct code consumes the token and starts a session.
func TestAuth_LoginCodeFlow(t *testing.T) {
	env, mail := newAuthEnvWithTokens(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "magic@example.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)
	// Activate the account (register leaves it PENDING_VERIFICATION).
	require.NoError(t, env.svc.RequestEmailVerification(ctx, "magic@example.com", "http://localhost:3000"))
	raw := mail.lastToken()
	require.NotEmpty(t, raw)
	_, err = env.svc.VerifyEmail(ctx, raw)
	require.NoError(t, err)
	mail.sent = nil

	// Unknown email: still succeeds (anti-enumeration).
	require.NoError(t, env.svc.RequestLoginCode(ctx, "nobody@example.com"))
	assert.Len(t, mail.sent, 0)

	require.NoError(t, env.svc.RequestLoginCode(ctx, "magic@example.com"))
	require.Len(t, mail.sent, 1)

	re := regexp.MustCompile(`font-family:monospace;">([0-9]{6})</span>`)
	m := re.FindStringSubmatch(mail.sent[0].body)
	require.Len(t, m, 2, "code should appear in the email body")
	code := m[1]

	// Wrong code → unauthorized.
	_, _, _, err = env.svc.ConfirmLoginCode(ctx, "magic@example.com", "000000", "1.2.3.4", "test")
	assert.ErrorIs(t, err, domain.ErrUnauthorized)

	// Correct code → session token + roles.
	token, user, roles, err := env.svc.ConfirmLoginCode(ctx, "magic@example.com", code, "1.2.3.4", "test")
	require.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.Equal(t, "magic@example.com", user.Email)
	assert.Contains(t, roles, "PARENT")

	// Code consumed → second use rejected.
	_, _, _, err = env.svc.ConfirmLoginCode(ctx, "magic@example.com", code, "1.2.3.4", "test")
	assert.ErrorIs(t, err, domain.ErrUnauthorized)

	// Session is live.
	me, roles2, err := env.svc.Me(ctx, HashToken(token))
	require.NoError(t, err)
	assert.Equal(t, "magic@example.com", me.Email)
	assert.NotEmpty(t, roles2)
}

// Google OAuth: unconfigured → conflict; configured → consent URL built.
func TestAuth_GoogleOAuth_Config(t *testing.T) {
	env, _ := newAuthEnvWithTokens(t)
	g := NewGoogleAuthService(GoogleOAuthConfig{}, env.svc)
	assert.False(t, g.Enabled())

	g2 := NewGoogleAuthService(GoogleOAuthConfig{
		ClientID: "id-123", ClientSecret: "secret", RedirectURL: "http://localhost:8080/api/v1/auth/google/callback",
	}, env.svc).WithStateStore(newMemCache())
	assert.True(t, g2.Enabled())
	u, state, err := g2.BuildAuthURL(context.Background())
	require.NoError(t, err)
	assert.Contains(t, u, "accounts.google.com/o/oauth2/v2/auth")
	assert.Contains(t, u, "client_id=id-123")
	assert.NotEmpty(t, state)

	// Exchange with a bad state → unauthorized.
	_, _, _, err = g2.ExchangeCode(context.Background(), "code", "bad-state", "1.2.3.4", "test")
	assert.ErrorIs(t, err, domain.ErrUnauthorized)
}

// Phase 30 onboarding backend: code sign-in proves email ownership (verifies
// + activates pending accounts), SetPrimaryRole swaps roles, ChangePassword
// sets a new bcrypt password.
func TestAuth_OnboardingBackend(t *testing.T) {
	env, mail := newAuthEnvWithTokens(t)
	ctx := context.Background()

	// Fresh register → PENDING_VERIFICATION, no verification e-mail yet.
	_, err := env.svc.Register(ctx, RegisterInput{Email: "ob@example.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)
	u, err := env.store.Users.FindByEmail(ctx, "ob@example.com")
	require.NoError(t, err)
	require.Equal(t, identity.UserStatusPending, u.Status)
	require.Nil(t, u.EmailVerifiedAt)

	// Step 2 — verify email with the 6-digit login code: on success the
	// account is marked verified AND activated.
	require.NoError(t, env.svc.RequestLoginCode(ctx, "ob@example.com"))
	body := mail.sent[len(mail.sent)-1].body
	m := regexp.MustCompile(`>([0-9]{6})<`).FindStringSubmatch(body)
	require.GreaterOrEqual(t, len(m), 2, "login code missing from latest email")
	token, _, roles, err := env.svc.ConfirmLoginCode(ctx, "ob@example.com", m[1], "1.2.3.4", "test")
	require.NoError(t, err)
	require.NotEmpty(t, token)
	require.Contains(t, roles, "PARENT")
	u, err = env.store.Users.FindByEmail(ctx, "ob@example.com")
	require.NoError(t, err)
	require.NotNil(t, u.EmailVerifiedAt)
	require.Equal(t, identity.UserStatusActive, u.Status)

	// Step 3 — swap the primary role to STUDENT.
	roles, err = env.svc.SetPrimaryRole(ctx, u.ID, "student")
	require.NoError(t, err)
	require.Equal(t, []string{"STUDENT"}, roles)
	roles, err = env.svc.SetPrimaryRole(ctx, u.ID, "TUTOR")
	require.NoError(t, err)
	require.Equal(t, []string{"TUTOR"}, roles)
	// Unknown role → rejected, previous role untouched.
	_, err = env.svc.SetPrimaryRole(ctx, u.ID, "SPACEFARER")
	require.ErrorIs(t, err, domain.ErrInvalidInput)
	got, err := env.store.Roles.RolesForUser(ctx, u.ID)
	require.NoError(t, err)
	require.Len(t, got, 1)
	require.Equal(t, "TUTOR", got[0].Name)

	// Step 5 — set a real password, then log in with it.
	newTok, err := env.svc.ChangePassword(ctx, u.ID, "password123", "my-new-password-1")
	require.NoError(t, err)
	require.NotEmpty(t, newTok, "a fresh session token must be issued after a password change")
	_, err = env.svc.ChangePassword(ctx, u.ID, "my-new-password-1", "short")
	require.ErrorIs(t, err, domain.ErrInvalidInput)
	res, err := env.svc.Login(ctx, "ob@example.com", "my-new-password-1", "1.2.3.4", "test")
	user := res.User
	roles = res.Roles
	require.NoError(t, err)
	require.Equal(t, "ob@example.com", user.Email)
	require.Contains(t, roles, "TUTOR")
}

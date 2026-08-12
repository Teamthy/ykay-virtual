package service

import (
	"context"
	"regexp"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"ykay-virtual/internal/domain"
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

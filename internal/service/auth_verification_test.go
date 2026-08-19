package service

import (
	"context"
	"net/url"
	"strings"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/repository/memory"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeEmail — captures outbound emails so tests can read tokens from links.
type fakeEmail struct {
	sent []struct{ to, subject, body string }
}

func (f *fakeEmail) Send(_ context.Context, to, subject, body string) error {
	f.sent = append(f.sent, struct{ to, subject, body string }{to, subject, body})
	return nil
}

func (f *fakeEmail) lastToken() string {
	if len(f.sent) == 0 {
		return ""
	}
	body := f.sent[len(f.sent)-1].body
	// link is of form ...?token=<raw>
	idx := strings.Index(body, "token=")
	if idx < 0 {
		return ""
	}
	rest := body[idx+len("token="):]
	end := strings.IndexAny(rest, "\"<& ")
	if end < 0 {
		end = len(rest)
	}
	raw, err := url.QueryUnescape(rest[:end])
	if err != nil {
		return ""
	}
	return raw
}

func newAuthEnvWithTokens(t *testing.T) (*authEnv, *fakeEmail) {
	t.Helper()
	env := newAuthEnv(t)
	env.svc.WithAuthTokens(memory.NewAuthTokenMemory())
	mail := &fakeEmail{}
	env.svc.WithEmailSender(mail)
	return env, mail
}

func TestVerifyEmail_Flow(t *testing.T) {
	env, mail := newAuthEnvWithTokens(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "kid@example.com", Password: "password123", Roles: []string{"STUDENT"}})
	require.NoError(t, err)

	require.NoError(t, env.svc.RequestEmailVerification(ctx, "kid@example.com", "http://localhost:3000"))
	require.Len(t, mail.sent, 1)
	raw := mail.lastToken()
	require.NotEmpty(t, raw)

	user, err := env.svc.VerifyEmail(ctx, raw)
	require.NoError(t, err)
	assert.Equal(t, identity.UserStatusActive, user.Status)
	require.NotNil(t, user.EmailVerifiedAt)

	// Token consumed → second use conflicts.
	_, err = env.svc.VerifyEmail(ctx, raw)
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestVerifyEmail_ExpiredAndUnknown(t *testing.T) {
	env, mail := newAuthEnvWithTokens(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "a@b.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)
	require.NoError(t, env.svc.RequestEmailVerification(ctx, "a@b.com", "http://localhost:3000"))
	raw := mail.lastToken()

	// Force expiry by moving the clock.
	env.svc.now = func() time.Time { return fixedTime.Add(25 * time.Hour) }
	_, err = env.svc.VerifyEmail(ctx, raw)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	_, err = env.svc.VerifyEmail(ctx, "garbage-token")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestRequestVerification_UnknownEmail_NoError(t *testing.T) {
	env, _ := newAuthEnvWithTokens(t)
	// Must NOT error (account existence is never revealed).
	require.NoError(t, env.svc.RequestEmailVerification(context.Background(), "nobody@example.com", "http://localhost:3000"))
}

func TestPasswordReset_Flow_RotatesSessions(t *testing.T) {
	env, mail := newAuthEnvWithTokens(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "parent@example.com", Password: "old-password-1", Roles: []string{"PARENT"}})
	require.NoError(t, err)

	// Active session before the reset.
	res, err := env.svc.Login(ctx, "parent@example.com", "old-password-1", "", "")
	require.NoError(t, err)
	token := res.Token
	_, _, err = env.svc.Me(ctx, HashToken(token))
	require.NoError(t, err)

	require.NoError(t, env.svc.RequestPasswordReset(ctx, "parent@example.com", "http://localhost:3000"))
	raw := mail.lastToken()
	require.NotEmpty(t, raw)

	require.NoError(t, env.svc.ResetPassword(ctx, raw, "new-password-2"))

	// Old password no longer works; new one does.
	_, err = env.svc.Login(ctx, "parent@example.com", "old-password-1", "", "")
	assert.ErrorIs(t, err, domain.ErrUnauthorized)
	res, err = env.svc.Login(ctx, "parent@example.com", "new-password-2", "", "")
	user := res.User
	require.NoError(t, err)

	// All sessions rotated: the pre-reset session is dead.
	_, _, err = env.svc.Me(ctx, HashToken(token))
	assert.ErrorIs(t, err, domain.ErrUnauthorized)

	// Reset token consumed → cannot reuse.
	err = env.svc.ResetPassword(ctx, raw, "another-pass-3")
	assert.ErrorIs(t, err, domain.ErrConflict)

	// Password hash actually changed.
	stored, _ := env.store.Users.FindByID(ctx, user.ID)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(stored.PasswordHash), []byte("new-password-2")))
}

func TestResetPassword_Validation(t *testing.T) {
	env, mail := newAuthEnvWithTokens(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "a@b.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)
	require.NoError(t, env.svc.RequestPasswordReset(ctx, "a@b.com", "http://localhost:3000"))
	raw := mail.lastToken()

	err = env.svc.ResetPassword(ctx, raw, "short")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	err = env.svc.ResetPassword(ctx, "garbage", "password123")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

package service

import (
	"context"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Per-account failed-login throttle — the per-IP rate limiter cannot stop a
// distributed attack focused on ONE account; five failures inside the window
// lock that account for the lock duration, and a successful login clears
// the counter.

// newThrottleEnv — an auth env on the REAL clock (the shared newAuthEnv
// pins svc.now to a fixed time, which the sliding throttle window needs).
func newThrottleEnv(t *testing.T) *authEnv {
	t.Helper()
	env := newAuthEnv(t)
	env.svc.now = time.Now
	hashed, err := bcrypt.GenerateFromPassword([]byte("correct1"), bcrypt.MinCost)
	require.NoError(t, err)
	require.NoError(t, env.store.Users.Create(context.Background(), &identity.User{
		Email: "ada@example.com", PasswordHash: string(hashed), Status: identity.UserStatusActive,
	}))
	return env
}

func TestLogin_ThrottlesRepeatedFailuresPerAccount(t *testing.T) {
	env := newThrottleEnv(t)
	svc := env.svc
	ctx := context.Background()

	for i := 1; i <= loginFailThreshold; i++ {
		_, err := svc.Login(ctx, "ada@example.com", "wrongpass1", "203.0.113."+string(rune('0'+i)), "test")
		assert.ErrorIs(t, err, domain.ErrUnauthorized, "failure %d", i)
	}

	// The account is now locked — even with the CORRECT password.
	_, err := svc.Login(ctx, "ada@example.com", "correct1", "198.51.100.9", "test")
	require.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrTooManyRequests)
	assert.Contains(t, err.Error(), "too many failed attempts")
}

func TestLogin_OtherAccountsUnaffected(t *testing.T) {
	env := newThrottleEnv(t)
	svc, users := env.svc, env.store.Users
	ctx := context.Background()
	hashed, err := bcrypt.GenerateFromPassword([]byte("password1"), bcrypt.MinCost)
	require.NoError(t, err)
	b := &identity.User{Email: "bola@example.com", PasswordHash: string(hashed), Status: identity.UserStatusActive}
	require.NoError(t, users.Create(context.Background(), b))

	for i := 0; i < loginFailThreshold; i++ {
		_, _ = svc.Login(ctx, "ada@example.com", "nope1234", "203.0.113.5", "test")
	}
	// Bola logs in fine — the lock is per-account, not global.
	res, err := svc.Login(ctx, "bola@example.com", "password1", "203.0.113.6", "test")
	require.NoError(t, err)
	assert.NotEmpty(t, res.Token)
}

func TestLogin_SuccessClearsFailureStreak(t *testing.T) {
	env := newThrottleEnv(t)
	svc := env.svc
	ctx := context.Background()

	for i := 0; i < loginFailThreshold-1; i++ {
		_, _ = svc.Login(ctx, "ada@example.com", "nope1234", "10.0.0.1", "test")
	}
	// A successful login resets the streak.
	res, err := svc.Login(ctx, "ada@example.com", "correct1", "10.0.0.1", "test")
	require.NoError(t, err)
	assert.NotEmpty(t, res.Token)

	// The streak is back to zero — threshold-1 more failures do NOT lock.
	for i := 0; i < loginFailThreshold-1; i++ {
		_, _ = svc.Login(ctx, "ada@example.com", "nope1234", "10.0.0.2", "test")
	}
	_, err = svc.Login(ctx, "ada@example.com", "correct1", "10.0.0.3", "test")
	assert.NoError(t, err, "streak must have reset after the earlier success")
}

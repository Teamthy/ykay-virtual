package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMe_SlidingWindow — sessions extend back to the full TTL once 24h of
// idle time has been consumed (throttled; no write on fresh sessions).
func TestMe_SlidingWindow(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()

	user, err := env.svc.Register(ctx, RegisterInput{
		Email: "sliding@test.com", Password: "strong-pass-123", Roles: []string{"PARENT"},
	})
	require.NoError(t, err)
	activateUser(t, env, user.Email)

	now := env.svc.now().UTC()
	tokenHash := "session-hash-1"
	session := &identity.Session{
		ID: uuid.New(), UserID: user.ID, TokenHash: tokenHash,
		// 26 days of idle consumed → sliding must extend.
		ExpiresAt: now.Add(4 * 24 * time.Hour),
	}
	require.NoError(t, env.store.Sessions.Create(ctx, session))

	_, _, err = env.svc.Me(ctx, tokenHash)
	require.NoError(t, err)

	got, err := env.store.Sessions.FindByTokenHash(ctx, tokenHash)
	require.NoError(t, err)
	assert.Equal(t, now.Add(SessionTTL), got.ExpiresAt, "sliding window must extend the session")

	// Fresh session (just issued) must NOT be written on every request.
	tokenHash2 := "session-hash-2"
	fresh := &identity.Session{
		ID: uuid.New(), UserID: user.ID, TokenHash: tokenHash2,
		ExpiresAt: now.Add(SessionTTL - time.Minute),
	}
	require.NoError(t, env.store.Sessions.Create(ctx, fresh))
	_, _, err = env.svc.Me(ctx, tokenHash2)
	require.NoError(t, err)
	got2, err := env.store.Sessions.FindByTokenHash(ctx, tokenHash2)
	require.NoError(t, err)
	assert.Equal(t, fresh.ExpiresAt, got2.ExpiresAt, "fresh sessions must not be extended on every request")
}

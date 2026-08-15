package service

import (
	"context"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type authEnv struct {
	store *memory.MemoryStore
	svc   *AuthService
}

func newAuthEnv(t *testing.T) *authEnv {
	t.Helper()
	store := memory.NewMemoryStore()
	store.Roles.Seed() // mirrors migration 000001 role inserts
	svc := NewAuthService(store.Users, store.Sessions, store.Roles, NewAuditService(store.AuditLogs))
	svc.now = func() time.Time { return fixedTime }
	return &authEnv{store: store, svc: svc}
}

func TestRegister_Success_HashesPasswordAndAssignsRoles(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()

	user, err := env.svc.Register(ctx, RegisterInput{
		Email: "Parent@Example.com", Password: "strong-pass-123", Roles: []string{"PARENT", "STUDENT"},
	})
	require.NoError(t, err)
	assert.Equal(t, "parent@example.com", user.Email) // lowercased
	assert.Equal(t, identity.UserStatusPending, user.Status)
	assert.NotEqual(t, "strong-pass-123", user.PasswordHash)
	assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte("strong-pass-123")))

	roles, err := env.store.Roles.RolesForUser(ctx, user.ID)
	require.NoError(t, err)
	assert.Len(t, roles, 2)

	// Audit log written
	logs, _ := env.store.AuditLogs.ListByTarget(ctx, "user", user.ID, 5)
	assert.NotEmpty(t, logs)
}

func TestRegister_DuplicateEmail_Conflict(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "a@b.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)

	_, err = env.svc.Register(ctx, RegisterInput{Email: "a@b.com", Password: "password123", Roles: []string{"PARENT"}})
	assert.ErrorIs(t, err, domain.ErrAlreadyExists)
}

func TestRegister_Validation(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()

	_, err := env.svc.Register(ctx, RegisterInput{Email: "not-an-email", Password: "password123", Roles: []string{"PARENT"}})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	_, err = env.svc.Register(ctx, RegisterInput{Email: "a@b.com", Password: "short", Roles: []string{"PARENT"}})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	_, err = env.svc.Register(ctx, RegisterInput{Email: "a@b.com", Password: "password123"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestLogin_Success_ReturnsTokenAndRoles(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "tutor@example.com", Password: "password123", Roles: []string{"TUTOR"}})
	require.NoError(t, err)

	token, user, roles, err := env.svc.Login(ctx, "tutor@example.com", "password123", "127.0.0.1", "test-agent")
	require.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.Equal(t, "tutor@example.com", user.Email)
	assert.Contains(t, roles, "TUTOR")

	// Session persisted with hashed token (raw never stored)
	hash := HashToken(token)
	session, err := env.store.Sessions.FindByTokenHash(ctx, hash)
	require.NoError(t, err)
	assert.Equal(t, user.ID, session.UserID)
	assert.NotEqual(t, token, session.TokenHash)
	assert.WithinDuration(t, fixedTime.Add(SessionTTL), session.ExpiresAt, time.Minute)

	// Last login recorded
	u, _ := env.store.Users.FindByID(ctx, user.ID)
	require.NotNil(t, u.LastLoginAt)
}

func TestLogin_WrongPassword_Unauthorized(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "a@b.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)

	_, _, _, err = env.svc.Login(ctx, "a@b.com", "wrong-password", "", "")
	assert.ErrorIs(t, err, domain.ErrUnauthorized)
}

func TestLogin_UnknownEmail_Unauthorized(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	_, _, _, err := env.svc.Login(ctx, "nobody@example.com", "password123", "", "")
	assert.ErrorIs(t, err, domain.ErrUnauthorized)
}

func TestMe_ValidSession(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "parent@example.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)
	token, _, _, err := env.svc.Login(ctx, "parent@example.com", "password123", "", "")
	require.NoError(t, err)

	user, roles, err := env.svc.Me(ctx, HashToken(token))
	require.NoError(t, err)
	assert.Equal(t, "parent@example.com", user.Email)
	assert.Contains(t, roles, "PARENT")
}

func TestMe_RevokedOrExpired_Unauthorized(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "a@b.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)
	token, _, _, err := env.svc.Login(ctx, "a@b.com", "password123", "", "")
	require.NoError(t, err)

	// Revoke → unauthorized
	require.NoError(t, env.svc.Logout(ctx, HashToken(token)))
	_, _, err = env.svc.Me(ctx, HashToken(token))
	assert.ErrorIs(t, err, domain.ErrUnauthorized)

	// Expired → unauthorized
	token2, _, _, err := env.svc.Login(ctx, "a@b.com", "password123", "", "")
	require.NoError(t, err)
	env.svc.now = func() time.Time { return fixedTime.Add(31 * 24 * time.Hour) }
	_, _, err = env.svc.Me(ctx, HashToken(token2))
	assert.ErrorIs(t, err, domain.ErrUnauthorized)
}

func TestLogout_Idempotent(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "a@b.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)
	token, _, _, err := env.svc.Login(ctx, "a@b.com", "password123", "", "")
	require.NoError(t, err)

	require.NoError(t, env.svc.Logout(ctx, HashToken(token)))
	require.NoError(t, env.svc.Logout(ctx, HashToken(token)))  // second call fine
	require.NoError(t, env.svc.Logout(ctx, "no-such-session")) // unknown token fine
}

func TestRotateAllSessions_PrivilegeChange(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "a@b.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)
	token, user, _, err := env.svc.Login(ctx, "a@b.com", "password123", "", "")
	require.NoError(t, err)

	require.NoError(t, env.svc.RotateAllSessions(ctx, user.ID))
	_, _, err = env.svc.Me(ctx, HashToken(token))
	assert.ErrorIs(t, err, domain.ErrUnauthorized)

	// Re-login works after rotation
	token2, _, _, err := env.svc.Login(ctx, "a@b.com", "password123", "", "")
	require.NoError(t, err)
	assert.NotEmpty(t, token2)
	_ = uuid.New()
}

func TestRegister_RejectsPrivilegedRole(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: "attacker@example.com", Password: "password123", Roles: []string{"SUPER_ADMIN"}})
	assert.ErrorIs(t, err, domain.ErrForbidden)
	// No user may be created for a rejected registration.
	_, err = env.store.Users.FindByEmail(ctx, "attacker@example.com")
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestRegister_RejectsAllPrivilegedRoles(t *testing.T) {
	for _, role := range []string{"SUPER_ADMIN", "ACADEMIC_ADMIN", "INSTITUTION_ADMIN"} {
		env := newAuthEnv(t)
		ctx := context.Background()
		_, err := env.svc.Register(ctx, RegisterInput{Email: "u@example.com", Password: "password123", Roles: []string{role}})
		assert.ErrorIs(t, err, domain.ErrForbidden, "role  must not be self-assignable", role)
	}
}

func TestRegister_AllowsSelfAssignableRoles(t *testing.T) {
	for _, role := range []string{"STUDENT", "PARENT", "TUTOR"} {
		env := newAuthEnv(t)
		ctx := context.Background()
		u, err := env.svc.Register(ctx, RegisterInput{Email: "u@example.com", Password: "password123", Roles: []string{role}})
		require.NoError(t, err, "role  should be self-assignable", role)
		roles, _ := env.store.Roles.RolesForUser(ctx, u.ID)
		names := []string{}
		for _, r := range roles {
			names = append(names, r.Name)
		}
		assert.Contains(t, names, role)
	}
}

func TestSetPrimaryRole_RejectsPrivilegedRole(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	u, err := env.svc.Register(ctx, RegisterInput{Email: "u@example.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)
	_, err = env.svc.SetPrimaryRole(ctx, u.ID, "SUPER_ADMIN")
	assert.ErrorIs(t, err, domain.ErrForbidden)
	// The original role grant must be unchanged.
	roles, _ := env.store.Roles.RolesForUser(ctx, u.ID)
	for _, r := range roles {
		assert.NotEqual(t, "SUPER_ADMIN", r.Name)
	}
}

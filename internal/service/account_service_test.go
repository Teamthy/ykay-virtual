package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/repository/memory"
)

func TestAccountService_ProfileExportDelete(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	svc := NewAccountService(env.store.Users, env.store.Roles, env.store.Sessions,
		memory.NewDeviceMemory(), env.store.Students, env.store.StudentLinks,
		memory.NewChatMemory(), NewAuditService(env.store.AuditLogs))

	user, err := env.svc.Register(ctx, RegisterInput{Email: "acct@example.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)
	activateUser(t, env, "acct@example.com")

	// Update profile.
	updated, err := svc.UpdateProfile(ctx, user.ID, UpdateProfileInput{
		FirstName: "Ada", LastName: "Bello", Phone: "+2348000000000", Timezone: "Africa/Lagos",
	})
	require.NoError(t, err)
	assert.Equal(t, "Ada", updated.FirstName)
	assert.Equal(t, "+2348000000000", *updated.Phone)

	// Clear phone by passing empty string.
	cleared, err := svc.UpdateProfile(ctx, user.ID, UpdateProfileInput{Phone: ""})
	require.NoError(t, err)
	assert.Nil(t, cleared.Phone)

	// Export includes profile + roles.
	exp, err := svc.ExportData(ctx, user.ID)
	require.NoError(t, err)
	assert.Equal(t, "acct@example.com", exp.User.Email)
	assert.Contains(t, exp.Roles, "PARENT")

	// Delete: status DELETED + sessions revoked + cannot log in.
	_, err = env.svc.Login(ctx, "acct@example.com", "password123", "1.2.3.4", "test")
	require.NoError(t, err)
	require.NoError(t, svc.DeleteAccount(ctx, user.ID))

	got, err := env.store.Users.FindByID(ctx, user.ID)
	require.NoError(t, err)
	assert.Equal(t, identity.UserStatusDeleted, got.Status)

	_, err = env.svc.Login(ctx, "acct@example.com", "password123", "1.2.3.4", "test")
	require.Error(t, err, "deleted account must not be able to log in")
}

package service

import (
	"context"
	"regexp"
	"strings"
	"testing"

	"ykay-virtual/internal/domain"

	"github.com/stretchr/testify/require"
)

// mfaCodeFromBody pulls the 6-digit verification code out of the emailed body.
// The code is wrapped in a monospace span, so we anchor on that to avoid
// matching coincidental 6-digit runs elsewhere in the email template.
func mfaCodeFromBody(body string) string {
	const marker = `monospace;">`
	i := strings.Index(body, marker)
	if i < 0 {
		return ""
	}
	region := body[i+len(marker):]
	m := regexp.MustCompile(`\d{6}`).FindStringSubmatch(region)
	if len(m) == 0 {
		return ""
	}
	return m[0]
}

// grantRole registers the user (self-assignment of admin roles is forbidden)
// and then grants the platform-admin role through the store.
func grantRole(t *testing.T, env *authEnv, email, password, role string) {
	t.Helper()
	ctx := context.Background()
	_, err := env.svc.Register(ctx, RegisterInput{Email: email, Password: password, Roles: []string{"PARENT"}})
	require.NoError(t, err)
	user, err := env.store.Users.FindByEmail(ctx, email)
	require.NoError(t, err)
	adminRole, err := env.store.Roles.FindByName(ctx, role)
	require.NoError(t, err)
	require.NoError(t, env.store.Roles.AssignToUser(ctx, user.ID, adminRole.ID))
}

// TestAdminLogin_RequiresMFA — ACADEMIC_ADMIN must confirm a second factor
// (emailed code) before a session is issued; regular users do not.
func TestAdminLogin_RequiresMFA(t *testing.T) {
	env, mail := newAuthEnvWithTokens(t)
	ctx := context.Background()
	grantRole(t, env, "admin@example.com", "password123", "ACADEMIC_ADMIN")

	// Admin login: password correct, but NO session yet - MFA required.
	res, err := env.svc.Login(ctx, "admin@example.com", "password123", "1.2.3.4", "test-agent")
	require.NoError(t, err)
	require.True(t, res.MFARequired)
	require.Empty(t, res.Token, "no session token before the second factor")
	require.Len(t, mail.sent, 1)

	code := mfaCodeFromBody(mail.sent[len(mail.sent)-1].body)
	require.Len(t, code, 6, "an emailed 6-digit MFA code must be sent")

	// A wrong code is rejected and does not mint a session.
	_, err = env.svc.ConfirmMFA(ctx, "admin@example.com", "000000", "1.2.3.4", "test-agent")
	require.ErrorIs(t, err, domain.ErrUnauthorized)

	// The correct code issues the session.
	res2, err := env.svc.ConfirmMFA(ctx, "admin@example.com", code, "1.2.3.4", "test-agent")
	require.NoError(t, err)
	require.False(t, res2.MFARequired)
	require.NotEmpty(t, res2.Token)

	// The session is live and the code is single-use (cannot be replayed).
	_, _, err = env.svc.Me(ctx, HashToken(res2.Token))
	require.NoError(t, err)
	_, err = env.svc.ConfirmMFA(ctx, "admin@example.com", code, "1.2.3.4", "test-agent")
	require.Error(t, err, "an MFA code must be single-use")
}

// TestNonAdminLogin_NoMFA — a non-admin login issues a session immediately.
func TestNonAdminLogin_NoMFA(t *testing.T) {
	env, mail := newAuthEnvWithTokens(t)
	ctx := context.Background()

	_, err := env.svc.Register(ctx, RegisterInput{Email: "parent@example.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)

	res, err := env.svc.Login(ctx, "parent@example.com", "password123", "", "test-agent")
	require.NoError(t, err)
	require.False(t, res.MFARequired)
	require.NotEmpty(t, res.Token)
	require.Len(t, mail.sent, 0, "no MFA email for non-admins")
}

// TestMFA_NotGrantedIfRoleRemoved — defense in depth: if admin role is gone by
// confirm time, no session is minted.
func TestMFA_NotGrantedIfRoleRemoved(t *testing.T) {
	env, mail := newAuthEnvWithTokens(t)
	ctx := context.Background()
	grantRole(t, env, "adm2@example.com", "password123", "ACADEMIC_ADMIN")

	res, err := env.svc.Login(ctx, "adm2@example.com", "password123", "", "t")
	require.NoError(t, err)
	require.True(t, res.MFARequired)
	code := mfaCodeFromBody(mail.sent[len(mail.sent)-1].body)

	// Remove the admin role before confirming.
	user, _ := env.store.Users.FindByEmail(ctx, "adm2@example.com")
	require.NoError(t, env.store.Roles.RemoveRoleForUser(ctx, user.ID, "ACADEMIC_ADMIN"))

	_, err = env.svc.ConfirmMFA(ctx, "adm2@example.com", code, "", "t")
	require.ErrorIs(t, err, domain.ErrForbidden)
}

// TestSuperAdmin_NoMFA — SUPER_ADMIN is exempt from MFA (product decision):
// it logs in with a session immediately, like a non-admin.
func TestSuperAdmin_NoMFA(t *testing.T) {
	env, mail := newAuthEnvWithTokens(t)
	ctx := context.Background()
	grantRole(t, env, "root@example.com", "password123", "SUPER_ADMIN")

	res, err := env.svc.Login(ctx, "root@example.com", "password123", "", "t")
	require.NoError(t, err)
	require.False(t, res.MFARequired)
	require.NotEmpty(t, res.Token)
	require.Len(t, mail.sent, 0, "no MFA email for SUPER_ADMIN")
}

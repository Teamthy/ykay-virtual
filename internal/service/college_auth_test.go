package service

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
)

// fakeCollegePortal stands in for the EDU Portal's
// POST /api/auth/verify-session endpoint.
type fakeCollegePortal struct {
	status    int
	body      any
	gotSecret string
	gotToken  string
	calls     int
}

func (f *fakeCollegePortal) handler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		f.calls++
		f.gotSecret = r.Header.Get("X-College-SSO-Secret")
		var req struct {
			Token string `json:"token"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		f.gotToken = req.Token
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(f.status)
		_ = json.NewEncoder(w).Encode(f.body)
	}
}

func newCollegeSvc(t *testing.T, portal *fakeCollegePortal) *CollegeAuthService {
	t.Helper()
	env := newAuthEnv(t)
	srv := httptest.NewServer(portal.handler())
	t.Cleanup(srv.Close)
	svc := NewCollegeAuthService(CollegeSSOConfig{
		BaseURL: srv.URL,
		Secret:  "college-sso-secret-that-is-long-enough",
	}, env.svc)
	return svc
}

func validCollegeBody(email, role, name string) map[string]any {
	return map[string]any{
		"valid": true,
		"user": map[string]any{
			"id":           "college-user-1",
			"schoolId":     "school-ykay",
			"role":         role,
			"name":         name,
			"email":        email,
			"tokenVersion": 3,
		},
	}
}

// The happy path: a valid College session mints a real, usable YK Virtual
// session through the same startSession path as password login.
func TestCollegeAuth_ExchangeSession_ProvisionsAndStartsSession(t *testing.T) {
	env := newAuthEnv(t)
	portal := &fakeCollegePortal{
		status: http.StatusOK,
		body:   validCollegeBody("Parent@YkayCollege.com", "PARENT", "Ada Obi"),
	}
	srv := httptest.NewServer(portal.handler())
	t.Cleanup(srv.Close)
	svc := NewCollegeAuthService(CollegeSSOConfig{
		BaseURL: srv.URL,
		Secret:  "college-sso-secret-that-is-long-enough",
	}, env.svc)

	token, user, roles, err := svc.ExchangeSession(context.Background(), "college-jwt", "1.2.3.4", "test-agent")
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// The shared secret must actually be sent, or the portal would reject us.
	assert.Equal(t, "college-sso-secret-that-is-long-enough", portal.gotSecret)
	assert.Equal(t, "college-jwt", portal.gotToken)
	assert.Equal(t, 1, portal.calls)

	// Email is lower-cased — it is the join key between the two systems.
	assert.Equal(t, "parent@ykaycollege.com", user.Email)
	assert.Equal(t, "Ada", user.FirstName)
	assert.Equal(t, "Obi", user.LastName)
	assert.Equal(t, identity.UserStatusActive, user.Status)
	assert.NotNil(t, user.EmailVerifiedAt, "College has already verified this email")
	assert.NotNil(t, user.OnboardedAt, "College users skip the Virtual onboarding wizard")
	assert.Contains(t, roles, "PARENT")

	// The session must be live and resolvable, not just a returned string.
	me, meRoles, err := env.svc.Me(context.Background(), HashToken(token))
	require.NoError(t, err)
	assert.Equal(t, "parent@ykaycollege.com", me.Email)
	assert.NotEmpty(t, meRoles)
}

// A second login for the same College account must reuse the existing local
// user rather than attempting a second insert.
func TestCollegeAuth_ExchangeSession_IsIdempotentByEmail(t *testing.T) {
	env := newAuthEnv(t)
	portal := &fakeCollegePortal{
		status: http.StatusOK,
		body:   validCollegeBody("student@ykaycollege.com", "STUDENT", "Tunde Bakare"),
	}
	srv := httptest.NewServer(portal.handler())
	t.Cleanup(srv.Close)
	svc := NewCollegeAuthService(CollegeSSOConfig{BaseURL: srv.URL, Secret: "college-sso-secret-that-is-long-enough"}, env.svc)

	_, first, _, err := svc.ExchangeSession(context.Background(), "jwt-1", "1.2.3.4", "ua")
	require.NoError(t, err)
	_, second, _, err := svc.ExchangeSession(context.Background(), "jwt-2", "1.2.3.4", "ua")
	require.NoError(t, err)

	assert.Equal(t, first.ID, second.ID, "same College email must map to one local user")
	assert.Equal(t, 2, portal.calls)
}

// Every non-2xx from the portal must become an auth error, and a locally
// suspended account must stay suspended even with a valid College session.
func TestCollegeAuth_ExchangeSession_RejectsFailures(t *testing.T) {
	cases := []struct {
		name    string
		status  int
		body    any
		wantErr error
	}{
		{"portal says token invalid", http.StatusUnauthorized,
			map[string]any{"valid": false, "reason": "INVALID_TOKEN"}, domain.ErrUnauthorized},
		{"portal says session revoked", http.StatusUnauthorized,
			map[string]any{"valid": false, "reason": "SESSION_REVOKED"}, domain.ErrUnauthorized},
		{"portal says account suspended", http.StatusForbidden,
			map[string]any{"valid": false, "reason": "USER_SUSPENDED"}, domain.ErrForbidden},
		{"portal says impersonation not federable", http.StatusForbidden,
			map[string]any{"valid": false, "reason": "IMPERSONATION_NOT_FEDERABLE"}, domain.ErrForbidden},
		{"portal database unreachable", http.StatusServiceUnavailable,
			map[string]any{"valid": false, "reason": "IDENTITY_UNVERIFIABLE"}, domain.ErrConflict},
		{"portal rate limited us", http.StatusTooManyRequests,
			map[string]any{"error": "Too many requests."}, domain.ErrConflict},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc := newCollegeSvc(t, &fakeCollegePortal{status: tc.status, body: tc.body})
			token, user, roles, err := svc.ExchangeSession(context.Background(), "college-jwt", "1.2.3.4", "ua")
			assert.ErrorIs(t, err, tc.wantErr)
			assert.Empty(t, token)
			assert.Nil(t, user)
			assert.Nil(t, roles)
		})
	}
}

// A 200 that does not actually say valid:true must not be trusted — a proxy or
// misconfigured portal returning an empty 200 must not mint a session.
func TestCollegeAuth_ExchangeSession_Rejects200WithoutValidFlag(t *testing.T) {
	svc := newCollegeSvc(t, &fakeCollegePortal{
		status: http.StatusOK,
		body:   map[string]any{"valid": false},
	})
	_, _, _, err := svc.ExchangeSession(context.Background(), "college-jwt", "1.2.3.4", "ua")
	assert.ErrorIs(t, err, domain.ErrUnauthorized)
}

// An unconfigured service must fail closed rather than calling out anywhere.
func TestCollegeAuth_ExchangeSession_UnconfiguredFailsClosed(t *testing.T) {
	env := newAuthEnv(t)
	svc := NewCollegeAuthService(CollegeSSOConfig{}, env.svc)
	assert.False(t, svc.Enabled())

	_, _, _, err := svc.ExchangeSession(context.Background(), "college-jwt", "1.2.3.4", "ua")
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestCollegeAuth_ExchangeSession_EmptyTokenRejected(t *testing.T) {
	svc := newCollegeSvc(t, &fakeCollegePortal{
		status: http.StatusOK,
		body:   validCollegeBody("a@b.com", "PARENT", "A B"),
	})
	_, _, _, err := svc.ExchangeSession(context.Background(), "   ", "1.2.3.4", "ua")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

// A locally suspended account must NOT be revived by a valid College session:
// a YK Virtual admin's suspension is independent of the College portal.
func TestCollegeAuth_ExchangeSession_LocalSuspensionIsRespected(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()

	// Pre-create a locally suspended user with the same email.
	_, err := env.svc.Register(ctx, RegisterInput{
		Email: "suspended@ykaycollege.com", Password: "password123", Roles: []string{"PARENT"},
	})
	require.NoError(t, err)
	existing, err := env.store.Users.FindByEmail(ctx, "suspended@ykaycollege.com")
	require.NoError(t, err)
	existing.Status = identity.UserStatusSuspended
	require.NoError(t, env.store.Users.Update(ctx, existing))

	// Wire the portal to THIS env's auth service — newCollegeSvc would build a
	// fresh, separate store and the suspended user below would not be in it.
	portal := &fakeCollegePortal{
		status: http.StatusOK,
		body:   validCollegeBody("suspended@ykaycollege.com", "PARENT", "Suspended Person"),
	}
	srv := httptest.NewServer(portal.handler())
	t.Cleanup(srv.Close)
	svc := NewCollegeAuthService(CollegeSSOConfig{
		BaseURL: srv.URL,
		Secret:  "college-sso-secret-that-is-long-enough",
	}, env.svc)

	_, _, _, err = svc.ExchangeSession(ctx, "college-jwt", "1.2.3.4", "ua")
	assert.ErrorIs(t, err, domain.ErrForbidden, "a locally suspended account must stay locked out")
	assert.Equal(t, 1, portal.calls, "the portal was consulted; the refusal is the local check")
}

// Least privilege: a College staff/admin role must not confer any YK Virtual
// administrative role automatically.
func TestMapCollegeRole_IsLeastPrivilege(t *testing.T) {
	cases := map[string]struct {
		wantRole   string
		wantReview bool
	}{
		"STUDENT":       {"STUDENT", false},
		"IT_STUDENT":    {"STUDENT", false},
		"PARENT":        {"PARENT", false},
		"TEACHER":       {"TUTOR", true},
		"HOD":           {"TUTOR", true},
		"ADMIN":         {"STUDENT", true},
		"DIRECTOR":      {"STUDENT", true},
		"COORDINATOR":   {"STUDENT", true},
		"BURSAR":        {"STUDENT", true},
		"SUPER_ADMIN":   {"STUDENT", true},
		"":              {"STUDENT", false},
		"something-new": {"STUDENT", false},
	}
	for collegeRole, want := range cases {
		t.Run("role="+collegeRole, func(t *testing.T) {
			gotRole, gotReview := MapCollegeRole(collegeRole)
			assert.Equal(t, want.wantRole, gotRole)
			assert.Equal(t, want.wantReview, gotReview)
			assert.NotContains(t, []string{"ACADEMIC_ADMIN", "SUPER_ADMIN", "INSTITUTION_ADMIN"}, gotRole,
				"federated login must never auto-grant a platform-admin role")
		})
	}
}

func TestSplitName(t *testing.T) {
	cases := []struct{ in, first, last string }{
		{"Ada Obi", "Ada", "Obi"},
		{"Olufemi Oluwaseun Adeyemi", "Olufemi", "Oluwaseun Adeyemi"},
		{"Chidinma", "Chidinma", ""},
		{"  ", "", ""},
		{"", "", ""},
	}
	for _, c := range cases {
		first, last := splitName(c.in)
		assert.Equal(t, c.first, first, "first for %q", c.in)
		assert.Equal(t, c.last, last, "last for %q", c.in)
	}
}

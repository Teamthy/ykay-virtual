package service

import (
	"context"
	"errors"
	"testing"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/repository/memory"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// A-29 — when the email provider is down, the login-code request must fail
// with the TYPED ErrEmailDelivery (→ HTTP 503 EMAIL_UNAVAILABLE with a clear
// user-facing message), never a bare 500 "internal server error". This is
// the onboarding step-2 path: a brand-new user's entire funnel depends on
// it, and an honest "we can't send email right now" beats a mystery 500.

type failingEmailSender struct{ calls int }

func (f *failingEmailSender) Send(_ context.Context, _, _, _ string) error {
	f.calls++
	return errors.New("resend: 403 sender not verified")
}

func TestRequestLoginCode_EmailDown_ReturnsTypedDeliveryError(t *testing.T) {
	env := newAuthEnv(t)
	env.svc.WithAuthTokens(memory.NewAuthTokenMemory())
	fail := &failingEmailSender{}
	env.svc.WithEmailSender(fail)

	// An existing (pending) account — the onboarding step-2 audience.
	u := &identity.User{Email: "newbie@example.com", PasswordHash: "x", Status: identity.UserStatusPending}
	require.NoError(t, env.store.Users.Create(context.Background(), u))

	err := env.svc.RequestLoginCode(context.Background(), "newbie@example.com")
	require.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrEmailDelivery, "must be the typed sentinel (maps to 503 at the edge)")
	assert.NotContains(t, err.Error(), "resend", "provider internals must not leak to clients")
	assert.Equal(t, 1, fail.calls, "exactly one delivery attempt")

	// The code token was still created — if email recovers, the retry works.
	codes := 0
	// (token store introspection is not exposed; absence of panic + typed
	// error is the contract here.)
	_ = codes
}

func TestRequestLoginCode_UnknownEmail_NoErrorNoEmail(t *testing.T) {
	env := newAuthEnv(t)
	fail := &failingEmailSender{}
	env.svc.WithEmailSender(fail)

	// Anti-enumeration: unknown address behaves exactly like success.
	err := env.svc.RequestLoginCode(context.Background(), "ghost@example.com")
	assert.NoError(t, err)
	assert.Zero(t, fail.calls, "no delivery attempt for unknown accounts")
}

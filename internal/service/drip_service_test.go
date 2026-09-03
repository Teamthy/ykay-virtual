package service

import (
	"context"
	"sync"
	"testing"
	"time"

	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Onboarding email drip (000062): one email per step, at most once per user
// (storage-enforced), verified+active+non-tutor audience only, and the
// conversion nudges (steps 2–3) skip anyone who already paid.

type dripEmailLog struct {
	mu    sync.Mutex
	sends []struct{ To, Subject string }
}

func (l *dripEmailLog) Send(_ context.Context, to, subject, _ string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.sends = append(l.sends, struct{ To, Subject string }{to, subject})
	return nil
}
func (l *dripEmailLog) count() int { l.mu.Lock(); defer l.mu.Unlock(); return len(l.sends) }

type dripEnv struct {
	svc    *DripService
	users  *memory.UserMemory
	roles  *memory.RoleMemory
	orders *memory.OrderMemory
	drips  *memory.EmailDripMemory
	mail   *dripEmailLog
}

func newDripEnv(t *testing.T) *dripEnv {
	t.Helper()
	store := memory.NewMemoryStore()
	mail := &dripEmailLog{}
	drips := memory.NewEmailDripMemory()
	svc := NewDripService(store.Users, store.Roles, store.Orders, drips, mail, "https://virtual.ykaycollege.com")
	return &dripEnv{svc: svc, users: store.Users, roles: store.Roles, orders: store.Orders, drips: drips, mail: mail}
}

func seedDripUser(t *testing.T, env *dripEnv, email string, age time.Duration) uuid.UUID {
	t.Helper()
	u := &identity.User{Email: email, FirstName: "Ada", Status: identity.UserStatusActive}
	require.NoError(t, env.users.Create(context.Background(), u))
	// memory Create stamps CreatedAt=now; backdate via the row directly.
	env.users.BackdateCreated(u.ID, time.Now().UTC().Add(-age))
	verified := time.Now().UTC()
	got, err := env.users.FindByID(context.Background(), u.ID)
	require.NoError(t, err)
	got.EmailVerifiedAt = &verified
	require.NoError(t, env.users.Update(context.Background(), got))
	return u.ID
}

func TestDrip_WelcomeStepSendsOnce(t *testing.T) {
	env := newDripEnv(t)
	ctx := context.Background()
	uid := seedDripUser(t, env, "ada@example.com", 2*time.Hour)

	n, err := env.svc.SendOnboardingStep(ctx, OnboardingDripSteps[0], 50)
	require.NoError(t, err)
	assert.Equal(t, 1, n)
	assert.Equal(t, 1, env.mail.count(), "welcome email sent")

	// Second sweep: storage says already-sent → no duplicate.
	n, err = env.svc.SendOnboardingStep(ctx, OnboardingDripSteps[0], 50)
	require.NoError(t, err)
	assert.Zero(t, n)
	assert.Equal(t, 1, env.mail.count())

	done, _ := env.drips.ExistsStep(ctx, uid, "onboarding", 1)
	assert.True(t, done)
}

func TestDrip_ConversionStepsSkipPayingUsers(t *testing.T) {
	env := newDripEnv(t)
	ctx := context.Background()
	uid := seedDripUser(t, env, "paid@example.com", 72*time.Hour) // inside step-2 window

	// A PAID order disqualifies step 2.
	require.NoError(t, env.orders.Create(ctx, &payment.Order{
		ParentUserID: uid, Status: payment.OrderPaid, TotalAmount: 1000, Currency: "NGN",
	}))

	n, err := env.svc.SendOnboardingStep(ctx, OnboardingDripSteps[1], 50)
	require.NoError(t, err)
	assert.Zero(t, n, "paid user is not nudged")
	assert.Zero(t, env.mail.count())

	// Same user without an order WOULD get it — covered by the next test.
	_ = seedDripUser(t, env, "unpaid@example.com", 72*time.Hour)
	n, err = env.svc.SendOnboardingStep(ctx, OnboardingDripSteps[1], 50)
	require.NoError(t, err)
	assert.Equal(t, 1, n)
	assert.Equal(t, 1, env.mail.count())
	assert.Equal(t, "unpaid@example.com", env.mail.sends[0].To)
}

func TestDrip_SkipsUnverifiedAndOutsideWindow(t *testing.T) {
	env := newDripEnv(t)
	ctx := context.Background()

	// Unverified account inside the window → skipped.
	uid := seedDripUser(t, env, "unverified@example.com", 2*time.Hour)
	u, _ := env.users.FindByID(ctx, uid)
	u.EmailVerifiedAt = nil
	require.NoError(t, env.users.Update(ctx, u))

	// Verified but far too old for step 1 → outside [from,to).
	seedDripUser(t, env, "ancient@example.com", 30*24*time.Hour)

	n, err := env.svc.SendOnboardingStep(ctx, OnboardingDripSteps[0], 50)
	require.NoError(t, err)
	assert.Zero(t, n)
	assert.Zero(t, env.mail.count())
}

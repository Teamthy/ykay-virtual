package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/leads"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newLeadEnv(t *testing.T) (*LeadService, *memory.MemoryStore) {
	t.Helper()
	store := memory.NewMemoryStore()
	svc := NewLeadService(store.Leads, nil, store.Users, NewAuditService(store.AuditLogs))
	return svc, store
}

func TestLeadCapture_ValidatesAndStores(t *testing.T) {
	svc, store := newLeadEnv(t)
	ctx := context.Background()

	l, err := svc.Capture(ctx, CaptureLeadInput{
		Name: "Adaeze Okonkwo", Email: "adaeze@example.com", Phone: "+2348012345678",
		Source: "/programmes/gcse-maths", Intent: leads.IntentCallbackRequest,
	})
	require.NoError(t, err)
	assert.Equal(t, leads.StatusNew, l.Status)
	assert.Equal(t, leads.IntentCallbackRequest, l.Intent)
	require.NotNil(t, l.Phone)
	assert.Equal(t, "+2348012345678", *l.Phone)

	got, err := store.Leads.GetByID(ctx, l.ID)
	require.NoError(t, err)
	assert.Equal(t, l.ID, got.ID)

	// Counts reflect NEW.
	counts, err := svc.Counts(ctx)
	require.NoError(t, err)
	assert.Equal(t, int64(1), counts[leads.StatusNew])
}

func TestLeadCapture_Validation(t *testing.T) {
	svc, _ := newLeadEnv(t)
	ctx := context.Background()

	_, err := svc.Capture(ctx, CaptureLeadInput{Phone: "123", Source: "x"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput, "name is required")

	_, err = svc.Capture(ctx, CaptureLeadInput{Name: "Ada", Source: "x"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput, "phone is required")

	_, err = svc.Capture(ctx, CaptureLeadInput{Name: "Ada", Phone: "123", Email: "not-an-email"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput, "email must parse")
}

func TestLeadCapture_DedupeWithinWindow(t *testing.T) {
	svc, store := newLeadEnv(t)
	ctx := context.Background()

	in := CaptureLeadInput{
		Name: "Bola", Email: "bola@example.com", Phone: "+2348000000001",
		Source: "/cohorts/abc", Intent: leads.IntentGeneralInterest,
	}
	first, err := svc.Capture(ctx, in)
	require.NoError(t, err)

	second, err := svc.Capture(ctx, in)
	require.NoError(t, err)
	assert.Equal(t, first.ID, second.ID, "repeat capture must reuse the open lead")

	// Old leads beyond the window are not matched.
	all, total, err := svc.List(ctx, "", 1, 50)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	require.Len(t, all, 1)

	// Simulate an old lead: shift its created_at backwards.
	store.Leads.Backdate(first.ID, time.Now().UTC().Add(-25*time.Hour))

	third, err := svc.Capture(ctx, in)
	require.NoError(t, err)
	assert.NotEqual(t, first.ID, third.ID, "stale lead must not dedupe a new capture")
}

func TestLeadEnrollmentFunnel_StartedThenConverted(t *testing.T) {
	svc, store := newLeadEnv(t)
	ctx := context.Background()

	// Seed a user like the booking flow resolves it.
	now := time.Now().UTC()
	u := &identity.User{
		ID: uuid.New(), Email: "parent@test.com", FirstName: "Tunde", LastName: "Ade",
		Phone: strPtr("+2348030000000"), Status: identity.UserStatusActive,
		EmailVerifiedAt: &now, CreatedAt: now,
	}
	require.NoError(t, store.Users.Create(ctx, u))

	cohortID := uuid.New()
	svc.CaptureEnrollmentStarted(ctx, u.ID, cohortID, "IGCSE Maths — Sept", "cohort-enrollment")

	all, total, err := svc.List(ctx, leads.StatusNew, 1, 20)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	require.Len(t, all, 1)
	assert.Equal(t, leads.StatusNew, all[0].Status)
	require.NotNil(t, all[0].Email)
	assert.Equal(t, u.Email, *all[0].Email)
	assert.Equal(t, cohortID, *all[0].CohortID)

	// Idempotent: booking replay must not create a second lead.
	svc.CaptureEnrollmentStarted(ctx, u.ID, cohortID, "IGCSE Maths — Sept", "cohort-enrollment")
	_, total, err = svc.List(ctx, leads.StatusNew, 1, 20)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)

	// Payment settles → CONVERTED.
	svc.MarkConvertedForCohort(ctx, u.ID, cohortID)
	all, _, err = svc.List(ctx, "", 1, 20)
	require.NoError(t, err)
	require.Len(t, all, 1)
	assert.Equal(t, leads.StatusConverted, all[0].Status)
	assert.NotNil(t, all[0].ConvertedAt)
}

func TestLeadUpdateStatus_AdminLifecycle(t *testing.T) {
	svc, _ := newLeadEnv(t)
	ctx := context.Background()
	admin := uuid.New()

	l, err := svc.Capture(ctx, CaptureLeadInput{Name: "Kemi", Phone: "+2348120000000", Source: "/contact"})
	require.NoError(t, err)

	updated, err := svc.UpdateStatus(ctx, admin, l.ID, leads.StatusContacted)
	require.NoError(t, err)
	assert.Equal(t, leads.StatusContacted, updated.Status)
	assert.NotNil(t, updated.ContactedAt)

	updated, err = svc.UpdateStatus(ctx, admin, l.ID, leads.StatusConverted)
	require.NoError(t, err)
	assert.Equal(t, leads.StatusConverted, updated.Status)
	assert.NotNil(t, updated.ConvertedAt)

	_, err = svc.UpdateStatus(ctx, admin, l.ID, "NONSENSE")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestLeadList_FilterAndPagination(t *testing.T) {
	svc, _ := newLeadEnv(t)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		_, err := svc.Capture(ctx, CaptureLeadInput{
			Name: "Lead", Phone: "+234810000000" + string(rune('0'+i)), Source: "/cohorts/x-" + string(rune('a'+i)),
		})
		require.NoError(t, err)
	}

	list, total, err := svc.List(ctx, leads.StatusNew, 1, 2)
	require.NoError(t, err)
	assert.Equal(t, int64(3), total)
	assert.Len(t, list, 2)

	_, err = svc.UpdateStatus(ctx, uuid.New(), list[0].ID, leads.StatusClosed)
	require.NoError(t, err)

	list, total, err = svc.List(ctx, leads.StatusNew, 1, 10)
	require.NoError(t, err)
	assert.Equal(t, int64(2), total)
	require.Len(t, list, 2)
}

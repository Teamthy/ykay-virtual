package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/leads"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestOperationsOverview — the admin home aggregates stats, the conversion
// funnel, money in flight and the attention queues in one response.
func TestOperationsOverview(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	now := time.Now().UTC()

	svc := NewAdminService(
		memory.NewStatsMemory(), memory.NewAdminBlogMemory(),
		memory.NewInstitutionMemory(), memory.NewReferralMemory(), memory.NewReviewMemory(),
		NewAuditService(store.AuditLogs),
	).WithPayments(store.Orders, store.Payouts).
		WithCohortAdmin(store.Cohorts.WithProgrammes(store.Programmes), store.Lessons).
		WithVetting(store.Vetting).
		WithSupport(memory.NewSupportMemory()).
		WithAuditLogs(store.AuditLogs).
		WithLeads(store.Leads)

	// One new lead.
	err := store.Leads.Create(ctx, &leads.Lead{
		ID: uuid.New(), Name: "Ada", Phone: strPtr("+2348012345678"),
		Source: "/cohorts/x", Intent: leads.IntentCallbackRequest, Status: leads.StatusNew,
		CreatedAt: now, UpdatedAt: now,
	})
	require.NoError(t, err)

	// One pending payout.
	require.NoError(t, store.Payouts.Create(ctx, &payment.Payout{
		ID: uuid.New(), TutorProfileID: uuid.New(), EscrowHoldID: uuid.New(),
		Amount: 31500, Currency: "NGN", Status: payment.PayoutPending,
	}))

	// One submitted tutor.
	store.Vetting.SeedProfile(&tutor.TutorProfile{
		ID: uuid.New(), UserID: uuid.New(), Slug: "pending-tutor", DisplayName: "Pending Tutor",
		Status: tutor.TutorStatusSubmitted,
	})

	// One audit row.
	actor := uuid.New()
	require.NoError(t, store.AuditLogs.Create(ctx, &identity.AuditLog{
		ID: uuid.New(), ActorUserID: &actor, Action: identity.AuditUpdate,
		TargetType: "cohort", CreatedAt: now,
	}))

	out, err := svc.OperationsOverview(ctx)
	require.NoError(t, err)
	assert.Equal(t, int64(1), out.LeadsNew)
	assert.Equal(t, int64(1), out.LeadsTotal)
	assert.Equal(t, 31500.0, out.PayoutsPendingTotal)
	assert.Equal(t, int64(1), out.VettingSubmitted)
	require.Len(t, out.RecentAudit, 1)
	assert.NotNil(t, out.Stats)
}

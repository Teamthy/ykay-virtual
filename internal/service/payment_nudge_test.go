package service

import (
	"context"
	"sync"
	"testing"
	"time"

	"ykay-virtual/internal/domain/leads"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Payment-abandon WhatsApp nudge — one message per stalled checkout, then
// the lead flips to CONTACTED so it is never nudged twice.

type capturingWhatsApp struct {
	mu    sync.Mutex
	sends []struct{ To, Body string }
}

func (c *capturingWhatsApp) Send(_ context.Context, to, body string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.sends = append(c.sends, struct{ To, Body string }{to, body})
	return nil
}

func nudgeEnv(t *testing.T) (*LeadService, *memory.LeadMemory, *capturingWhatsApp) {
	t.Helper()
	repo := memory.NewLeadMemory()
	wa := &capturingWhatsApp{}
	// nil queue ⇒ direct dispatch through the capturing sender.
	notifier := NewNotifierService(nil, wa)
	svc := NewLeadService(repo, notifier, nil, nil)
	return svc, repo, wa
}

func seedLead(t *testing.T, repo *memory.LeadMemory, phone string, age time.Duration, cohortID *uuid.UUID) *leads.Lead {
	t.Helper()
	userID := uuid.New()
	l := &leads.Lead{
		Name:     "Ada Obi",
		Phone:    &phone,
		Source:   "cohort-enrollment",
		Intent:   leads.IntentEnrollmentStarted,
		CohortID: cohortID,
		UserID:   &userID,
		Status:   leads.StatusNew,
	}
	require.NoError(t, repo.Create(context.Background(), l))
	// Backdate so the sweep sees it as aged into the nudge window.
	repo.Backdate(l.ID, time.Now().UTC().Add(-age))
	return l
}

func TestPaymentNudge_SendsOnceAndMarksContacted(t *testing.T) {
	svc, repo, wa := nudgeEnv(t)
	ctx := context.Background()
	cohortID := uuid.New()
	l := seedLead(t, repo, "2348012345678", 90*time.Minute, &cohortID)

	n, err := svc.SendPaymentNudges(ctx, "https://nuvora.com", 45*time.Minute, 24*time.Hour, 100)
	require.NoError(t, err)
	assert.Equal(t, 1, n)

	require.Len(t, wa.sends, 1)
	assert.Equal(t, "2348012345678", wa.sends[0].To)
	assert.Contains(t, wa.sends[0].Body, "https://nuvora.com/checkout/"+cohortID.String())
	assert.Contains(t, wa.sends[0].Body, "Ada")

	got, err := repo.GetByID(ctx, l.ID)
	require.NoError(t, err)
	assert.Equal(t, leads.StatusContacted, got.Status)

	// Second sweep: nothing left to nudge.
	n, err = svc.SendPaymentNudges(ctx, "https://nuvora.com", 45*time.Minute, 24*time.Hour, 100)
	require.NoError(t, err)
	assert.Equal(t, 0, n)
	assert.Len(t, wa.sends, 1)
}

func TestPaymentNudge_RespectsAgeWindow(t *testing.T) {
	svc, repo, wa := nudgeEnv(t)
	ctx := context.Background()
	cohortID := uuid.New()

	seedLead(t, repo, "2348000000001", 10*time.Minute, &cohortID) // too fresh
	seedLead(t, repo, "2348000000002", 48*time.Hour, &cohortID)   // too cold

	n, err := svc.SendPaymentNudges(ctx, "https://nuvora.com", 45*time.Minute, 24*time.Hour, 100)
	require.NoError(t, err)
	assert.Equal(t, 0, n)
	assert.Empty(t, wa.sends)
}

func TestPaymentNudge_SkipsUnreachableLeads(t *testing.T) {
	svc, repo, wa := nudgeEnv(t)
	ctx := context.Background()

	// No phone AND no user id → unreachable, stays NEW for manual follow-up.
	l := &leads.Lead{
		Name: "No Contact", Source: "cohort-enrollment",
		Intent: leads.IntentEnrollmentStarted, Status: leads.StatusNew,
	}
	require.NoError(t, repo.Create(ctx, l))
	repo.Backdate(l.ID, time.Now().UTC().Add(-2*time.Hour))

	n, err := svc.SendPaymentNudges(ctx, "https://nuvora.com", 45*time.Minute, 24*time.Hour, 100)
	require.NoError(t, err)
	assert.Equal(t, 0, n)
	assert.Empty(t, wa.sends)

	got, _ := repo.GetByID(ctx, l.ID)
	assert.Equal(t, leads.StatusNew, got.Status)
}

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

// Payment-abandon nudge — email fallback. WhatsApp stays the primary channel
// (best open rates in our market); email catches the leads WhatsApp cannot
// reach (no phone, no user record — or a WhatsApp send failure). Exactly one
// nudge is ever delivered per lead.

type capturingEmail struct {
	mu    sync.Mutex
	sends []struct{ To, Subject, Body string }
	fail  bool
}

func (c *capturingEmail) Send(_ context.Context, to, subject, body string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.fail {
		return errEmailDown
	}
	c.sends = append(c.sends, struct{ To, Subject, Body string }{to, subject, body})
	return nil
}

func (c *capturingEmail) count() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.sends)
}

var errEmailDown = &fakeNetError{}

type fakeNetError struct{}

func (*fakeNetError) Error() string { return "smtp: connection refused" }

func seedEmailLead(t *testing.T, repo *memory.LeadMemory, name, email, phone string, withUser bool, age time.Duration) *leads.Lead {
	t.Helper()
	l := &leads.Lead{
		Name:   name,
		Source: "cohort-enrollment",
		Intent: leads.IntentEnrollmentStarted,
		Status: leads.StatusNew,
	}
	if email != "" {
		l.Email = &email
	}
	if phone != "" {
		l.Phone = &phone
	}
	if withUser {
		u := uuid.New()
		l.UserID = &u
	}
	require.NoError(t, repo.Create(context.Background(), l))
	repo.Backdate(l.ID, time.Now().UTC().Add(-age))
	return l
}

func TestPaymentNudge_EmailFallbackWhenWhatsAppUnreachable(t *testing.T) {
	repo := memory.NewLeadMemory()
	wa := &capturingWhatsApp{}
	mail := &capturingEmail{}
	svc := NewLeadService(repo, NewNotifierService(nil, wa), nil, nil).WithEmail(mail)

	l := seedEmailLead(t, repo, "Bola Ade", "bola@example.com", "", false, time.Hour)
	sent, err := svc.SendPaymentNudges(context.Background(), "https://virtual.ykaycollege.com", 45*time.Minute, 24*time.Hour, 50)
	require.NoError(t, err)
	assert.Equal(t, 1, sent)
	assert.Equal(t, 1, mail.count(), "email-only lead is nudged by email")
	assert.Equal(t, "bola@example.com", mail.sends[0].To)
	assert.Contains(t, mail.sends[0].Subject, "seat is waiting")
	assert.Contains(t, mail.sends[0].Body, "https://virtual.ykaycollege.com/cohorts", "branded email carries the checkout link")
	assert.Zero(t, len(wa.sends), "whatsapp untouched when there is no phone/user")

	got, _ := repo.GetByID(context.Background(), l.ID)
	assert.Equal(t, leads.StatusContacted, got.Status, "emailed lead flips to CONTACTED")
}

func TestPaymentNudge_WhatsAppTakesPrecedence(t *testing.T) {
	repo := memory.NewLeadMemory()
	wa := &capturingWhatsApp{}
	mail := &capturingEmail{}
	svc := NewLeadService(repo, NewNotifierService(nil, wa), nil, nil).WithEmail(mail)

	seedEmailLead(t, repo, "Ada Obi", "ada@example.com", "+2348012345678", false, time.Hour)
	sent, err := svc.SendPaymentNudges(context.Background(), "https://virtual.ykaycollege.com", 45*time.Minute, 24*time.Hour, 50)
	require.NoError(t, err)
	assert.Equal(t, 1, sent)
	assert.Equal(t, 1, len(wa.sends), "whatsapp is the primary channel")
	assert.Zero(t, mail.count(), "no duplicate email when whatsapp already delivered")
}

func TestPaymentNudge_EmailSavesLeadWhenWhatsAppFails(t *testing.T) {
	repo := memory.NewLeadMemory()
	wa := &failingWhatsApp{}
	mail := &capturingEmail{}
	svc := NewLeadService(repo, NewNotifierService(nil, wa), nil, nil).WithEmail(mail)

	l := seedEmailLead(t, repo, "Chika Eze", "chika@example.com", "+2348000000000", false, time.Hour)
	sent, err := svc.SendPaymentNudges(context.Background(), "https://virtual.ykaycollege.com", 45*time.Minute, 24*time.Hour, 50)
	require.NoError(t, err)
	assert.Equal(t, 1, sent, "email rescues the nudge when whatsapp errors")
	assert.Equal(t, 1, mail.count())

	got, _ := repo.GetByID(context.Background(), l.ID)
	assert.Equal(t, leads.StatusContacted, got.Status)
}

func TestPaymentNudge_NoChannelStaysNew(t *testing.T) {
	repo := memory.NewLeadMemory()
	wa := &capturingWhatsApp{}
	mail := &capturingEmail{}
	svc := NewLeadService(repo, NewNotifierService(nil, wa), nil, nil).WithEmail(mail)

	l := seedEmailLead(t, repo, "Ghost Lead", "", "", false, time.Hour)
	sent, err := svc.SendPaymentNudges(context.Background(), "https://virtual.ykaycollege.com", 45*time.Minute, 24*time.Hour, 50)
	require.NoError(t, err)
	assert.Zero(t, sent, "unreachable lead is skipped without error")
	got, _ := repo.GetByID(context.Background(), l.ID)
	assert.Equal(t, leads.StatusNew, got.Status, "stays NEW — retried when a channel appears")
}

func TestPaymentNudge_AllChannelsFailStaysNew(t *testing.T) {
	repo := memory.NewLeadMemory()
	wa := &failingWhatsApp{}
	mail := &capturingEmail{fail: true}
	svc := NewLeadService(repo, NewNotifierService(nil, wa), nil, nil).WithEmail(mail)

	l := seedEmailLead(t, repo, "Dual Fail", "dual@example.com", "+2348099999999", false, time.Hour)
	sent, err := svc.SendPaymentNudges(context.Background(), "https://virtual.ykaycollege.com", 45*time.Minute, 24*time.Hour, 50)
	require.NoError(t, err)
	assert.Zero(t, sent)
	got, _ := repo.GetByID(context.Background(), l.ID)
	assert.Equal(t, leads.StatusNew, got.Status, "failed sends never burn the one-shot nudge")
}

// failingWhatsApp — a WhatsApp sender whose sends always error.
type failingWhatsApp struct{}

func (f *failingWhatsApp) Send(_ context.Context, _, _ string) error { return errEmailDown }

package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/chat"
	"ykay-virtual/internal/repository/memory"
)

type fakeProvider struct{ text string }

func (f *fakeProvider) Reply(_ context.Context, _ []chat.Message, _ string) (string, error) {
	return f.text, nil
}

func TestChatService_ThreadLifecycle(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	svc := NewChatService(memory.NewChatMemory(), nil, env.store.Users)

	user, err := env.svc.Register(ctx, RegisterInput{Email: "chat@example.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)

	// Create thread → greeting message present.
	thread, err := svc.CreateThread(ctx, user.ID, "Fees question")
	require.NoError(t, err)
	assert.Equal(t, chat.ThreadOpen, thread.Status)

	msgs, err := svc.ListMessages(ctx, user.ID, thread.ID)
	require.NoError(t, err)
	require.Len(t, msgs, 1)
	assert.Equal(t, chat.RoleAssistant, msgs[0].Role)

	// Provider off → canned reply stored.
	reply, status, err := svc.SendMessage(ctx, user.ID, thread.ID, "How much is the UTME cohort?")
	require.NoError(t, err)
	assert.Contains(t, reply, "support team")
	assert.Equal(t, chat.ThreadOpen, status)

	// Provider on → AI reply used.
	svc.WithProvider(&fakeProvider{text: "The UTME cohort fee is ₦35,000."})
	reply, _, err = svc.SendMessage(ctx, user.ID, thread.ID, "How much again?")
	require.NoError(t, err)
	assert.Equal(t, "The UTME cohort fee is ₦35,000.", reply)

	// History preserved.
	msgs, err = svc.ListMessages(ctx, user.ID, thread.ID)
	require.NoError(t, err)
	assert.Len(t, msgs, 5) // greeting + user + assistant + user + assistant

	// Other users cannot read the thread.
	other, err := env.svc.Register(ctx, RegisterInput{Email: "other@example.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)
	_, err = svc.ListMessages(ctx, other.ID, thread.ID)
	assert.ErrorIs(t, err, domain.ErrNotFound)

	// Escalation → thread ESCALATED.
	require.NoError(t, svc.EscalateToHuman(ctx, user.ID, thread.ID, "Please help!"))
	got, err := svc.threads.GetThread(ctx, thread.ID)
	require.NoError(t, err)
	assert.Equal(t, chat.ThreadEscalated, got.Status)
}

// C4–C6: agent reply, close, ratings and analytics.
func TestChatService_AgentInboxAndAnalytics(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	svc := NewChatService(memory.NewChatMemory(), nil, env.store.Users)

	user, err := env.svc.Register(ctx, RegisterInput{Email: "c46@example.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)

	t1, err := svc.CreateThread(ctx, user.ID, "Billing")
	require.NoError(t, err)
	t2, err := svc.CreateThread(ctx, user.ID, "Schedule")
	require.NoError(t, err)

	_, _, err = svc.SendMessage(ctx, user.ID, t1.ID, "I need a human please")
	require.NoError(t, err) // escalates via keyword
	require.NoError(t, svc.EscalateToHuman(ctx, user.ID, t2.ID, "manual"))

	// Agent inbox lists all threads.
	all, err := svc.AdminListThreads(ctx)
	require.NoError(t, err)
	require.Len(t, all, 2)

	// Agent reply lands as agent role; transcript readable by admin.
	msg, err := svc.AgentReply(ctx, t1.ID, "Hi! This is Ada from support — how can I help?")
	require.NoError(t, err)
	assert.Equal(t, chat.RoleAgent, msg.Role)
	msgs, err := svc.AdminListMessages(ctx, t1.ID)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(msgs), 3)

	// Close thread.
	require.NoError(t, svc.CloseThread(ctx, t2.ID))
	got, err := svc.threads.GetThread(ctx, t2.ID)
	require.NoError(t, err)
	assert.Equal(t, chat.ThreadClosed, got.Status)

	// Ratings: user rates t1; invalid score rejected.
	require.NoError(t, svc.RateThread(ctx, user.ID, t1.ID, 5, ptrString("Great!")))
	assert.ErrorIs(t, svc.RateThread(ctx, user.ID, t1.ID, 9, nil), domain.ErrInvalidInput)
	got, err = svc.threads.GetThread(ctx, t1.ID)
	require.NoError(t, err)
	require.NotNil(t, got.Rating)
	assert.Equal(t, 5, *got.Rating)

	// Analytics.
	a, err := svc.AdminAnalytics(ctx)
	require.NoError(t, err)
	assert.Equal(t, 2, a.TotalThreads)
	assert.Equal(t, 1, a.EscalatedThreads)
	assert.Equal(t, 1, a.ClosedThreads)
	assert.Equal(t, 1, a.RatedThreads)
	assert.InDelta(t, 5.0, a.AvgRating, 0.001)
	assert.InDelta(t, 0.5, a.DeflectionRate, 0.001)
}

func ptrString(s string) *string { return &s }

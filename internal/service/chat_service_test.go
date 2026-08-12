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

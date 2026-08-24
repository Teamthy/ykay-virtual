package service

import (
	"context"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Phase 5b — SendMessage pokes participants' realtime streams. Polling
// remains the fallback; the poke is a pure latency optimisation and must
// never affect the stored-message/notification invariants.

type recordingPoker struct {
	mu     sync.Mutex
	events []struct {
		User uuid.UUID
		Type string
		Conv string
		Msg  string
	}
}

func (r *recordingPoker) UserEvent(_ context.Context, userID uuid.UUID, eventType, conversationID, messageID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events = append(r.events, struct {
		User uuid.UUID
		Type string
		Conv string
		Msg  string
	}{userID, eventType, conversationID, messageID})
}

func (r *recordingPoker) forUser(u uuid.UUID) int {
	r.mu.Lock()
	defer r.mu.Unlock()
	n := 0
	for _, e := range r.events {
		if e.User == u {
			n++
		}
	}
	return n
}

func TestSendMessage_PokesRecipientAndSenderStreams(t *testing.T) {
	env := newMsgEnv(t)
	poker := &recordingPoker{}
	env.svc.WithRealtime(poker)
	ctx := context.Background()

	conv, err := env.svc.CreateBookingConversation(ctx, env.pkg, []uuid.UUID{env.tutor, env.parent}, env.parent)
	require.NoError(t, err)

	msg, err := env.svc.SendMessage(ctx, SendMessageInput{
		ConversationID: conv.ID, SenderUserID: env.tutor, Body: "Lesson starts at 4pm",
	})
	require.NoError(t, err)

	assert.Equal(t, 1, poker.forUser(env.parent), "recipient poked exactly once")
	assert.Equal(t, 1, poker.forUser(env.tutor), "sender poked for multi-tab sync")
	for _, e := range poker.events {
		assert.Equal(t, "message.new", e.Type)
		assert.Equal(t, conv.ID.String(), e.Conv)
		assert.Equal(t, msg.ID.String(), e.Msg)
	}
}

func TestSendMessage_NilRealtime_UnchangedBehaviour(t *testing.T) {
	env := newMsgEnv(t) // no WithRealtime
	ctx := context.Background()

	conv, err := env.svc.CreateBookingConversation(ctx, env.pkg, []uuid.UUID{env.tutor, env.parent}, env.parent)
	require.NoError(t, err)

	_, err = env.svc.SendMessage(ctx, SendMessageInput{
		ConversationID: conv.ID, SenderUserID: env.tutor, Body: "still works",
	})
	require.NoError(t, err, "nil realtime must not change the send path")

	_, total, err := env.svc.ListNotifications(ctx, env.parent, 1, 20)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total, "notifications still created")
}

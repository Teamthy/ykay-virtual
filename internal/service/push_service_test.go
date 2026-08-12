package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"ykay-virtual/internal/repository/memory"
)

func TestPushService_DeviceLifecycle(t *testing.T) {
	ctx := context.Background()
	env := newAuthEnv(t)
	log := &LogPushSender{}
	svc := NewPushService(memory.NewDeviceMemory(), log)

	user, err := env.svc.Register(ctx, RegisterInput{Email: "push@example.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)

	// Register two devices (upsert keeps one per token).
	d1, err := svc.RegisterDevice(ctx, user.ID, "ExponentPushToken[aaa]", "ios", "0.1.0")
	require.NoError(t, err)
	_, err = svc.RegisterDevice(ctx, user.ID, "ExponentPushToken[bbb]", "android", "0.1.0")
	require.NoError(t, err)
	_, err = svc.RegisterDevice(ctx, user.ID, "ExponentPushToken[aaa]", "ios", "0.1.1") // same token → upsert
	require.NoError(t, err)

	devices, err := svc.ListDevices(ctx, user.ID)
	require.NoError(t, err)
	assert.Len(t, devices, 2)

	// Notify → both tokens delivered.
	require.NoError(t, svc.NotifyUser(ctx, user.ID, "Hello", "Test push", map[string]string{"k": "v"}))
	require.Len(t, log.Sent, 1)
	tokens := log.Sent[0]["tokens"].([]string)
	assert.ElementsMatch(t, []string{"ExponentPushToken[aaa]", "ExponentPushToken[bbb]"}, tokens)

	// Remove one device → one token left.
	require.NoError(t, svc.RemoveDevice(ctx, d1.ID, user.ID))
	devices, err = svc.ListDevices(ctx, user.ID)
	require.NoError(t, err)
	assert.Len(t, devices, 1)

	// After removal, notify reaches only the remaining device.
	require.NoError(t, svc.NotifyUser(ctx, user.ID, "x", "y", nil))
	require.Len(t, log.Sent, 2)
	assert.ElementsMatch(t, []string{"ExponentPushToken[bbb]"}, log.Sent[1]["tokens"].([]string))
}

func TestChatService_AgentReplyPushes(t *testing.T) {
	env := newAuthEnv(t)
	ctx := context.Background()
	log := &LogPushSender{}
	push := NewPushService(memory.NewDeviceMemory(), log)
	svc := NewChatService(memory.NewChatMemory(), nil, env.store.Users)
	svc.WithPusher(push)

	user, err := env.svc.Register(ctx, RegisterInput{Email: "pushchat@example.com", Password: "password123", Roles: []string{"PARENT"}})
	require.NoError(t, err)
	_, err = push.RegisterDevice(ctx, user.ID, "ExponentPushToken[chat]", "ios", "0.1.0")
	require.NoError(t, err)

	thread, err := svc.CreateThread(ctx, user.ID, "Support")
	require.NoError(t, err)

	_, err = svc.AgentReply(ctx, thread.ID, "Hi, this is Ada — how can I help?")
	require.NoError(t, err)

	require.Len(t, log.Sent, 1)
	title := log.Sent[0]["title"].(string)
	assert.Contains(t, title, "support")
	body := log.Sent[0]["body"].(string)
	assert.Contains(t, body, "Ada")
}

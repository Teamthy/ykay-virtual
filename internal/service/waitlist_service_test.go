package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"ykay-virtual/internal/repository/memory"
)

func TestWaitlist_JoinIsIdempotentPerUser(t *testing.T) {
	ctx := context.Background()
	svc := NewWaitlistService(memory.NewWaitlistMemory())
	cohort := uuid.New()
	user := uuid.New()

	first, err := svc.Join(ctx, cohort, user)
	require.NoError(t, err)
	require.Equal(t, 1, first.Position)

	second, err := svc.Join(ctx, cohort, user)
	require.NoError(t, err)
	assert.Equal(t, first.ID, second.ID, "re-joining must return the same entry (no duplicate)")
	assert.Equal(t, first.Position, second.Position)

	other := uuid.New()
	third, err := svc.Join(ctx, cohort, other)
	require.NoError(t, err)
	assert.Equal(t, 2, third.Position, "a new learner takes the next position")

	count, err := svc.Count(ctx, cohort)
	require.NoError(t, err)
	assert.Equal(t, 2, count)
}

func TestWaitlist_NotifyFrontIsAtMostOnce(t *testing.T) {
	ctx := context.Background()
	svc := NewWaitlistService(memory.NewWaitlistMemory())
	cohort := uuid.New()
	u1, u2 := uuid.New(), uuid.New()
	_, err := svc.Join(ctx, cohort, u1)
	require.NoError(t, err)
	_, err = svc.Join(ctx, cohort, u2)
	require.NoError(t, err)

	// First seat opening notifies the front learner exactly once.
	notified, err := svc.NotifyFront(ctx, cohort, 1)
	require.NoError(t, err)
	require.Len(t, notified, 1)
	assert.Equal(t, u1, notified[0].UserID)

	// A redelivered / concurrent seat opening must not notify u1 again.
	again, err := svc.NotifyFront(ctx, cohort, 5)
	require.NoError(t, err)
	for _, e := range again {
		assert.NotEqual(t, u1, e.UserID, "already-notified learner must never be re-notified")
	}
	assert.Equal(t, u2, again[0].UserID, "the next learner is notified on the following opening")

	// Once everyone is notified, further calls are empty (no double email).
	empty, err := svc.NotifyFront(ctx, cohort, 5)
	require.NoError(t, err)
	assert.Empty(t, empty)
}

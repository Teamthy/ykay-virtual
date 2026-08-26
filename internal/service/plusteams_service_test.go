package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newPlusTeamsSvc() *PlusTeamsService {
	store := memory.NewMemoryStore()
	svc := NewPlusTeamsService(store.PlusTeams, NewAuditService(store.AuditLogs))
	svc.WithManagerCheck(func(_ context.Context, _, _ uuid.UUID, isAdmin bool) error {
		if isAdmin {
			return nil
		}
		return nil // tests: allow non-admin managers
	})
	return svc
}

func TestPlusTeams_AllocationAndSeats(t *testing.T) {
	ctx := context.Background()
	svc := newPlusTeamsSvc()
	inst := uuid.New()
	admin := uuid.New()

	// Default: zero allocation.
	a, err := svc.GetAllocation(ctx, inst)
	require.NoError(t, err)
	assert.Equal(t, 0, a.TotalSeats)
	assert.Equal(t, 0, a.UsedSeats)

	// Set capacity 2.
	a, err = svc.SetSeats(ctx, admin, inst, false, 2)
	require.NoError(t, err)
	assert.Equal(t, 2, a.TotalSeats)

	// Assign two seats.
	u1, u2 := uuid.New(), uuid.New()
	_, err = svc.AssignSeat(ctx, admin, inst, u1, false)
	require.NoError(t, err)
	_, err = svc.AssignSeat(ctx, admin, inst, u2, false)
	require.NoError(t, err)

	// Third seat -> conflict (capacity reached).
	_, err = svc.AssignSeat(ctx, admin, inst, uuid.New(), false)
	require.Error(t, err)

	seats, err := svc.ListSeats(ctx, admin, inst, false)
	require.NoError(t, err)
	assert.Len(t, seats, 2)

	// Release one -> seat available again.
	require.NoError(t, svc.ReleaseSeat(ctx, admin, inst, u1, false))
	_, err = svc.AssignSeat(ctx, admin, inst, uuid.New(), false)
	require.NoError(t, err)

	// Allocation reflects usage.
	a, _ = svc.GetAllocation(ctx, inst)
	assert.Equal(t, 2, a.UsedSeats)
}

package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"ykay-virtual/internal/repository/memory"
)

func TestMastery_ComputesPercentageFromResults(t *testing.T) {
	ctx := context.Background()
	svc := NewMasteryService(memory.NewMasteryMemory())
	sp := uuid.New()

	// 3 correct of 4 attempts on "Algebra" => 75%.
	for _, ok := range []bool{true, true, false, true} {
		require.NoError(t, svc.Record(ctx, sp, "mathematics", "Algebra", ok))
	}
	cells, err := svc.Mastery(ctx, sp, "mathematics")
	require.NoError(t, err)
	require.Len(t, cells, 1)
	assert.Equal(t, "Algebra", cells[0].Topic)
	assert.Equal(t, 4, cells[0].Attempts)
	assert.Equal(t, 3, cells[0].Correct)
	assert.Equal(t, 75, cells[0].Mastery)
}

func TestMastery_EmptyWhenNoHistory(t *testing.T) {
	ctx := context.Background()
	svc := NewMasteryService(memory.NewMasteryMemory())
	cells, err := svc.Mastery(ctx, uuid.New(), "")
	require.NoError(t, err)
	assert.Empty(t, cells, "no fabricated scores when there is no attempt history")
}

func TestMastery_WeakTopicsBelowThreshold(t *testing.T) {
	ctx := context.Background()
	svc := NewMasteryService(memory.NewMasteryMemory())
	sp := uuid.New()
	require.NoError(t, svc.Record(ctx, sp, "biology", "Genetics", false))
	require.NoError(t, svc.Record(ctx, sp, "biology", "Genetics", false)) // 0%
	require.NoError(t, svc.Record(ctx, sp, "biology", "Cells", true))     // 100%

	weak, err := svc.WeakTopics(ctx, sp, "biology", 60)
	require.NoError(t, err)
	require.Len(t, weak, 1)
	assert.Equal(t, "Genetics", weak[0].Topic)
}

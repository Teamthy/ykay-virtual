package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"ykay-virtual/internal/domain/revision"
	"ykay-virtual/internal/repository/memory"
)

func TestPriorityForMastery(t *testing.T) {
	assert.Equal(t, 1, priorityForMastery(10), "weak topic is promoted")
	assert.Equal(t, 2, priorityForMastery(0), "unknown mastery is neutral")
	assert.Equal(t, 2, priorityForMastery(60), "developing stays steady")
	assert.Equal(t, 3, priorityForMastery(90), "mastered topic is compressed")
}

func TestSchedule_SpreadsTopicsAcrossWindow(t *testing.T) {
	start := time.Date(2026, 9, 23, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 0, 4)
	plan := &revision.Plan{WindowStart: start, WindowEnd: end}
	tasks := schedule(plan, []string{"A", "B", "C", "D"}, "seeded")
	require.Len(t, tasks, 4)
	assert.Equal(t, "seeded", tasks[0].Source)
	assert.Equal(t, "PENDING", tasks[0].Status)
	assert.False(t, tasks[0].WindowStart.After(tasks[3].WindowStart), "tasks ordered across the window")
	assert.True(t, tasks[3].WindowEnd.After(tasks[0].WindowStart))
}

func TestRevision_SeedAndRebalance(t *testing.T) {
	ctx := context.Background()
	mastery := NewMasteryService(memory.NewMasteryMemory())
	svc := NewRevisionService(memory.NewRevisionMemory()).WithMastery(mastery)
	sp := uuid.New()

	// Learner is weak on Genetics, strong on Cells.
	require.NoError(t, mastery.Record(ctx, sp, "biology", "Genetics", false))
	require.NoError(t, mastery.Record(ctx, sp, "biology", "Genetics", false)) // 0%
	require.NoError(t, mastery.Record(ctx, sp, "biology", "Cells", true))     // 100%

	start := time.Now().UTC()
	end := start.AddDate(0, 0, 14)
	plan, err := svc.CreatePlan(ctx, sp, "biology", "JAMB", start, end)
	require.NoError(t, err)

	_, tasks, err := svc.GetPlan(ctx, plan.ID)
	require.NoError(t, err)
	require.Len(t, tasks, 1, "only the weak topic is seeded")
	assert.Equal(t, "Genetics", tasks[0].Topic)

	changed, err := svc.Rebalance(ctx, plan.ID)
	require.NoError(t, err)
	assert.Equal(t, 1, changed, "the weak task is reprioritised")

	_, tasks, err = svc.GetPlan(ctx, plan.ID)
	require.NoError(t, err)
	assert.Equal(t, 1, tasks[0].Priority, "weak topic promoted to priority 1")
	assert.Equal(t, "rebalanced", tasks[0].Source)

	// Completing a task is idempotent.
	require.NoError(t, svc.CompleteTask(ctx, tasks[0].ID))
	require.NoError(t, svc.CompleteTask(ctx, tasks[0].ID))
	_, tasks, err = svc.GetPlan(ctx, plan.ID)
	require.NoError(t, err)
	assert.Equal(t, "DONE", tasks[0].Status)
}

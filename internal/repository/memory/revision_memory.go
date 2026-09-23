package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/revision"
)

// RevisionMemory — in-memory revision.Repository for tests + dev fallback.
type RevisionMemory struct {
	mu    sync.RWMutex
	plans map[uuid.UUID]*revision.Plan
	tasks []*revision.Task
}

func NewRevisionMemory() *RevisionMemory {
	return &RevisionMemory{plans: map[uuid.UUID]*revision.Plan{}, tasks: []*revision.Task{}}
}

func (m *RevisionMemory) CreatePlan(_ context.Context, p *revision.Plan) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	p.ID = uuid.New()
	now := time.Now().UTC()
	p.CreatedAt = now
	p.UpdatedAt = now
	cp := *p
	m.plans[p.ID] = &cp
	*p = cp
	return nil
}

func (m *RevisionMemory) GetPlan(_ context.Context, id uuid.UUID) (*revision.Plan, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	p, ok := m.plans[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *p
	return &cp, nil
}

func (m *RevisionMemory) ListPlans(_ context.Context, studentProfileID uuid.UUID) ([]revision.Plan, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []revision.Plan{}
	for _, p := range m.plans {
		if p.StudentProfileID == studentProfileID {
			out = append(out, *p)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (m *RevisionMemory) AddTasks(_ context.Context, tasks []revision.Task) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range tasks {
		tasks[i].ID = uuid.New()
		tasks[i].CreatedAt = time.Now().UTC()
		cp := tasks[i]
		m.tasks = append(m.tasks, &cp)
	}
	return nil
}

func (m *RevisionMemory) ListTasks(_ context.Context, planID uuid.UUID) ([]revision.Task, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []revision.Task{}
	for _, t := range m.tasks {
		if t.PlanID == planID {
			out = append(out, *t)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].WindowStart.Before(out[j].WindowStart) })
	return out, nil
}

func (m *RevisionMemory) SetTaskPriority(_ context.Context, taskID uuid.UUID, priority int, source string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.tasks {
		if t.ID == taskID {
			t.Priority = priority
			t.Source = source
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *RevisionMemory) CompleteTask(_ context.Context, taskID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC()
	for _, t := range m.tasks {
		if t.ID == taskID {
			if t.Status == "PENDING" {
				t.Status = "DONE"
				t.CompletedAt = &now
			}
			return nil // idempotent
		}
	}
	return domain.ErrNotFound
}

var _ revision.Repository = (*RevisionMemory)(nil)

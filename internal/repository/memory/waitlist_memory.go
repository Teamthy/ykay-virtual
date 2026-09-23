package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/waitlist"
)

// WaitlistMemory — in-memory waitlist.Repository for tests + dev fallback.
type WaitlistMemory struct {
	mu      sync.RWMutex
	entries []*waitlist.Entry
}

func NewWaitlistMemory() *WaitlistMemory {
	return &WaitlistMemory{entries: []*waitlist.Entry{}}
}

func (m *WaitlistMemory) Join(_ context.Context, cohortID, userID uuid.UUID) (*waitlist.Entry, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, e := range m.entries {
		if e.CohortID == cohortID && e.UserID == userID {
			cp := *e
			return &cp, nil
		}
	}
	pos := 1
	for _, e := range m.entries {
		if e.CohortID == cohortID && e.Position >= pos {
			pos = e.Position + 1
		}
	}
	e := &waitlist.Entry{ID: uuid.New(), CohortID: cohortID, UserID: userID, Position: pos, CreatedAt: time.Now().UTC()}
	m.entries = append(m.entries, e)
	cp := *e
	return &cp, nil
}

func (m *WaitlistMemory) Get(_ context.Context, cohortID, userID uuid.UUID) (*waitlist.Entry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, e := range m.entries {
		if e.CohortID == cohortID && e.UserID == userID {
			cp := *e
			return &cp, nil
		}
	}
	return nil, nil
}

func (m *WaitlistMemory) ListForCohort(_ context.Context, cohortID uuid.UUID) ([]waitlist.Entry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []waitlist.Entry{}
	for _, e := range m.entries {
		if e.CohortID == cohortID {
			out = append(out, *e)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Position < out[j].Position })
	return out, nil
}

func (m *WaitlistMemory) Count(_ context.Context, cohortID uuid.UUID) (int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	n := 0
	for _, e := range m.entries {
		if e.CohortID == cohortID {
			n++
		}
	}
	return n, nil
}

func (m *WaitlistMemory) Leave(_ context.Context, cohortID, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := m.entries[:0]
	for _, e := range m.entries {
		if e.CohortID == cohortID && e.UserID == userID {
			continue
		}
		out = append(out, e)
	}
	m.entries = out
	return nil
}

func (m *WaitlistMemory) FrontUnnotified(_ context.Context, cohortID uuid.UUID, limit int) ([]waitlist.Entry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []waitlist.Entry{}
	for _, e := range m.entries {
		if e.CohortID == cohortID && e.NotifiedAt == nil {
			out = append(out, *e)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Position < out[j].Position })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *WaitlistMemory) MarkNotified(_ context.Context, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC()
	for _, e := range m.entries {
		if e.ID == id {
			e.NotifiedAt = &now
		}
	}
	return nil
}

func (m *WaitlistMemory) NextPosition(_ context.Context, cohortID uuid.UUID) (int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	pos := 1
	for _, e := range m.entries {
		if e.CohortID == cohortID && e.Position >= pos {
			pos = e.Position + 1
		}
	}
	return pos, nil
}

var _ waitlist.Repository = (*WaitlistMemory)(nil)

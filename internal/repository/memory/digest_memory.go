package memory

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/digest"
)

// DigestMemory — in-memory digest.Repository for tests + dev fallback.
type DigestMemory struct {
	mu    sync.RWMutex
	prefs map[uuid.UUID]*digest.Prefs
}

func NewDigestMemory() *DigestMemory {
	return &DigestMemory{prefs: map[uuid.UUID]*digest.Prefs{}}
}

func (m *DigestMemory) Get(_ context.Context, parentUserID uuid.UUID) (*digest.Prefs, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	p, ok := m.prefs[parentUserID]
	if !ok {
		return nil, digest.ErrNotFound
	}
	cp := *p
	return &cp, nil
}

func (m *DigestMemory) Upsert(_ context.Context, p *digest.Prefs) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := *p
	cp.UpdatedAt = time.Now().UTC()
	m.prefs[p.ParentUserID] = &cp
	return nil
}

func (m *DigestMemory) ListEnabled(_ context.Context) ([]digest.Prefs, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []digest.Prefs{}
	for _, p := range m.prefs {
		if p.Enabled {
			out = append(out, *p)
		}
	}
	return out, nil
}

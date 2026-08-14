package memory

import (
	"context"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"

	"github.com/google/uuid"
)

// ProgrammeLifecycleMemory — publish-workflow state (G5.3) backed by the
// same ProgrammeMemory rows as the catalogue (dev/tests parity).
type ProgrammeLifecycleMemory struct {
	pm   *ProgrammeMemory
	life map[uuid.UUID]academics.ProgrammeLifecycle
}

func NewProgrammeLifecycleMemory(pm *ProgrammeMemory) *ProgrammeLifecycleMemory {
	return &ProgrammeLifecycleMemory{pm: pm, life: map[uuid.UUID]academics.ProgrammeLifecycle{}}
}

func (m *ProgrammeLifecycleMemory) GetLifecycle(_ context.Context, id uuid.UUID) (*academics.ProgrammeLifecycle, error) {
	m.pm.mu.RLock()
	p, ok := m.pm.rows[id]
	m.pm.mu.RUnlock()
	if !ok {
		return nil, domain.ErrNotFound
	}
	l, ok := m.life[id]
	if !ok {
		l = academics.ProgrammeLifecycle{ID: id, Status: p.Status}
	}
	l.Status = p.Status
	return &l, nil
}

func (m *ProgrammeLifecycleMemory) SetLifecycle(_ context.Context, l academics.ProgrammeLifecycle) error {
	m.pm.mu.Lock()
	defer m.pm.mu.Unlock()
	p, ok := m.pm.rows[l.ID]
	if !ok {
		return domain.ErrNotFound
	}
	p.Status = l.Status
	m.pm.rows[l.ID] = p
	m.life[l.ID] = l
	return nil
}

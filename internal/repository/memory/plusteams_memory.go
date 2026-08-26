package memory

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/plusteams"
)

// PlusTeamsMemory — in-memory plusteams.Repository for tests + dev fallback.
type PlusTeamsMemory struct {
	mu    sync.RWMutex
	alloc map[uuid.UUID]*plusteams.Allocation
	seats map[string]*plusteams.Seat // instID|userID
}

func NewPlusTeamsMemory() *PlusTeamsMemory {
	return &PlusTeamsMemory{alloc: map[uuid.UUID]*plusteams.Allocation{}, seats: map[string]*plusteams.Seat{}}
}

func (m *PlusTeamsMemory) key(instID, userID uuid.UUID) string {
	return instID.String() + "|" + userID.String()
}

func (m *PlusTeamsMemory) GetAllocation(_ context.Context, institutionID uuid.UUID) (*plusteams.Allocation, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if a, ok := m.alloc[institutionID]; ok {
		cp := *a
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *PlusTeamsMemory) SetSeats(_ context.Context, institutionID uuid.UUID, totalSeats int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if a, ok := m.alloc[institutionID]; ok {
		if a.UsedSeats <= totalSeats {
			a.TotalSeats = totalSeats
			a.UpdatedAt = time.Now().UTC()
		}
		return nil
	}
	now := time.Now().UTC()
	m.alloc[institutionID] = &plusteams.Allocation{InstitutionID: institutionID, TotalSeats: totalSeats, UsedSeats: 0, CreatedAt: now, UpdatedAt: now}
	return nil
}

func (m *PlusTeamsMemory) AssignSeat(_ context.Context, institutionID, userID uuid.UUID) (*plusteams.Seat, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.seats[m.key(institutionID, userID)]; ok {
		return nil, domain.ErrAlreadyExists
	}
	a, ok := m.alloc[institutionID]
	if !ok {
		now := time.Now().UTC()
		a = &plusteams.Allocation{InstitutionID: institutionID, TotalSeats: 0, UsedSeats: 0, CreatedAt: now, UpdatedAt: now}
		m.alloc[institutionID] = a
	}
	if a.UsedSeats >= a.TotalSeats {
		return nil, domain.ErrConflict
	}
	s := &plusteams.Seat{ID: uuid.New(), InstitutionID: institutionID, UserID: userID, CreatedAt: time.Now().UTC()}
	m.seats[m.key(institutionID, userID)] = s
	a.UsedSeats++
	a.UpdatedAt = s.CreatedAt
	cp := *s
	return &cp, nil
}

func (m *PlusTeamsMemory) ReleaseSeat(_ context.Context, institutionID, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.seats[m.key(institutionID, userID)]; !ok {
		return domain.ErrNotFound
	}
	delete(m.seats, m.key(institutionID, userID))
	if a, ok := m.alloc[institutionID]; ok {
		a.UsedSeats--
		if a.UsedSeats < 0 {
			a.UsedSeats = 0
		}
		a.UpdatedAt = time.Now().UTC()
	}
	return nil
}

func (m *PlusTeamsMemory) ListSeats(_ context.Context, institutionID uuid.UUID) ([]plusteams.Seat, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []plusteams.Seat{}
	for _, s := range m.seats {
		if s.InstitutionID == institutionID {
			out = append(out, *s)
		}
	}
	return out, nil
}

var _ plusteams.Repository = (*PlusTeamsMemory)(nil)

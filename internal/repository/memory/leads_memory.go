package memory

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/leads"

	"github.com/google/uuid"
)

// LeadMemory — in-memory lead store (tests / dev fallback).
type LeadMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*leads.Lead
}

func NewLeadMemory() *LeadMemory {
	return &LeadMemory{rows: map[uuid.UUID]*leads.Lead{}}
}

func (m *LeadMemory) Create(_ context.Context, l *leads.Lead) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	now := time.Now().UTC()
	l.CreatedAt = now
	l.UpdatedAt = now
	cp := *l
	m.rows[cp.ID] = &cp
	return nil
}

func (m *LeadMemory) GetByID(_ context.Context, id uuid.UUID) (*leads.Lead, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if l, ok := m.rows[id]; ok {
		cp := *l
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *LeadMemory) List(_ context.Context, status string, page, pageSize int) ([]leads.Lead, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []leads.Lead{}
	for _, l := range m.rows {
		if status != "" && l.Status != status {
			continue
		}
		out = append(out, *l)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	total := int64(len(out))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	start := (page - 1) * pageSize
	if start >= len(out) {
		return []leads.Lead{}, total, nil
	}
	end := start + pageSize
	if end > len(out) {
		end = len(out)
	}
	return out[start:end], total, nil
}

func (m *LeadMemory) UpdateStatus(_ context.Context, id uuid.UUID, status string, at time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	l, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	l.Status = status
	l.UpdatedAt = at
	switch status {
	case leads.StatusContacted:
		l.ContactedAt = &at
	case leads.StatusConverted:
		l.ConvertedAt = &at
	}
	return nil
}

func (m *LeadMemory) FindRecentOpen(_ context.Context, intent, source string, userID, cohortID *uuid.UUID, email, phone *string, since time.Time) (*leads.Lead, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var best *leads.Lead
	for _, l := range m.rows {
		if l.Status != leads.StatusNew || l.Intent != intent || l.Source != source {
			continue
		}
		if l.CreatedAt.Before(since) {
			continue
		}
		if !uuidPtrEqual(l.UserID, userID) || !uuidPtrEqual(l.CohortID, cohortID) {
			continue
		}
		if email == nil && phone == nil {
			// caller did not constrain contact info — any match wins
		} else {
			emailMatch := email != nil && l.Email != nil && *email != "" && strings.EqualFold(*email, *l.Email)
			phoneMatch := phone != nil && l.Phone != nil && *phone != "" && *phone == *l.Phone
			if !emailMatch && !phoneMatch {
				continue
			}
		}
		if best == nil || l.CreatedAt.After(best.CreatedAt) {
			best = l
		}
	}
	if best == nil {
		return nil, domain.ErrNotFound
	}
	cp := *best
	return &cp, nil
}

func (m *LeadMemory) CountByStatus(_ context.Context, status string) (int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var n int64
	for _, l := range m.rows {
		if l.Status == status {
			n++
		}
	}
	return n, nil
}

// Backdate rewinds a lead's created_at (tests: verify the dedupe window).
func (m *LeadMemory) Backdate(id uuid.UUID, at time.Time) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if l, ok := m.rows[id]; ok {
		l.CreatedAt = at
	}
}

func uuidPtrEqual(a, b *uuid.UUID) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

var _ leads.Repository = (*LeadMemory)(nil)

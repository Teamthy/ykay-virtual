package memory

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/advisor"
)

// AdvisorMemory — in-memory advisor.Repository for tests + dev fallback.
type AdvisorMemory struct {
	mu     sync.RWMutex
	assign map[uuid.UUID]*advisor.Assignment // by userID
	plans  map[string]*advisor.LearningPlan  // userID|studentID
}

func NewAdvisorMemory() *AdvisorMemory {
	return &AdvisorMemory{
		assign: map[uuid.UUID]*advisor.Assignment{},
		plans:  map[string]*advisor.LearningPlan{},
	}
}

func (m *AdvisorMemory) Assign(_ context.Context, a *advisor.Assignment) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC()
	if existing, ok := m.assign[a.UserID]; ok {
		existing.AdvisorUserID = a.AdvisorUserID
		existing.Note = a.Note
		existing.AssignedBy = a.AssignedBy
		existing.UpdatedAt = now
		a.ID = existing.ID
		a.CreatedAt = existing.CreatedAt
		a.UpdatedAt = now
		return nil
	}
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	a.CreatedAt = now
	a.UpdatedAt = now
	cp := *a
	m.assign[a.UserID] = &cp
	*a = cp
	return nil
}

func (m *AdvisorMemory) GetByUser(_ context.Context, userID uuid.UUID) (*advisor.Assignment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if a, ok := m.assign[userID]; ok {
		cp := *a
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *AdvisorMemory) UpdateNote(_ context.Context, id uuid.UUID, note *string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, a := range m.assign {
		if a.ID == id {
			a.Note = note
			a.UpdatedAt = time.Now().UTC()
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *AdvisorMemory) planKey(userID, studentID uuid.UUID) string {
	return userID.String() + "|" + studentID.String()
}

func (m *AdvisorMemory) UpsertPlan(_ context.Context, p *advisor.LearningPlan) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC()
	if existing, ok := m.plans[m.planKey(p.UserID, p.StudentProfileID)]; ok {
		existing.Goals = p.Goals
		existing.FocusAreas = p.FocusAreas
		existing.Recommendations = p.Recommendations
		existing.Status = p.Status
		existing.CreatedBy = p.CreatedBy
		existing.UpdatedAt = now
		p.ID = existing.ID
		p.CreatedAt = existing.CreatedAt
		p.UpdatedAt = now
		return nil
	}
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	p.CreatedAt = now
	p.UpdatedAt = now
	cp := *p
	m.plans[m.planKey(p.UserID, p.StudentProfileID)] = &cp
	*p = cp
	return nil
}

func (m *AdvisorMemory) GetPlan(_ context.Context, userID, studentID uuid.UUID) (*advisor.LearningPlan, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if p, ok := m.plans[m.planKey(userID, studentID)]; ok {
		cp := *p
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

var _ advisor.Repository = (*AdvisorMemory)(nil)

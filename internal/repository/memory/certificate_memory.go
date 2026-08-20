package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/certificate"

	"github.com/google/uuid"
)

// CertificateMemory — in-memory certificate store (tests / dev fallback).
type CertificateMemory struct {
	mu     sync.RWMutex
	rows   map[uuid.UUID]*certificate.Certificate
	byCred map[string]uuid.UUID
}

func NewCertificateMemory() *CertificateMemory {
	return &CertificateMemory{rows: map[uuid.UUID]*certificate.Certificate{}, byCred: map[string]uuid.UUID{}}
}

func (m *CertificateMemory) Create(_ context.Context, c *certificate.Certificate) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	c.CreatedAt = time.Now().UTC()
	if c.IssuedAt.IsZero() {
		c.IssuedAt = c.CreatedAt
	}
	m.rows[c.ID] = c
	m.byCred[c.CredentialNumber] = c.ID
	return nil
}

func (m *CertificateMemory) GetByID(_ context.Context, id uuid.UUID) (*certificate.Certificate, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if c, ok := m.rows[id]; ok {
		cp := *c
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *CertificateMemory) GetByCredential(_ context.Context, number string) (*certificate.Certificate, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	id, ok := m.byCred[number]
	if !ok {
		return nil, domain.ErrNotFound
	}
	if c, ok := m.rows[id]; ok {
		cp := *c
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *CertificateMemory) GetForStudentAndCohort(_ context.Context, studentProfileID, cohortID uuid.UUID) (*certificate.Certificate, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, c := range m.rows {
		if c.StudentProfileID == studentProfileID && c.CohortID != nil && *c.CohortID == cohortID {
			cp := *c
			return &cp, nil
		}
	}
	return nil, nil
}

func (m *CertificateMemory) ListByStudent(_ context.Context, studentProfileID uuid.UUID, limit int) ([]certificate.Certificate, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []certificate.Certificate{}
	for _, c := range m.rows {
		if c.StudentProfileID == studentProfileID {
			out = append(out, *c)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].IssuedAt.After(out[j].IssuedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *CertificateMemory) ListByStudents(_ context.Context, studentProfileIDs []uuid.UUID, limit int) ([]certificate.Certificate, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	want := map[uuid.UUID]bool{}
	for _, id := range studentProfileIDs {
		want[id] = true
	}
	byStudent := map[uuid.UUID][]certificate.Certificate{}
	for _, c := range m.rows {
		if want[c.StudentProfileID] {
			byStudent[c.StudentProfileID] = append(byStudent[c.StudentProfileID], *c)
		}
	}
	out := []certificate.Certificate{}
	for _, list := range byStudent {
		sort.Slice(list, func(i, j int) bool { return list[i].IssuedAt.After(list[j].IssuedAt) })
		if limit > 0 && len(list) > limit {
			list = list[:limit]
		}
		out = append(out, list...)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].IssuedAt.After(out[j].IssuedAt) })
	return out, nil
}

var _ certificate.CertificateRepository = (*CertificateMemory)(nil)

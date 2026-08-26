package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/admissions"

	"github.com/google/uuid"
)

// AdmissionsMemory — in-memory admissions store (tests / dev fallback).
type AdmissionsMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*admissions.Application
	docs map[uuid.UUID]*admissions.Document
}

func NewAdmissionsMemory() *AdmissionsMemory {
	return &AdmissionsMemory{rows: map[uuid.UUID]*admissions.Application{}, docs: map[uuid.UUID]*admissions.Document{}}
}

func (m *AdmissionsMemory) Create(_ context.Context, a *admissions.Application) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	now := time.Now().UTC()
	a.CreatedAt = now
	a.UpdatedAt = now
	if a.Status == "" {
		a.Status = admissions.StatusPending
	}
	m.rows[a.ID] = a
	return nil
}

func (m *AdmissionsMemory) GetByID(_ context.Context, id uuid.UUID) (*admissions.Application, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if a, ok := m.rows[id]; ok {
		cp := *a
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *AdmissionsMemory) UpdateStatus(_ context.Context, id uuid.UUID, status admissions.Status, reviewedBy *uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	a.Status = status
	a.ReviewedBy = reviewedBy
	a.UpdatedAt = time.Now().UTC()
	if status == admissions.StatusOffered || status == admissions.StatusAccepted || status == admissions.StatusRejected {
		t := a.UpdatedAt
		a.ReviewedAt = &t
	}
	return nil
}

func (m *AdmissionsMemory) ListByParent(_ context.Context, parentUserID uuid.UUID, limit int) ([]admissions.Application, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []admissions.Application{}
	for _, a := range m.rows {
		if a.ParentUserID == parentUserID {
			out = append(out, *a)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *AdmissionsMemory) SetOffer(_ context.Context, id uuid.UUID, fee *float64, currency *string, message *string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	a, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	a.OfferFee = fee
	a.OfferCurrency = currency
	a.OfferMessage = message
	a.UpdatedAt = time.Now().UTC()
	return nil
}

// --- Documents ---

func (m *AdmissionsMemory) AddDocument(_ context.Context, d *admissions.Document) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	d.CreatedAt = time.Now().UTC()
	cp := *d
	m.docs[d.ID] = &cp
	*d = cp
	return nil
}

func (m *AdmissionsMemory) ListDocuments(_ context.Context, applicationID uuid.UUID) ([]admissions.Document, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []admissions.Document{}
	for _, d := range m.docs {
		if d.ApplicationID == applicationID {
			out = append(out, *d)
		}
	}
	return out, nil
}

func (m *AdmissionsMemory) GetDocument(_ context.Context, id uuid.UUID) (*admissions.Document, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if d, ok := m.docs[id]; ok {
		cp := *d
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *AdmissionsMemory) RemoveDocument(_ context.Context, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.docs[id]; !ok {
		return domain.ErrNotFound
	}
	delete(m.docs, id)
	return nil
}

func (m *AdmissionsMemory) ListAll(_ context.Context, status string, page, pageSize int) ([]admissions.Application, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []admissions.Application{}
	for _, a := range m.rows {
		if status == "" || string(a.Status) == status {
			out = append(out, *a)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	total := int64(len(out))
	limit := pageSize
	if limit < 1 {
		limit = 20
	}
	start := (page - 1) * limit
	if start < 0 {
		start = 0
	}
	if start > len(out) {
		start = len(out)
	}
	end := start + limit
	if end > len(out) {
		end = len(out)
	}
	return out[start:end], total, nil
}

var _ admissions.Repository = (*AdmissionsMemory)(nil)

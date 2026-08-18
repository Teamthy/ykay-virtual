package memory

import (
	"context"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// Additional in-memory stores for the booking/payment services.

// --- Private tuition requests ---

type PrivateReqMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*booking.PrivateTuitionRequest
}

func NewPrivateReqMemory() *PrivateReqMemory {
	return &PrivateReqMemory{rows: map[uuid.UUID]*booking.PrivateTuitionRequest{}}
}

func (m *PrivateReqMemory) Create(_ context.Context, r *booking.PrivateTuitionRequest) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	r.CreatedAt = time.Now().UTC()
	r.UpdatedAt = r.CreatedAt
	m.rows[r.ID] = r
	return nil
}

func (m *PrivateReqMemory) GetByID(_ context.Context, id uuid.UUID) (*booking.PrivateTuitionRequest, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if r, ok := m.rows[id]; ok {
		cp := *r
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

var _ booking.PrivateTuitionRequestRepository = (*PrivateReqMemory)(nil)

// --- Private packages ---

type PrivatePackageMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*booking.PrivatePackage
}

func NewPrivatePackageMemory() *PrivatePackageMemory {
	return &PrivatePackageMemory{rows: map[uuid.UUID]*booking.PrivatePackage{}}
}

func (m *PrivatePackageMemory) Create(_ context.Context, p *booking.PrivatePackage) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	p.CreatedAt = time.Now().UTC()
	p.UpdatedAt = p.CreatedAt
	m.rows[p.ID] = p
	return nil
}

func (m *PrivatePackageMemory) GetByID(_ context.Context, id uuid.UUID) (*booking.PrivatePackage, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if p, ok := m.rows[id]; ok {
		cp := *p
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *PrivatePackageMemory) UpdateStatus(_ context.Context, id uuid.UUID, status string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.rows[id]
	if !ok {
		return domain.ErrNotFound
	}
	p.Status = status
	p.UpdatedAt = time.Now().UTC()
	return nil
}

var _ booking.PrivatePackageRepository = (*PrivatePackageMemory)(nil)

// --- Audit logs ---

type AuditLogMemory struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]*identity.AuditLog
}

func NewAuditLogMemory() *AuditLogMemory {
	return &AuditLogMemory{rows: map[uuid.UUID]*identity.AuditLog{}}
}

// ArchiveOlderThan — dev no-op (the in-memory store has no retention need;
// parity with the postgres archive job).
func (m *AuditLogMemory) ArchiveOlderThan(context.Context, time.Time, int) (int64, error) {
	return 0, nil
}

func (m *AuditLogMemory) Create(_ context.Context, l *identity.AuditLog) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	l.CreatedAt = time.Now().UTC()
	m.rows[l.ID] = l
	return nil
}

func (m *AuditLogMemory) ListByTarget(_ context.Context, targetType string, targetID uuid.UUID, limit int) ([]identity.AuditLog, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []identity.AuditLog
	for _, l := range m.rows {
		if l.TargetType == targetType && l.TargetID != nil && *l.TargetID == targetID {
			out = append(out, *l)
		}
	}
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *AuditLogMemory) ListRecent(_ context.Context, action, targetType string, limit int) ([]identity.AuditLog, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var all []identity.AuditLog
	for _, l := range m.rows {
		if action != "" && string(l.Action) != action {
			continue
		}
		if targetType != "" && l.TargetType != targetType {
			continue
		}
		all = append(all, *l)
	}
	// newest first
	for i := 0; i < len(all); i++ {
		for j := i + 1; j < len(all); j++ {
			if all[j].CreatedAt.After(all[i].CreatedAt) {
				all[i], all[j] = all[j], all[i]
			}
		}
	}
	if limit > 0 && len(all) > limit {
		all = all[:limit]
	}
	return all, nil
}

var _ identity.AuditLogRepository = (*AuditLogMemory)(nil)

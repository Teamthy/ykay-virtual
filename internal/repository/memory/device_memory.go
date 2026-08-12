package memory

import (
	"context"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// In-memory devices (dev mode / tests).

type DeviceMemory struct {
	mu      sync.RWMutex
	rows    map[uuid.UUID]*identity.Device
	byToken map[string]uuid.UUID // token → device id
}

func NewDeviceMemory() *DeviceMemory {
	return &DeviceMemory{rows: map[uuid.UUID]*identity.Device{}, byToken: map[string]uuid.UUID{}}
}

func (m *DeviceMemory) Create(_ context.Context, d *identity.Device) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	// Upsert by (user, token).
	for _, existing := range m.rows {
		if existing.UserID == d.UserID && existing.Token == d.Token {
			existing.Platform = d.Platform
			existing.AppVersion = d.AppVersion
			existing.LastSeenAt = time.Now().UTC()
			return nil
		}
	}
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	now := time.Now().UTC()
	if d.LastSeenAt.IsZero() {
		d.LastSeenAt = now
	}
	if d.CreatedAt.IsZero() {
		d.CreatedAt = now
	}
	m.rows[d.ID] = d
	m.byToken[d.Token] = d.ID
	return nil
}

func (m *DeviceMemory) ListByUser(_ context.Context, userID uuid.UUID) ([]identity.Device, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []identity.Device{}
	for _, d := range m.rows {
		if d.UserID == userID {
			out = append(out, *d)
		}
	}
	return out, nil
}

func (m *DeviceMemory) Delete(_ context.Context, id, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	d, ok := m.rows[id]
	if !ok || d.UserID != userID {
		return domain.ErrNotFound
	}
	delete(m.rows, id)
	delete(m.byToken, d.Token)
	return nil
}

func (m *DeviceMemory) DeleteByToken(_ context.Context, token string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if id, ok := m.byToken[token]; ok {
		delete(m.rows, id)
		delete(m.byToken, token)
	}
	return nil
}

var _ identity.DeviceRepository = (*DeviceMemory)(nil)

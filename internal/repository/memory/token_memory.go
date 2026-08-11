package memory

import (
	"context"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// In-memory auth tokens (tests / dev fallback).

type AuthTokenMemory struct {
	mu   sync.RWMutex
	rows map[string]*identity.AuthToken // by token hash
}

func NewAuthTokenMemory() *AuthTokenMemory {
	return &AuthTokenMemory{rows: map[string]*identity.AuthToken{}}
}

func (m *AuthTokenMemory) Create(_ context.Context, t *identity.AuthToken) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	t.CreatedAt = time.Now().UTC()
	m.rows[t.TokenHash] = t
	return nil
}

func (m *AuthTokenMemory) FindByHash(_ context.Context, tokenHash string) (*identity.AuthToken, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if t, ok := m.rows[tokenHash]; ok {
		cp := *t
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *AuthTokenMemory) Consume(_ context.Context, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, t := range m.rows {
		if t.ID == id && t.ConsumedAt == nil {
			now := time.Now().UTC()
			t.ConsumedAt = &now
			return nil
		}
	}
	return nil
}

func (m *AuthTokenMemory) InvalidateAllForUser(_ context.Context, userID uuid.UUID, purpose identity.AuthTokenPurpose) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC()
	for _, t := range m.rows {
		if t.UserID == userID && t.Purpose == purpose && t.ConsumedAt == nil {
			t.ConsumedAt = &now
		}
	}
	return nil
}

var _ identity.AuthTokenRepository = (*AuthTokenMemory)(nil)

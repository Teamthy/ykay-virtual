package memory

import (
	"context"
	"sync"
	"time"

	"ykay-virtual/internal/domain"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/identity"
)

// EmailDripMemory — in-memory EmailDripRepository (dev/tests).
type EmailDripMemory struct {
	mu   sync.Mutex
	rows map[string]identity.EmailDrip // key: userID|sequence|step
}

func NewEmailDripMemory() *EmailDripMemory {
	return &EmailDripMemory{rows: make(map[string]identity.EmailDrip)}
}

func keyDrip(userID uuid.UUID, sequence string, step int) string {
	return userID.String() + "|" + sequence + "|" + string(rune('0'+step))
}

func (m *EmailDripMemory) Create(_ context.Context, d *identity.EmailDrip) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	k := keyDrip(d.UserID, d.Sequence, d.Step)
	if _, ok := m.rows[k]; ok {
		return domain.ErrAlreadyExists
	}
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	if d.SentAt.IsZero() {
		d.SentAt = time.Now().UTC()
	}
	m.rows[k] = *d
	return nil
}

func (m *EmailDripMemory) ExistsStep(_ context.Context, userID uuid.UUID, sequence string, step int) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.rows[keyDrip(userID, sequence, step)]
	return ok, nil
}

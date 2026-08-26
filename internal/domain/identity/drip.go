package identity

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// EmailDrip — lifecycle email sequence state (migration 000062). One row per
// (user, sequence, step) ever sent; the UNIQUE(user_id, sequence, step)
// constraint is the double-send guard.
type EmailDrip struct {
	ID     uuid.UUID `json:"id"`
	UserID uuid.UUID `json:"user_id"`
	// Sequence groups a drip programme, e.g. "onboarding".
	Sequence string `json:"sequence"`
	// Step is 1-based position in the sequence.
	Step      int       `json:"step"`
	SentAt    time.Time `json:"sent_at"`
	CreatedAt time.Time `json:"created_at"`
}

// EmailDripRepository — storage for drip sends.
type EmailDripRepository interface {
	Create(ctx context.Context, d *EmailDrip) error // ErrAlreadyExists on duplicate send
	// ExistsStep reports whether (user, sequence, step) was already sent.
	ExistsStep(ctx context.Context, userID uuid.UUID, sequence string, step int) (bool, error)
}

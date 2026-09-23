// Package digest — weekly parent progress digest (feature 3, migration 000076).
// One row per parent; the worker collects each child's real activity since
// last_sent_at and emails an honest summary. No fabricated metrics.
package digest

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// ErrNotFound — no prefs row yet for this parent (service supplies a default).
var ErrNotFound = errors.New("digest prefs not found")

// Prefs — a parent's weekly digest preference + last-sent watermark.
type Prefs struct {
	ParentUserID uuid.UUID
	Enabled      bool
	LastSentAt   *time.Time
	UpdatedAt    time.Time
}

// Repository — persistence for parent digest prefs.
// Implementations: internal/repository/postgres, internal/repository/memory.
type Repository interface {
	// Get returns ErrNotFound when the parent has never toggled the setting.
	Get(ctx context.Context, parentUserID uuid.UUID) (*Prefs, error)
	// Upsert creates or updates the parent's prefs row (keyed on parent_user_id).
	Upsert(ctx context.Context, p *Prefs) error
	// ListEnabled returns every parent who has the digest switched on.
	ListEnabled(ctx context.Context) ([]Prefs, error)
}

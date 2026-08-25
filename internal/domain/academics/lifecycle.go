package academics

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ProgrammeLifecycle — narrow publish-workflow surface (G5.3). Kept separate
// from ProgrammeRepository so the catalogue scans never carry the workflow
// columns.
type ProgrammeLifecycle struct {
	ID          uuid.UUID       `json:"id"`
	Status      ProgrammeStatus `json:"status"`
	PublishedAt *time.Time      `json:"published_at,omitempty"`
	ReviewDueAt *time.Time      `json:"review_due_at,omitempty"`
}

// ProgrammeLifecycleRepository — admin programme operations: create (DRAFT)
// + publish/unpublish with review cadence.
type ProgrammeLifecycleRepository interface {
	GetLifecycle(ctx context.Context, id uuid.UUID) (*ProgrammeLifecycle, error)
	SetLifecycle(ctx context.Context, l ProgrammeLifecycle) error
	// CreateProgramme inserts a new programme (always DRAFT; slug uniqueness
	// is enforced by the store). Fills ID/CreatedAt/UpdatedAt.
	CreateProgramme(ctx context.Context, p *Programme) error
	// UpdateProgramme saves editable fields (title/summary/description/pricing/
	// featured). Slug and status keep their dedicated flows.
	UpdateProgramme(ctx context.Context, p *Programme) error
}

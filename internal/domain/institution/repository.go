package institution

import (
	"context"

	"github.com/google/uuid"
)

// InstitutionRepository — full B2B surface (migration 000003).
// Create is the public B2B flow (/for-schools, /corporate-training); the
// creator optionally becomes the OWNER membership.

type InstitutionRepository interface {
	List(ctx context.Context, params InstitutionListParams) ([]Institution, int64, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Institution, error)
	Create(ctx context.Context, i *Institution) error
	AddMembership(ctx context.Context, m *Membership) error
}

type InstitutionListParams struct {
	Search   string
	Type     string
	Page     int
	PageSize int
	Sort     string
}

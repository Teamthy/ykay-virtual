package institution

import (
	"context"

	"github.com/google/uuid"
)

// InstitutionRepository — admin read surface for B2B accounts
// (migration 000003_institution; /for-schools + /corporate-training flow).

type InstitutionRepository interface {
	List(ctx context.Context, params InstitutionListParams) ([]Institution, int64, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Institution, error)
}

type InstitutionListParams struct {
	Search   string
	Type     string
	Page     int
	PageSize int
	Sort     string
}

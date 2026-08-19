package admissions

import (
	"context"

	"github.com/google/uuid"
)

// Repository — storage for admissions applications.
type Repository interface {
	Create(ctx context.Context, a *Application) error
	GetByID(ctx context.Context, id uuid.UUID) (*Application, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status Status, reviewedBy *uuid.UUID) error
	// ListByParent returns a family's applications, newest first.
	ListByParent(ctx context.Context, parentUserID uuid.UUID, limit int) ([]Application, error)
	// ListAll returns the admin admissions queue (filterable by status).
	ListAll(ctx context.Context, status string, page, pageSize int) ([]Application, int64, error)
}

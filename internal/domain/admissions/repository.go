package admissions

import (
	"context"

	"github.com/google/uuid"
)

// Repository — storage for admissions applications (+ supporting documents).
type Repository interface {
	Create(ctx context.Context, a *Application) error
	GetByID(ctx context.Context, id uuid.UUID) (*Application, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status Status, reviewedBy *uuid.UUID) error
	// SetOffer stores the offer fee/currency/message when an application is
	// moved to OFFERED.
	SetOffer(ctx context.Context, id uuid.UUID, fee *float64, currency *string, message *string) error
	// ListByParent returns a family's applications, newest first.
	ListByParent(ctx context.Context, parentUserID uuid.UUID, limit int) ([]Application, error)
	// ListAll returns the admin admissions queue (filterable by status).
	ListAll(ctx context.Context, status string, page, pageSize int) ([]Application, int64, error)

	// --- Documents ---
	AddDocument(ctx context.Context, d *Document) error
	ListDocuments(ctx context.Context, applicationID uuid.UUID) ([]Document, error)
	GetDocument(ctx context.Context, id uuid.UUID) (*Document, error)
	RemoveDocument(ctx context.Context, id uuid.UUID) error
}

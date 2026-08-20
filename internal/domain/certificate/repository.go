package certificate

import (
	"context"

	"github.com/google/uuid"
)

// CertificateRepository — storage for issued certificates.
type CertificateRepository interface {
	Create(ctx context.Context, c *Certificate) error
	GetByID(ctx context.Context, id uuid.UUID) (*Certificate, error)
	// GetByCredential returns a certificate by its public credential number
	// (for verification).
	GetByCredential(ctx context.Context, number string) (*Certificate, error)
	// GetForStudentAndCohort returns an existing certificate for the learner +
	// cohort (nil when none), so issuance is idempotent.
	GetForStudentAndCohort(ctx context.Context, studentProfileID, cohortID uuid.UUID) (*Certificate, error)
	// ListByStudent returns a learner's certificates, newest first.
	ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]Certificate, error)
	// ListByStudents batch-loads certificates for many learners (parent
	// portal — no N+1). `limit` is applied per student.
	ListByStudents(ctx context.Context, studentProfileIDs []uuid.UUID, limit int) ([]Certificate, error)
}

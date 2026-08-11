package booking

import (
	"context"

	"github.com/google/uuid"
)

// Repository interfaces for the booking + escrow engine (migrations
// 000006_booking, 000007_payment). Implementations:
// internal/repository/postgres (transactional), internal/repository/memory (fakes).

type CohortRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Cohort, error)
	// GetByIDForUpdate locks the row (SELECT ... FOR UPDATE) so concurrent
	// enrollments cannot oversubscribe a cohort (SLO: no overbooking).
	GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*Cohort, error)
	IncrementEnrolledCount(ctx context.Context, id uuid.UUID, delta int) error
}

type CohortEnrollmentRepository interface {
	Create(ctx context.Context, e *CohortEnrollment) error
	GetByCohortAndStudent(ctx context.Context, cohortID, studentProfileID uuid.UUID) (*CohortEnrollment, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status EnrollmentStatus) error
}

type PrivateTuitionRequestRepository interface {
	Create(ctx context.Context, r *PrivateTuitionRequest) error
	GetByID(ctx context.Context, id uuid.UUID) (*PrivateTuitionRequest, error)
}

type PrivatePackageRepository interface {
	Create(ctx context.Context, p *PrivatePackage) error
	GetByID(ctx context.Context, id uuid.UUID) (*PrivatePackage, error)
}

// StudentProfileReader lets the booking service verify the parent→student
// link (object-level authorization enforced in the service layer, never UI).
type StudentProfileReader interface {
	StudentExistsForParent(ctx context.Context, studentID, parentUserID uuid.UUID) (bool, error)
}

type TutorProfileReader interface {
	TutorCanTeach(ctx context.Context, tutorProfileID uuid.UUID, subjectID uuid.UUID) (bool, error)
}

// LessonRepository — read side for lessons (dashboards, scheduling).
type LessonRepository interface {
	ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]Lesson, error)
	ListByTutor(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]Lesson, error)
}

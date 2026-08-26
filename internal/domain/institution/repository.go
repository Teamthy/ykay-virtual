package institution

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// InstitutionRepository — full B2B surface (migration 000003) + the
// self-serve console (memberships, linked students, profile management).
// Create is the public B2B flow (/for-schools, /corporate-training); the
// creator optionally becomes the OWNER membership.

type InstitutionRepository interface {
	List(ctx context.Context, params InstitutionListParams) ([]Institution, int64, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Institution, error)
	GetBySlug(ctx context.Context, slug string) (*Institution, error)
	Create(ctx context.Context, i *Institution) error
	Update(ctx context.Context, i *Institution) error
	SetActive(ctx context.Context, id uuid.UUID, active bool) error
	SetVerified(ctx context.Context, id uuid.UUID, verifiedAt *time.Time) error

	AddMembership(ctx context.Context, m *Membership) error
	GetMembership(ctx context.Context, institutionID, userID uuid.UUID) (*Membership, error)
	ListMemberships(ctx context.Context, institutionID uuid.UUID) ([]Membership, error)
	ListMembershipsByUser(ctx context.Context, userID uuid.UUID) ([]Membership, error)
	SetMembershipRole(ctx context.Context, institutionID, userID uuid.UUID, role MembershipRole) error
	RemoveMembership(ctx context.Context, institutionID, userID uuid.UUID) error

	ListStudents(ctx context.Context, institutionID uuid.UUID) ([]InstitutionStudent, error)
	AddStudent(ctx context.Context, s *InstitutionStudent) error
	RemoveStudent(ctx context.Context, institutionID, studentProfileID uuid.UUID) error
}

type InstitutionListParams struct {
	Search   string
	Type     string
	Page     int
	PageSize int
	Sort     string
}

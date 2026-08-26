package institution

import (
	"github.com/google/uuid"
	"time"
)

type InstitutionType string

const (
	TypeSchool    InstitutionType = "SCHOOL"
	TypeCorporate InstitutionType = "CORPORATE"
	TypeGov       InstitutionType = "GOVERNMENT"
	TypeNGO       InstitutionType = "NGO"
	TypeOther     InstitutionType = "OTHER"
)

type MembershipRole string

const (
	RoleOwner   MembershipRole = "OWNER"
	RoleAdmin   MembershipRole = "ADMIN"
	RoleTeacher MembershipRole = "TEACHER"
	RoleStudent MembershipRole = "STUDENT"
	RoleBilling MembershipRole = "BILLING"
)

type Institution struct {
	ID          uuid.UUID       `json:"id"`
	Name        string          `json:"name"`
	Slug        string          `json:"slug"`
	Type        InstitutionType `json:"type"`
	Email       *string         `json:"email,omitempty"`
	Phone       *string         `json:"phone,omitempty"`
	Website     *string         `json:"website,omitempty"`
	LocationID  *uuid.UUID      `json:"location_id,omitempty"`
	LogoURL     *string         `json:"logo_url,omitempty"`
	Description *string         `json:"description,omitempty"`
	VerifiedAt  *time.Time      `json:"verified_at,omitempty"`
	IsActive    bool            `json:"is_active"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type Membership struct {
	ID            uuid.UUID      `json:"id"`
	InstitutionID uuid.UUID      `json:"institution_id"`
	UserID        uuid.UUID      `json:"user_id"`
	Role          MembershipRole `json:"role"`
	InvitedBy     *uuid.UUID     `json:"invited_by,omitempty"`
	JoinedAt      *time.Time     `json:"joined_at,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
}

// InstitutionStudent — a learner linked to an institution
// (institution_students, migration 000003). EnrollmentRef is an optional
// school-internal reference number.
type InstitutionStudent struct {
	ID               uuid.UUID `json:"id"`
	InstitutionID    uuid.UUID `json:"institution_id"`
	StudentProfileID uuid.UUID `json:"student_profile_id"`
	EnrollmentRef    *string   `json:"enrollment_ref,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

// MembershipView — a membership plus its institution, so a user can list the
// schools/orgs they belong to and their role in each in one round-trip.
type MembershipView struct {
	Membership
	Institution *Institution `json:"institution"`
}

// CanManage reports whether a membership role may manage the institution's
// profile, members and students (OWNER + ADMIN).
func (m Membership) CanManage() bool {
	return m.Role == RoleOwner || m.Role == RoleAdmin
}

// IsOwner reports whether the membership is the institution OWNER.
func (m Membership) IsOwner() bool {
	return m.Role == RoleOwner
}

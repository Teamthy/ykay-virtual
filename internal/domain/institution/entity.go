package institution

import (
	"time"
	"github.com/google/uuid"
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

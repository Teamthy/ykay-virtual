package identity

import (
	"time"

	"github.com/google/uuid"
)

// Entities — no framework imports per AGENTS.md

type UserStatus string

const (
	UserStatusPending  UserStatus = "PENDING_VERIFICATION"
	UserStatusActive   UserStatus = "ACTIVE"
	UserStatusSuspended UserStatus = "SUSPENDED"
	UserStatusDeleted  UserStatus = "DELETED"
)

type User struct {
	ID              uuid.UUID  `json:"id"`
	Email           string     `json:"email"`
	Phone           *string    `json:"phone,omitempty"`
	PasswordHash    string     `json:"-"`
	Status          UserStatus `json:"status"`
	Timezone        string     `json:"timezone"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
	PhoneVerifiedAt *time.Time `json:"phone_verified_at,omitempty"`
	LastLoginAt     *time.Time `json:"last_login_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type Role struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type UserRole struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	RoleID    uuid.UUID `json:"role_id"`
	GrantedBy *uuid.UUID `json:"granted_by,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type Session struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	TokenHash string     `json:"-"`
	IPAddress *string    `json:"ip_address,omitempty"`
	UserAgent *string    `json:"user_agent,omitempty"`
	ExpiresAt time.Time  `json:"expires_at"`
	CreatedAt time.Time  `json:"created_at"`
	RotatedAt *time.Time `json:"rotated_at,omitempty"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`
}

// ParentStudentLink enforces object-level authz: parent can only access linked students
type ParentProfile struct {
	ID            uuid.UUID `json:"id"`
	UserID        uuid.UUID `json:"user_id"`
	FirstName     string    `json:"first_name"`
	LastName      string    `json:"last_name"`
	WhatsappNumber *string  `json:"whatsapp_number,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type StudentProfile struct {
	ID              uuid.UUID  `json:"id"`
	UserID          *uuid.UUID `json:"user_id,omitempty"`
	FirstName       string     `json:"first_name"`
	LastName        string     `json:"last_name"`
	DateOfBirth     *time.Time `json:"date_of_birth,omitempty"`
	AgeBand         *string    `json:"age_band,omitempty"`
	SchoolName      *string    `json:"school_name,omitempty"`
	CurrentLevel    *string    `json:"current_level,omitempty"`
	GuardianConsent bool       `json:"guardian_consent"`
	Timezone        string     `json:"timezone"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type ParentStudentLink struct {
	ID               uuid.UUID  `json:"id"`
	ParentUserID     uuid.UUID  `json:"parent_user_id"`
	StudentProfileID uuid.UUID  `json:"student_profile_id"`
	Relationship     string     `json:"relationship"`
	IsPrimary        bool       `json:"is_primary"`
	VerifiedAt       *time.Time `json:"verified_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

type AuditAction string

const (
	AuditCreate              AuditAction = "CREATE"
	AuditUpdate              AuditAction = "UPDATE"
	AuditDelete              AuditAction = "DELETE"
	AuditLogin               AuditAction = "LOGIN"
	AuditPayment             AuditAction = "PAYMENT"
	AuditVettingStatusChange AuditAction = "VETTING_STATUS_CHANGE"
	AuditRoleChange          AuditAction = "ROLE_CHANGE"
	AuditPayout              AuditAction = "PAYOUT"
	AuditAccess              AuditAction = "ACCESS"
)

type AuditLog struct {
	ID          uuid.UUID   `json:"id"`
	ActorUserID *uuid.UUID  `json:"actor_user_id,omitempty"`
	Action      AuditAction `json:"action"`
	TargetType  string      `json:"target_type"`
	TargetID    *uuid.UUID  `json:"target_id,omitempty"`
	BeforeJSON  *string     `json:"before_json,omitempty"`
	AfterJSON   *string     `json:"after_json,omitempty"`
	IPAddress   *string     `json:"ip_address,omitempty"`
	RequestID   *string     `json:"request_id,omitempty"`
	TraceID     *string     `json:"trace_id,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
}

// Business rules
func (u *User) IsActive() bool {
	return u.Status == UserStatusActive
}

func (u *User) CanLogin() bool {
	return u.Status == UserStatusActive || u.Status == UserStatusPending
}

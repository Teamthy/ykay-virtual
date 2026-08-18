package identity

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Repository interfaces for identity + sessions (migration 000001_identity).
// Implementations: internal/repository/postgres, internal/repository/memory.
// Auth flows run through the service layer; sessions are httpOnly-cookie bound
// (token_hash stored, raw token only ever in the cookie).

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
	Update(ctx context.Context, user *User) error
	UpdateLastLogin(ctx context.Context, id uuid.UUID, at time.Time) error
	// SetOnboarded marks the first-time wizard complete (000031).
	SetOnboarded(ctx context.Context, id uuid.UUID, at time.Time) error
	// ListUsers returns a paginated, filtered list of users with roles, used by
	// the admin user-management console (SUPER_ADMIN). total is the count
	// ignoring pagination. search matches email/name; status filters the
	// account status (empty = any).
	ListUsers(ctx context.Context, search, status string, offset, limit int) ([]UserWithRoles, int, error)
	// SetStatus activates/suspends a user account. Returns ErrNotFound when the
	// user does not exist.
	SetStatus(ctx context.Context, id uuid.UUID, status string) error
}

type SessionRepository interface {
	Create(ctx context.Context, session *Session) error
	FindByTokenHash(ctx context.Context, tokenHash string) (*Session, error)
	Revoke(ctx context.Context, id uuid.UUID) error
	RevokeAllForUser(ctx context.Context, userID uuid.UUID) error
	DeleteExpired(ctx context.Context) (int64, error)
}

type RoleRepository interface {
	FindByName(ctx context.Context, name string) (*Role, error)
	AssignToUser(ctx context.Context, userID, roleID uuid.UUID) error
	RolesForUser(ctx context.Context, userID uuid.UUID) ([]Role, error)
	// RemoveAllForUser — deletes every role grant for the user (used by the
	// self-service "set my primary role" onboarding step).
	RemoveAllForUser(ctx context.Context, userID uuid.UUID) error
	// ListRoles returns every role defined on the platform (admin UI).
	ListRoles(ctx context.Context) ([]Role, error)
	// RemoveRoleForUser revokes a single named role from a user (no-op if the
	// grant does not exist).
	RemoveRoleForUser(ctx context.Context, userID uuid.UUID, roleName string) error
}

type ParentProfileRepository interface {
	Create(ctx context.Context, profile *ParentProfile) error
	FindByUserID(ctx context.Context, userID uuid.UUID) (*ParentProfile, error)
}

type StudentProfileRepository interface {
	Create(ctx context.Context, profile *StudentProfile) error
	FindByID(ctx context.Context, id uuid.UUID) (*StudentProfile, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) (*StudentProfile, error)
	ListByParentUserID(ctx context.Context, parentUserID uuid.UUID) ([]StudentProfile, error)
}

type ParentStudentLinkRepository interface {
	Create(ctx context.Context, link *ParentStudentLink) error
	Exists(ctx context.Context, parentUserID, studentProfileID uuid.UUID) (bool, error)
}

type AuditLogRepository interface {
	Create(ctx context.Context, log *AuditLog) error
	ListByTarget(ctx context.Context, targetType string, targetID uuid.UUID, limit int) ([]AuditLog, error)
	// ArchiveOlderThan moves audit rows older than cutoff into the archive
	// table in bounded batches (G7.3); returns the number moved.
	ArchiveOlderThan(ctx context.Context, cutoff time.Time, batchSize int) (int64, error)
}

type AuditService interface {
	Log(ctx context.Context, actorID *uuid.UUID, action AuditAction, targetType string, targetID *uuid.UUID, before, after *string, reqID, traceID *string) error
	// LogStateChange serializes structured before/after state for money/access
	// mutations (implemented by internal/service.AuditService).
	LogStateChange(ctx context.Context, actorID *uuid.UUID, action AuditAction, targetType string, targetID *uuid.UUID, before, after any, reqID, traceID *string) error
}

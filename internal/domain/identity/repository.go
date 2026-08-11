package identity

import (
	"context"

	"github.com/google/uuid"
)

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*User, error)
	Update(ctx context.Context, user *User) error
}

type SessionRepository interface {
	Create(ctx context.Context, session *Session) error
	FindByTokenHash(ctx context.Context, tokenHash string) (*Session, error)
	Revoke(ctx context.Context, id uuid.UUID) error
	DeleteExpired(ctx context.Context) (int64, error)
}

type ParentProfileRepository interface {
	Create(ctx context.Context, profile *ParentProfile) error
	FindByUserID(ctx context.Context, userID uuid.UUID) (*ParentProfile, error)
}

type StudentProfileRepository interface {
	Create(ctx context.Context, profile *StudentProfile) error
	FindByID(ctx context.Context, id uuid.UUID) (*StudentProfile, error)
	ListByParentUserID(ctx context.Context, parentUserID uuid.UUID) ([]StudentProfile, error)
}

type ParentStudentLinkRepository interface {
	Create(ctx context.Context, link *ParentStudentLink) error
	Exists(ctx context.Context, parentUserID, studentProfileID uuid.UUID) (bool, error)
}

type AuditLogRepository interface {
	Create(ctx context.Context, log *AuditLog) error
	ListByTarget(ctx context.Context, targetType string, targetID uuid.UUID, limit int) ([]AuditLog, error)
}

type AuditService interface {
	Log(ctx context.Context, actorID *uuid.UUID, action AuditAction, targetType string, targetID *uuid.UUID, before, after *string, reqID, traceID *string) error
}

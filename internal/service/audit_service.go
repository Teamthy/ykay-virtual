package service

import (
	"context"
	"encoding/json"
	"time"

	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// AuditService records every state change affecting money, access or
// tutor-status (per AGENTS.md). Called from services, never from handlers.

type AuditService struct {
	repo identity.AuditLogRepository
}

func NewAuditService(repo identity.AuditLogRepository) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) Log(ctx context.Context, actorID *uuid.UUID, action identity.AuditAction,
	targetType string, targetID *uuid.UUID, before, after *string, reqID, traceID *string) error {

	entry := &identity.AuditLog{
		ID:          uuid.New(),
		ActorUserID: actorID,
		Action:      action,
		TargetType:  targetType,
		TargetID:    targetID,
		BeforeJSON:  before,
		AfterJSON:   after,
		RequestID:   reqID,
		TraceID:     traceID,
	}
	return s.repo.Create(ctx, entry)
}

// LogStateChange is a convenience for struct state transitions: it serializes
// before/after so every money/access mutation is attributable.
func (s *AuditService) LogStateChange(ctx context.Context, actorID *uuid.UUID,
	action identity.AuditAction, targetType string, targetID *uuid.UUID, before, after any, reqID, traceID *string) error {

	beforeJSON, err := json.Marshal(before)
	if err != nil {
		beforeJSON = []byte("{}")
	}
	afterJSON, err := json.Marshal(after)
	if err != nil {
		afterJSON = []byte("{}")
	}
	b := string(beforeJSON)
	a := string(afterJSON)
	return s.Log(ctx, actorID, action, targetType, targetID, &b, &a, reqID, traceID)
}

var _ identity.AuditService = (*AuditService)(nil)

func nowPtr() time.Time { return time.Now().UTC() }

// strPtr returns a pointer to s (shared string helper).
func strPtr(s string) *string { return &s }

package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// AuditLogRepo — persists every audit entry created by the AuditService.

type AuditLogRepo struct{ db TxQuerier }

func NewAuditLogRepo(db TxQuerier) *AuditLogRepo { return &AuditLogRepo{db: db} }

func (r *AuditLogRepo) Create(ctx context.Context, log *identity.AuditLog) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, before_json, after_json, ip_address, request_id, trace_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, created_at`,
		log.ActorUserID, log.Action, log.TargetType, log.TargetID,
		log.BeforeJSON, log.AfterJSON, log.IPAddress, log.RequestID, log.TraceID,
	).Scan(&log.ID, &log.CreatedAt)
	if err != nil {
		return fmt.Errorf("create audit log: %w", err)
	}
	return nil
}

func (r *AuditLogRepo) ListByTarget(ctx context.Context, targetType string, targetID uuid.UUID, limit int) ([]identity.AuditLog, error) {
	if limit < 1 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, actor_user_id, action, target_type, target_id, before_json, after_json, ip_address, request_id, trace_id, created_at
		FROM audit_logs WHERE target_type = $1 AND target_id = $2 ORDER BY created_at DESC LIMIT $3`,
		targetType, targetID, limit)
	if err != nil {
		return nil, fmt.Errorf("list audit logs: %w", err)
	}
	defer rows.Close()
	out := []identity.AuditLog{}
	for rows.Next() {
		var l identity.AuditLog
		var actor, target uuidNull
		var before, after, ip, reqID, trace sql.NullString
		if err := rows.Scan(&l.ID, &actor, &l.Action, &l.TargetType, &target, &before, &after,
			&ip, &reqID, &trace, &l.CreatedAt); err != nil {
			return nil, err
		}
		if actor.Valid {
			l.ActorUserID = &actor.UUID
		}
		if target.Valid {
			l.TargetID = &target.UUID
		}
		if before.Valid {
			l.BeforeJSON = &before.String
		}
		if after.Valid {
			l.AfterJSON = &after.String
		}
		if ip.Valid {
			l.IPAddress = &ip.String
		}
		if reqID.Valid {
			l.RequestID = &reqID.String
		}
		if trace.Valid {
			l.TraceID = &trace.String
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

var _ identity.AuditLogRepository = (*AuditLogRepo)(nil)

// --- Object-level authorization readers (enforced in service layer) ---

type StudentLinkRepo struct{ db TxQuerier }

func NewStudentLinkRepo(db TxQuerier) *StudentLinkRepo { return &StudentLinkRepo{db: db} }

// StudentExistsForParent — parent→student link check per AGENTS.md:
// "parent→linked students only ... enforced in service layer not UI".
func (r *StudentLinkRepo) StudentExistsForParent(ctx context.Context, studentID, parentUserID uuid.UUID) (bool, error) {
	var one int
	err := r.db.QueryRowContext(ctx, `
		SELECT 1 FROM parent_student_links
		WHERE student_profile_id = $1 AND parent_user_id = $2 LIMIT 1`, studentID, parentUserID).Scan(&one)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("check parent student link: %w", err)
	}
	return true, nil
}

var _ interface {
	StudentExistsForParent(ctx context.Context, studentID, parentUserID uuid.UUID) (bool, error)
} = (*StudentLinkRepo)(nil)

type TutorSubjectCheckRepo struct{ db TxQuerier }

func NewTutorSubjectCheckRepo(db TxQuerier) *TutorSubjectCheckRepo {
	return &TutorSubjectCheckRepo{db: db}
}

// TutorCanTeach — an approved tutor must have an approved tutor_subject row
// for the subject before a private booking can be created.
func (r *TutorSubjectCheckRepo) TutorCanTeach(ctx context.Context, tutorProfileID, subjectID uuid.UUID) (bool, error) {
	var one int
	err := r.db.QueryRowContext(ctx, `
		SELECT 1 FROM tutor_subjects
		WHERE tutor_profile_id = $1 AND subject_id = $2 AND is_approved = TRUE LIMIT 1`,
		tutorProfileID, subjectID).Scan(&one)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("check tutor subject: %w", err)
	}
	return true, nil
}

// Domain error mapping helpers used by postgres repos.
func mapNotFound(err error, msg string) error {
	if errors.Is(err, sql.ErrNoRows) {
		return domain.ErrNotFound
	}
	return fmt.Errorf("%s: %w", msg, err)
}

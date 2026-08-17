package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// AuditLogRepo — persists every audit entry created by the AuditService.

type AuditLogRepo struct{ db TxQuerier }

// ArchiveOlderThan — G7.3: moves expired audit rows to audit_logs_archive
// in bounded batches. Idempotent: the archive insert is ON CONFLICT-safe,
// so a crashed/interrupted run resumes cleanly on the next pass.
func (r *AuditLogRepo) ArchiveOlderThan(ctx context.Context, cutoff time.Time, batchSize int) (int64, error) {
	if batchSize < 1 || batchSize > 10000 {
		batchSize = 1000
	}
	var moved int64
	for {
		res, err := r.db.ExecContext(ctx, `
			INSERT INTO audit_logs_archive
			SELECT * FROM audit_logs
			WHERE created_at < $1
			ORDER BY created_at ASC
			LIMIT $2
			ON CONFLICT (id) DO NOTHING`, cutoff, batchSize)
		if err != nil {
			return moved, fmt.Errorf("archive audit logs (insert): %w", err)
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			break
		}
		if _, err := r.db.ExecContext(ctx, `
			DELETE FROM audit_logs
			WHERE id IN (
				SELECT id FROM audit_logs
				WHERE created_at < $1
				ORDER BY created_at ASC
				LIMIT $2
			)`, cutoff, batchSize); err != nil {
			return moved, fmt.Errorf("archive audit logs (delete): %w", err)
		}
		moved += n
		if n < int64(batchSize) {
			break
		}
	}
	return moved, nil
}

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

// StudentBookingAccess — one round trip that resolves self-ownership, minor
// facts and guardian links for a student profile relative to the actor
// (Phase 3 self-enrollment + <17 gating).
func (r *StudentLinkRepo) StudentBookingAccess(ctx context.Context, studentID, actorUserID uuid.UUID) (booking.StudentBookingAccess, error) {
	var acc booking.StudentBookingAccess
	var userID *uuid.UUID
	var dob *time.Time
	var consent bool
	err := r.db.QueryRowContext(ctx, `
		SELECT sp.user_id, sp.date_of_birth, sp.guardian_consent,
		       EXISTS(SELECT 1 FROM parent_student_links l WHERE l.student_profile_id = sp.id AND l.parent_user_id = $2),
		       EXISTS(SELECT 1 FROM parent_student_links l WHERE l.student_profile_id = sp.id)
		FROM student_profiles sp WHERE sp.id = $1`, studentID, actorUserID).
		Scan(&userID, &dob, &consent, &acc.ParentLinked, &acc.HasLinkedParent)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return acc, nil // unknown profile → no access
		}
		return acc, fmt.Errorf("student booking access: %w", err)
	}
	acc.SelfOwned = userID != nil && *userID == actorUserID
	acc.DateOfBirth = dob
	acc.GuardianConsent = consent
	return acc, nil
}

var _ booking.StudentProfileReader = (*StudentLinkRepo)(nil)

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

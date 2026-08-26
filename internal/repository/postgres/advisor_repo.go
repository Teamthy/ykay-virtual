package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/advisor"
)

// AdvisorRepo — postgres implementation of advisor.Repository (migration
// 000067): Plus named Learning Advisor + learning plan.
type AdvisorRepo struct{ db TxQuerier }

func NewAdvisorRepo(db TxQuerier) *AdvisorRepo { return &AdvisorRepo{db: db} }

func (r *AdvisorRepo) Assign(ctx context.Context, a *advisor.Assignment) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO plus_advisors (user_id, advisor_user_id, note, assigned_by)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (user_id) DO UPDATE SET
			advisor_user_id = EXCLUDED.advisor_user_id,
			note = EXCLUDED.note,
			assigned_by = EXCLUDED.assigned_by,
			updated_at = NOW()
		RETURNING id, created_at, updated_at`,
		a.UserID, a.AdvisorUserID, a.Note, a.AssignedBy).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return fmt.Errorf("assign plus advisor: %w", err)
	}
	return nil
}

func (r *AdvisorRepo) GetByUser(ctx context.Context, userID uuid.UUID) (*advisor.Assignment, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, advisor_user_id, note, assigned_by, created_at, updated_at
		FROM plus_advisors WHERE user_id = $1`, userID)
	a, err := scanAssignment(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

func (r *AdvisorRepo) UpdateNote(ctx context.Context, id uuid.UUID, note *string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE plus_advisors SET note = $2, updated_at = NOW() WHERE id = $1`, id, note)
	if err != nil {
		return fmt.Errorf("update advisor note: %w", err)
	}
	return nil
}

func scanAssignment(row interface{ Scan(...any) error }) (*advisor.Assignment, error) {
	var a advisor.Assignment
	var note, assignedBy sql.NullString
	if err := row.Scan(&a.ID, &a.UserID, &a.AdvisorUserID, &note, &assignedBy, &a.CreatedAt, &a.UpdatedAt); err != nil {
		return nil, err
	}
	if note.Valid {
		a.Note = &note.String
	}
	if assignedBy.Valid {
		if id, err := uuid.Parse(assignedBy.String); err == nil {
			a.AssignedBy = &id
		}
	}
	return &a, nil
}

func (r *AdvisorRepo) UpsertPlan(ctx context.Context, p *advisor.LearningPlan) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO plus_learning_plans (user_id, student_profile_id, goals, focus_areas, recommendations, status, source, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (user_id, student_profile_id) DO UPDATE SET
			goals = EXCLUDED.goals,
			focus_areas = EXCLUDED.focus_areas,
			recommendations = EXCLUDED.recommendations,
			status = EXCLUDED.status,
			source = EXCLUDED.source,
			created_by = EXCLUDED.created_by,
			updated_at = NOW()
		RETURNING id, created_at, updated_at`,
		p.UserID, p.StudentProfileID, p.Goals, p.FocusAreas, p.Recommendations, p.Status, p.Source, p.CreatedBy).
		Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return fmt.Errorf("upsert plus learning plan: %w", err)
	}
	return nil
}

func (r *AdvisorRepo) GetPlan(ctx context.Context, userID, studentProfileID uuid.UUID) (*advisor.LearningPlan, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, student_profile_id, goals, focus_areas, recommendations, status, source, created_by, created_at, updated_at
		FROM plus_learning_plans WHERE user_id = $1 AND student_profile_id = $2`, userID, studentProfileID)
	p := advisor.LearningPlan{}
	var goals, focus, recs, createdBy sql.NullString
	if err := row.Scan(&p.ID, &p.UserID, &p.StudentProfileID, &goals, &focus, &recs, &p.Status, &p.Source, &createdBy, &p.CreatedAt, &p.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	if goals.Valid {
		p.Goals = &goals.String
	}
	if focus.Valid {
		p.FocusAreas = &focus.String
	}
	if recs.Valid {
		p.Recommendations = &recs.String
	}
	if createdBy.Valid {
		if id, err := uuid.Parse(createdBy.String); err == nil {
			p.CreatedBy = &id
		}
	}
	return &p, nil
}

var _ advisor.Repository = (*AdvisorRepo)(nil)

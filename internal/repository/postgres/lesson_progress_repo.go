package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/booking"
)

// LessonProgressRepo — postgres implementation of LessonProgressRepository
// (on-demand video lesson watch state, migration 000035).
type LessonProgressRepo struct{ db TxQuerier }

func NewLessonProgressRepo(db TxQuerier) *LessonProgressRepo { return &LessonProgressRepo{db: db} }

func (r *LessonProgressRepo) Upsert(ctx context.Context, p *booking.LessonProgress) error {
	if p.WatchedAt == nil {
		_, err := r.db.ExecContext(ctx, `
			INSERT INTO lesson_progress (lesson_id, student_profile_id, watched, position_seconds, updated_at)
			VALUES ($1, $2, $3, $4, NOW())
			ON CONFLICT (lesson_id, student_profile_id)
			DO UPDATE SET watched = $3, position_seconds = $4, updated_at = NOW()`,
			p.LessonID, p.StudentProfileID, p.Watched, p.PositionSeconds)
		if err != nil {
			return fmt.Errorf("upsert lesson progress: %w", err)
		}
		return nil
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO lesson_progress (lesson_id, student_profile_id, watched, position_seconds, watched_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (lesson_id, student_profile_id)
		DO UPDATE SET watched = $3, position_seconds = $4, watched_at = $5, updated_at = NOW()`,
		p.LessonID, p.StudentProfileID, p.Watched, p.PositionSeconds, *p.WatchedAt)
	if err != nil {
		return fmt.Errorf("upsert lesson progress: %w", err)
	}
	return nil
}

func (r *LessonProgressRepo) GetByLessonAndStudent(ctx context.Context, lessonID, studentProfileID uuid.UUID) (*booking.LessonProgress, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, lesson_id, student_profile_id, watched, position_seconds, watched_at, created_at, updated_at
		FROM lesson_progress WHERE lesson_id = $1 AND student_profile_id = $2`,
		lessonID, studentProfileID)
	p, err := scanLessonProgressRow(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return p, nil
}

func (r *LessonProgressRepo) ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]booking.LessonProgress, error) {
	if limit < 1 || limit > 200 {
		limit = 100
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, lesson_id, student_profile_id, watched, position_seconds, watched_at, created_at, updated_at
		FROM lesson_progress WHERE student_profile_id = $1 ORDER BY updated_at DESC LIMIT $2`,
		studentProfileID, limit)
	if err != nil {
		return nil, fmt.Errorf("list lesson progress: %w", err)
	}
	defer rows.Close()
	out := []booking.LessonProgress{}
	for rows.Next() {
		p, err := scanLessonProgressRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *p)
	}
	return out, rows.Err()
}

func scanLessonProgressRow(row interface{ Scan(...any) error }) (*booking.LessonProgress, error) {
	var p booking.LessonProgress
	var watchedAt sql.NullTime
	if err := row.Scan(&p.ID, &p.LessonID, &p.StudentProfileID, &p.Watched, &p.PositionSeconds,
		&watchedAt, &p.CreatedAt, &p.UpdatedAt); err != nil {
		return nil, err
	}
	if watchedAt.Valid {
		t := watchedAt.Time
		p.WatchedAt = &t
	}
	return &p, nil
}

var _ booking.LessonProgressRepository = (*LessonProgressRepo)(nil)

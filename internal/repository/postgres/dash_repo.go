package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/dash"
)

// DashRepo — postgres implementation of dash.Repository (migration 000070).
type DashRepo struct{ db TxQuerier }

func NewDashRepo(db TxQuerier) *DashRepo { return &DashRepo{db: db} }

func (r *DashRepo) CreateFeedback(ctx context.Context, f *dash.LessonFeedback) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO lesson_feedback (lesson_id, student_profile_id, rating, comment)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (lesson_id, student_profile_id) DO UPDATE SET
			rating = EXCLUDED.rating, comment = EXCLUDED.comment
		RETURNING id, created_at`,
		f.LessonID, f.StudentProfileID, f.Rating, f.Comment).Scan(&f.ID, &f.CreatedAt)
	if err != nil {
		return fmt.Errorf("create lesson feedback: %w", err)
	}
	return nil
}

func (r *DashRepo) FeedbackRating(ctx context.Context, lessonID, studentProfileID uuid.UUID) (*int, error) {
	var rating int
	err := r.db.QueryRowContext(ctx,
		`SELECT rating FROM lesson_feedback WHERE lesson_id=$1 AND student_profile_id=$2`,
		lessonID, studentProfileID).Scan(&rating)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &rating, nil
}

func (r *DashRepo) GetPrefs(ctx context.Context, userID uuid.UUID) (*dash.Prefs, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT user_id, leaderboard_opt_in, weekly_goal, widgets, updated_at
		FROM dashboard_prefs WHERE user_id = $1`, userID)
	p := dash.Prefs{}
	var widgetsRaw string
	if err := row.Scan(&p.UserID, &p.LeaderboardOptIn, &p.WeeklyGoal, &widgetsRaw, &p.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	_ = json.Unmarshal([]byte(widgetsRaw), &p.Widgets)
	return &p, nil
}

func (r *DashRepo) UpsertPrefs(ctx context.Context, p *dash.Prefs) error {
	widgets, _ := json.Marshal(p.Widgets)
	if p.Widgets == nil {
		widgets = []byte("[]")
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO dashboard_prefs (user_id, leaderboard_opt_in, weekly_goal, widgets, updated_at)
		VALUES ($1,$2,$3,$4,NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			leaderboard_opt_in = EXCLUDED.leaderboard_opt_in,
			weekly_goal = EXCLUDED.weekly_goal,
			widgets = EXCLUDED.widgets,
			updated_at = NOW()`,
		p.UserID, p.LeaderboardOptIn, p.WeeklyGoal, string(widgets))
	if err != nil {
		return fmt.Errorf("upsert dashboard prefs: %w", err)
	}
	return nil
}

func (r *DashRepo) OptedInUserIDs(ctx context.Context, limit int) ([]uuid.UUID, error) {
	if limit < 1 || limit > 200 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx,
		`SELECT user_id FROM dashboard_prefs WHERE leaderboard_opt_in = TRUE LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("list opted-in user ids: %w", err)
	}
	defer rows.Close()
	out := []uuid.UUID{}
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

var _ dash.Repository = (*DashRepo)(nil)

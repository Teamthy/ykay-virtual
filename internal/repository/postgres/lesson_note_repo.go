package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/lessonnote"
)

// PlayerNoteRepo — postgres implementation of lessonnote.Repository (migration
// 000078). Distinct from booking.LessonNote (tutor post-lesson summaries).
type PlayerNoteRepo struct{ db TxQuerier }

func NewPlayerNoteRepo(db TxQuerier) *PlayerNoteRepo { return &PlayerNoteRepo{db: db} }

func (r *PlayerNoteRepo) Add(ctx context.Context, n *lessonnote.PlayerNote) error {
	return r.db.QueryRowContext(ctx, `
		INSERT INTO lesson_player_notes (lesson_id, user_id, role, timestamp_sec, is_bookmark, text)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING id, created_at`,
		n.LessonID, n.UserID, n.Role, n.TimestampSec, n.IsBookmark, n.Text).
		Scan(&n.ID, &n.CreatedAt)
}

func scanPlayerNotes(rows interface{ Next() bool; Scan(...any) error }) ([]lessonnote.PlayerNote, error) {
	out := []lessonnote.PlayerNote{}
	for rows.Next() {
		var n lessonnote.PlayerNote
		if err := rows.Scan(&n.ID, &n.LessonID, &n.UserID, &n.Role, &n.TimestampSec, &n.IsBookmark, &n.Text, &n.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, nil
}

func (r *PlayerNoteRepo) ListByLesson(ctx context.Context, lessonID uuid.UUID) ([]lessonnote.PlayerNote, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, lesson_id, user_id, role, timestamp_sec, is_bookmark, text, created_at
		FROM lesson_player_notes WHERE lesson_id=$1 ORDER BY timestamp_sec`, lessonID)
	if err != nil {
		return nil, fmt.Errorf("list player notes: %w", err)
	}
	defer rows.Close()
	return scanPlayerNotes(rows)
}

func (r *PlayerNoteRepo) ListByUser(ctx context.Context, userID, lessonID uuid.UUID) ([]lessonnote.PlayerNote, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, lesson_id, user_id, role, timestamp_sec, is_bookmark, text, created_at
		FROM lesson_player_notes WHERE user_id=$1 AND lesson_id=$2 ORDER BY timestamp_sec`, userID, lessonID)
	if err != nil {
		return nil, fmt.Errorf("list user player notes: %w", err)
	}
	defer rows.Close()
	return scanPlayerNotes(rows)
}

func (r *PlayerNoteRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	res, err := r.db.ExecContext(ctx,
		`DELETE FROM lesson_player_notes WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete player note: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

var _ lessonnote.Repository = (*PlayerNoteRepo)(nil)

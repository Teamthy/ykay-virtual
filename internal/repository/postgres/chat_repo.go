package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/chat"

	"github.com/google/uuid"
)

// Postgres chat threads + messages (migration 000021_chat).

type ChatRepo struct{ db TxQuerier }

func NewChatRepo(db TxQuerier) *ChatRepo { return &ChatRepo{db: db} }

func (r *ChatRepo) CreateThread(ctx context.Context, t *chat.Thread) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO chat_threads (id, user_id, title, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING created_at, updated_at`,
		t.ID, t.UserID, t.Title, t.Status).Scan(&t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create chat thread: %w", err)
	}
	return nil
}

func (r *ChatRepo) GetThread(ctx context.Context, id uuid.UUID) (*chat.Thread, error) {
	var t chat.Thread
	var rating sql.NullInt64
	var ratingComment sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, user_id, title, status, rating, rating_comment, created_at, updated_at
		FROM chat_threads WHERE id = $1`, id).
		Scan(&t.ID, &t.UserID, &t.Title, &t.Status, &rating, &ratingComment, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get chat thread: %w", err)
	}
	if rating.Valid {
		v := int(rating.Int64)
		t.Rating = &v
	}
	if ratingComment.Valid {
		t.RatingComment = &ratingComment.String
	}
	return &t, nil
}

func (r *ChatRepo) ListThreadsByUser(ctx context.Context, userID uuid.UUID) ([]chat.Thread, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, title, status, rating, rating_comment, created_at, updated_at
		FROM chat_threads WHERE user_id = $1 ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list chat threads: %w", err)
	}
	defer rows.Close()
	return scanThreads(rows)
}

func (r *ChatRepo) ListAllThreads(ctx context.Context) ([]chat.Thread, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, title, status, rating, rating_comment, created_at, updated_at
		FROM chat_threads ORDER BY updated_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list all chat threads: %w", err)
	}
	defer rows.Close()
	return scanThreads(rows)
}

func (r *ChatRepo) AddMessage(ctx context.Context, m *chat.Message) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO chat_messages (id, thread_id, role, content, created_at)
		VALUES ($1,$2,$3,$4,NOW())
		RETURNING created_at`, m.ID, m.ThreadID, m.Role, m.Content).Scan(&m.CreatedAt)
	if err != nil {
		return fmt.Errorf("add chat message: %w", err)
	}
	_, _ = r.db.ExecContext(ctx,
		`UPDATE chat_threads SET updated_at = NOW() WHERE id = $1`, m.ThreadID)
	return nil
}

func (r *ChatRepo) ListMessages(ctx context.Context, threadID uuid.UUID) ([]chat.Message, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, thread_id, role, content, created_at
		FROM chat_messages WHERE thread_id = $1 ORDER BY created_at ASC`, threadID)
	if err != nil {
		return nil, fmt.Errorf("list chat messages: %w", err)
	}
	defer rows.Close()
	out := []chat.Message{}
	for rows.Next() {
		var m chat.Message
		if err := rows.Scan(&m.ID, &m.ThreadID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (r *ChatRepo) SetStatus(ctx context.Context, threadID uuid.UUID, status chat.ThreadStatus) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE chat_threads SET status = $1, updated_at = NOW() WHERE id = $2`, status, threadID)
	if err != nil {
		return fmt.Errorf("set chat thread status: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *ChatRepo) UpdateRating(ctx context.Context, threadID uuid.UUID, score int, comment *string) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE chat_threads SET rating = $1, rating_comment = $2, updated_at = NOW() WHERE id = $3`,
		score, comment, threadID)
	if err != nil {
		return fmt.Errorf("update chat rating: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

type threadRowScanner interface {
	Next() bool
	Scan(dest ...any) error
	Err() error
}

func scanThreads(rows threadRowScanner) ([]chat.Thread, error) {
	out := []chat.Thread{}
	for rows.Next() {
		var t chat.Thread
		var rating sql.NullInt64
		var ratingComment sql.NullString
		if err := rows.Scan(&t.ID, &t.UserID, &t.Title, &t.Status, &rating, &ratingComment, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		if rating.Valid {
			v := int(rating.Int64)
			t.Rating = &v
		}
		if ratingComment.Valid {
			t.RatingComment = &ratingComment.String
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

var _ chat.ThreadRepository = (*ChatRepo)(nil)

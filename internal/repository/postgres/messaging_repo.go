package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/messaging"

	"github.com/google/uuid"
)

// Messaging repos — conversations, messages, notifications (000008_messaging).

// --- Conversations ---

type ConversationRepo struct{ db TxQuerier }

func NewConversationRepo(db TxQuerier) *ConversationRepo { return &ConversationRepo{db: db} }

const conversationColumns = `id, type, booking_id, cohort_id, subject, is_closed, created_by, created_at, updated_at`

func scanConversation(row interface{ Scan(...any) error }) (*messaging.Conversation, error) {
	var c messaging.Conversation
	var bookingID, cohortID, createdBy uuidNull
	var subject sql.NullString
	if err := row.Scan(&c.ID, &c.Type, &bookingID, &cohortID, &subject, &c.IsClosed,
		&createdBy, &c.CreatedAt, &c.UpdatedAt); err != nil {
		return nil, err
	}
	if bookingID.Valid {
		c.BookingID = &bookingID.UUID
	}
	if cohortID.Valid {
		c.CohortID = &cohortID.UUID
	}
	if createdBy.Valid {
		c.CreatedBy = &createdBy.UUID
	}
	if subject.Valid {
		c.Subject = &subject.String
	}
	return &c, nil
}

func (r *ConversationRepo) Create(ctx context.Context, c *messaging.Conversation) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO conversations (type, booking_id, cohort_id, subject, is_closed, created_by)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at, updated_at`,
		c.Type, c.BookingID, c.CohortID, c.Subject, c.IsClosed, c.CreatedBy,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create conversation: %w", err)
	}
	return nil
}

func (r *ConversationRepo) GetByID(ctx context.Context, id uuid.UUID) (*messaging.Conversation, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+conversationColumns+" FROM conversations WHERE id = $1", id)
	c, err := scanConversation(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (r *ConversationRepo) GetByBooking(ctx context.Context, bookingType messaging.ConversationType, bookingID uuid.UUID) (*messaging.Conversation, error) {
	var row *sql.Row
	if bookingType == messaging.TypeBooking {
		row = r.db.QueryRowContext(ctx,
			"SELECT "+conversationColumns+" FROM conversations WHERE booking_id = $1 LIMIT 1", bookingID)
	} else {
		row = r.db.QueryRowContext(ctx,
			"SELECT "+conversationColumns+" FROM conversations WHERE cohort_id = $1 LIMIT 1", bookingID)
	}
	c, err := scanConversation(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func (r *ConversationRepo) ListByParticipant(ctx context.Context, userID uuid.UUID, limit, offset int) ([]messaging.ConversationWithMeta, int64, error) {
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var total int64
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM conversation_participants WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count conversations: %w", err)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT c.id, c.type, c.booking_id, c.cohort_id, c.subject, c.is_closed, c.created_by,
		       c.created_at, c.updated_at,
		       (SELECT cp2.user_id FROM conversation_participants cp2
		         WHERE cp2.conversation_id = c.id AND cp2.user_id <> $1 ORDER BY cp2.joined_at LIMIT 1) AS other_user_id,
	       (SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.email)
	          FROM conversation_participants cp3
	          JOIN users u ON u.id = cp3.user_id
	          WHERE cp3.conversation_id = c.id AND cp3.user_id <> $1 ORDER BY cp3.joined_at LIMIT 1) AS other_user_name,
		       (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
		       (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
		       (SELECT COUNT(*) FROM messages m
		         WHERE m.conversation_id = c.id AND m.sender_user_id <> $1
		           AND m.created_at > COALESCE((SELECT cp.last_read_at FROM conversation_participants cp
		                 WHERE cp.conversation_id = c.id AND cp.user_id = $1), 'epoch')) AS unread_count
		FROM conversation_participants cp
		JOIN conversations c ON c.id = cp.conversation_id
		WHERE cp.user_id = $1
		ORDER BY COALESCE(last_message_at, c.updated_at) DESC
		LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list conversations: %w", err)
	}
	defer rows.Close()

	out := []messaging.ConversationWithMeta{}
	for rows.Next() {
		var m messaging.ConversationWithMeta
		var bookingID, cohortID, createdBy, otherID uuidNull
		var subject, otherName, lastBody sql.NullString
		var lastAt sql.NullTime
		if err := rows.Scan(&m.ID, &m.Type, &bookingID, &cohortID, &subject, &m.IsClosed, &createdBy,
			&m.CreatedAt, &m.UpdatedAt, &otherID, &otherName, &lastBody, &lastAt, &m.UnreadCount); err != nil {
			return nil, 0, err
		}
		if bookingID.Valid {
			m.BookingID = &bookingID.UUID
		}
		if cohortID.Valid {
			m.CohortID = &cohortID.UUID
		}
		if createdBy.Valid {
			m.CreatedBy = &createdBy.UUID
		}
		if subject.Valid {
			m.Subject = &subject.String
		}
		if otherID.Valid {
			m.OtherUserID = &otherID.UUID
		}
		if otherName.Valid {
			m.OtherUserName = &otherName.String
		}
		if lastBody.Valid {
			m.LastMessage = &lastBody.String
		}
		if lastAt.Valid {
			m.LastMessageAt = &lastAt.Time
		}
		out = append(out, m)
	}
	return out, total, rows.Err()
}

func (r *ConversationRepo) AddParticipant(ctx context.Context, p *messaging.Participant) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO conversation_participants (conversation_id, user_id, last_read_at, is_muted)
		VALUES ($1,$2,$3,$4) ON CONFLICT (conversation_id, user_id) DO NOTHING RETURNING id, joined_at`,
		p.ConversationID, p.UserID, p.LastReadAt, p.IsMuted).Scan(&p.ID, &p.JoinedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil // already a participant
		}
		return fmt.Errorf("add participant: %w", err)
	}
	return nil
}

func (r *ConversationRepo) ListParticipants(ctx context.Context, conversationID uuid.UUID) ([]messaging.Participant, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, conversation_id, user_id, joined_at, last_read_at, is_muted
		FROM conversation_participants WHERE conversation_id = $1 ORDER BY joined_at`, conversationID)
	if err != nil {
		return nil, fmt.Errorf("list participants: %w", err)
	}
	defer rows.Close()
	out := []messaging.Participant{}
	for rows.Next() {
		var p messaging.Participant
		var lastRead sql.NullTime
		if err := rows.Scan(&p.ID, &p.ConversationID, &p.UserID, &p.JoinedAt, &lastRead, &p.IsMuted); err != nil {
			return nil, err
		}
		if lastRead.Valid {
			p.LastReadAt = &lastRead.Time
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *ConversationRepo) IsParticipant(ctx context.Context, conversationID, userID uuid.UUID) (bool, error) {
	var one int
	err := r.db.QueryRowContext(ctx, `
		SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
		conversationID, userID).Scan(&one)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("check participant: %w", err)
	}
	return true, nil
}

func (r *ConversationRepo) Touch(ctx context.Context, conversationID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE conversations SET updated_at = NOW() WHERE id = $1", conversationID)
	if err != nil {
		return fmt.Errorf("touch conversation: %w", err)
	}
	return nil
}

func (r *ConversationRepo) UpdateLastRead(ctx context.Context, conversationID, userID uuid.UUID, at time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE conversation_participants SET last_read_at = $1
		WHERE conversation_id = $2 AND user_id = $3`, at, conversationID, userID)
	if err != nil {
		return fmt.Errorf("update last read: %w", err)
	}
	return nil
}

var _ messaging.ConversationRepository = (*ConversationRepo)(nil)

// --- Messages ---

type MessageRepo struct{ db TxQuerier }

func NewMessageRepo(db TxQuerier) *MessageRepo { return &MessageRepo{db: db} }

func (r *MessageRepo) Create(ctx context.Context, m *messaging.Message) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO messages (conversation_id, sender_user_id, type, body, metadata)
		VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at, updated_at`,
		m.ConversationID, m.SenderUserID, m.Type, m.Body, m.Metadata,
	).Scan(&m.ID, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create message: %w", err)
	}
	return nil
}

// ListByConversation — newest-first with cursor pagination (before = message id).
func (r *MessageRepo) ListByConversation(ctx context.Context, conversationID uuid.UUID, before *uuid.UUID, limit int) ([]messaging.Message, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	query := `
		SELECT id, conversation_id, sender_user_id, type, body, metadata, is_edited, created_at, updated_at
		FROM messages WHERE conversation_id = $1`
	args := []any{conversationID}
	if before != nil {
		query += " AND created_at < (SELECT created_at FROM messages WHERE id = $2)"
		args = append(args, *before)
	}
	query += " ORDER BY created_at DESC LIMIT $" + fmt.Sprint(len(args)+1)
	args = append(args, limit)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list messages: %w", err)
	}
	defer rows.Close()
	out := []messaging.Message{}
	for rows.Next() {
		var m messaging.Message
		var metadata sql.NullString
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderUserID, &m.Type, &m.Body,
			&metadata, &m.IsEdited, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		if metadata.Valid {
			m.Metadata = &metadata.String
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

var _ messaging.MessageRepository = (*MessageRepo)(nil)

// --- Notifications ---

type NotificationRepo struct{ db TxQuerier }

func NewNotificationRepo(db TxQuerier) *NotificationRepo { return &NotificationRepo{db: db} }

func (r *NotificationRepo) Create(ctx context.Context, n *messaging.Notification) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO notifications (user_id, type, title, body, data)
		VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
		n.UserID, n.Type, n.Title, n.Body, n.Data,
	).Scan(&n.ID, &n.CreatedAt)
	if err != nil {
		return fmt.Errorf("create notification: %w", err)
	}
	return nil
}

func (r *NotificationRepo) ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]messaging.Notification, int64, error) {
	if limit < 1 || limit > 100 {
		limit = 30
	}
	if offset < 0 {
		offset = 0
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM notifications WHERE user_id = $1", userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count notifications: %w", err)
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, user_id, type, title, body, data, is_read, read_at, created_at
		FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list notifications: %w", err)
	}
	defer rows.Close()
	out := []messaging.Notification{}
	for rows.Next() {
		var n messaging.Notification
		var body, data sql.NullString
		var readAt sql.NullTime
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &body, &data, &n.IsRead, &readAt, &n.CreatedAt); err != nil {
			return nil, 0, err
		}
		if body.Valid {
			n.Body = &body.String
		}
		if data.Valid {
			n.Data = &data.String
		}
		if readAt.Valid {
			n.ReadAt = &readAt.Time
		}
		out = append(out, n)
	}
	return out, total, rows.Err()
}

func (r *NotificationRepo) UnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	var n int64
	if err := r.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE", userID).Scan(&n); err != nil {
		return 0, fmt.Errorf("unread count: %w", err)
	}
	return n, nil
}

func (r *NotificationRepo) MarkRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE notifications SET is_read = TRUE, read_at = NOW()
		WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("mark read: %w", err)
	}
	return nil
}

func (r *NotificationRepo) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE`, userID)
	if err != nil {
		return fmt.Errorf("mark all read: %w", err)
	}
	return nil
}

var _ messaging.NotificationRepository = (*NotificationRepo)(nil)

var _ = time.Time{}

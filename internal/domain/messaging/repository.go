package messaging

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Repository interfaces for booking-scoped conversations, messages and
// notifications (migration 000008_messaging). Implementations:
// internal/repository/postgres, internal/repository/memory.
// Authorization (participant-only) is enforced in the service layer.

type ConversationRepository interface {
	Create(ctx context.Context, c *Conversation) error
	GetByID(ctx context.Context, id uuid.UUID) (*Conversation, error)
	GetByBooking(ctx context.Context, bookingType ConversationType, bookingID uuid.UUID) (*Conversation, error)
	ListByParticipant(ctx context.Context, userID uuid.UUID, limit, offset int) ([]ConversationWithMeta, int64, error)
	AddParticipant(ctx context.Context, p *Participant) error
	ListParticipants(ctx context.Context, conversationID uuid.UUID) ([]Participant, error)
	IsParticipant(ctx context.Context, conversationID, userID uuid.UUID) (bool, error)
	Touch(ctx context.Context, conversationID uuid.UUID) error
	UpdateLastRead(ctx context.Context, conversationID, userID uuid.UUID, at time.Time) error
}

type MessageRepository interface {
	Create(ctx context.Context, m *Message) error
	ListByConversation(ctx context.Context, conversationID uuid.UUID, before *uuid.UUID, limit int) ([]Message, error)
}

type NotificationRepository interface {
	Create(ctx context.Context, n *Notification) error
	ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]Notification, int64, error)
	UnreadCount(ctx context.Context, userID uuid.UUID) (int64, error)
	MarkRead(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
	MarkAllRead(ctx context.Context, userID uuid.UUID) error
}

// ConversationWithMeta — conversation + counterpart + last message + unread
// count, for conversation list rendering.
type ConversationWithMeta struct {
	Conversation
	OtherUserID   *uuid.UUID `json:"other_user_id,omitempty"`
	OtherUserName *string    `json:"other_user_name,omitempty"`
	LastMessage   *string    `json:"last_message,omitempty"`
	LastMessageAt *time.Time `json:"last_message_at,omitempty"`
	UnreadCount   int        `json:"unread_count"`
}

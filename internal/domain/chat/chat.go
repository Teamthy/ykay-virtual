package chat

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Chat domain — AI assistant + human handoff threads (phase 33).
// Threads are per-user; messages are append-only; escalation links a thread
// to a support ticket.

type Role string

const (
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
	RoleSystem    Role = "system"
)

type ThreadStatus string

const (
	ThreadOpen      ThreadStatus = "OPEN"
	ThreadEscalated ThreadStatus = "ESCALATED"
	ThreadClosed    ThreadStatus = "CLOSED"
)

type Thread struct {
	ID        uuid.UUID    `json:"id"`
	UserID    uuid.UUID    `json:"user_id"`
	Title     string       `json:"title"`
	Status    ThreadStatus `json:"status"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

type Message struct {
	ID        uuid.UUID `json:"id"`
	ThreadID  uuid.UUID `json:"thread_id"`
	Role      Role      `json:"role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type ThreadRepository interface {
	CreateThread(ctx context.Context, t *Thread) error
	GetThread(ctx context.Context, id uuid.UUID) (*Thread, error)
	ListThreadsByUser(ctx context.Context, userID uuid.UUID) ([]Thread, error)
	AddMessage(ctx context.Context, m *Message) error
	ListMessages(ctx context.Context, threadID uuid.UUID) ([]Message, error)
	SetStatus(ctx context.Context, threadID uuid.UUID, status ThreadStatus) error
}

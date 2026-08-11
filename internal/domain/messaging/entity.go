package messaging

import (
	"github.com/google/uuid"
	"time"
)

type ConversationType string

const (
	TypeBooking ConversationType = "BOOKING"
	TypeCohort  ConversationType = "COHORT"
	TypeSupport ConversationType = "SUPPORT"
	TypeDirect  ConversationType = "DIRECT"
)

type MessageType string

const (
	MsgText   MessageType = "TEXT"
	MsgImage  MessageType = "IMAGE"
	MsgFile   MessageType = "FILE"
	MsgSystem MessageType = "SYSTEM"
)

type Conversation struct {
	ID        uuid.UUID        `json:"id"`
	Type      ConversationType `json:"type"`
	BookingID *uuid.UUID       `json:"booking_id,omitempty"`
	CohortID  *uuid.UUID       `json:"cohort_id,omitempty"`
	Subject   *string          `json:"subject,omitempty"`
	IsClosed  bool             `json:"is_closed"`
	CreatedBy *uuid.UUID       `json:"created_by,omitempty"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
}

type Participant struct {
	ID             uuid.UUID  `json:"id"`
	ConversationID uuid.UUID  `json:"conversation_id"`
	UserID         uuid.UUID  `json:"user_id"`
	JoinedAt       time.Time  `json:"joined_at"`
	LastReadAt     *time.Time `json:"last_read_at,omitempty"`
	IsMuted        bool       `json:"is_muted"`
}

type Message struct {
	ID             uuid.UUID   `json:"id"`
	ConversationID uuid.UUID   `json:"conversation_id"`
	SenderUserID   uuid.UUID   `json:"sender_user_id"`
	Type           MessageType `json:"type"`
	Body           string      `json:"body"`
	Metadata       *string     `json:"metadata,omitempty"`
	IsEdited       bool        `json:"is_edited"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

type Notification struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	Type      string     `json:"type"`
	Title     string     `json:"title"`
	Body      *string    `json:"body,omitempty"`
	Data      *string    `json:"data,omitempty"`
	IsRead    bool       `json:"is_read"`
	ReadAt    *time.Time `json:"read_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

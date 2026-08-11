package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/messaging"

	"github.com/google/uuid"
)

// In-memory messaging + notifications (tests / dev fallback).

type ConversationMemory struct {
	mu           sync.RWMutex
	rows         map[uuid.UUID]*messaging.Conversation
	participants map[uuid.UUID][]messaging.Participant
	messages     map[uuid.UUID][]messaging.Message
	byBooking    map[string]uuid.UUID // type|id → conversation
}

func NewConversationMemory() *ConversationMemory {
	return &ConversationMemory{
		rows:         map[uuid.UUID]*messaging.Conversation{},
		participants: map[uuid.UUID][]messaging.Participant{},
		messages:     map[uuid.UUID][]messaging.Message{},
		byBooking:    map[string]uuid.UUID{},
	}
}

func (m *ConversationMemory) Create(_ context.Context, c *messaging.Conversation) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	c.CreatedAt = time.Now().UTC()
	c.UpdatedAt = c.CreatedAt
	m.rows[c.ID] = c
	if c.BookingID != nil {
		m.byBooking["BOOKING|"+c.BookingID.String()] = c.ID
	}
	if c.CohortID != nil {
		m.byBooking["COHORT|"+c.CohortID.String()] = c.ID
	}
	return nil
}

func (m *ConversationMemory) GetByID(_ context.Context, id uuid.UUID) (*messaging.Conversation, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if c, ok := m.rows[id]; ok {
		cp := *c
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *ConversationMemory) GetByBooking(_ context.Context, bookingType messaging.ConversationType, bookingID uuid.UUID) (*messaging.Conversation, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if id, ok := m.byBooking[string(bookingType)+"|"+bookingID.String()]; ok {
		c := m.rows[id]
		cp := *c
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *ConversationMemory) ListByParticipant(_ context.Context, userID uuid.UUID, limit, offset int) ([]messaging.ConversationWithMeta, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []messaging.ConversationWithMeta
	for id, c := range m.rows {
		parts := m.participants[id]
		if !containsUser(parts, userID) {
			continue
		}
		meta := messaging.ConversationWithMeta{Conversation: *c}
		unread := 0
		var lastMsg *messaging.Message
		var lastRead time.Time
		for _, p := range parts {
			if p.UserID == userID && p.LastReadAt != nil && p.LastReadAt.After(lastRead) {
				lastRead = *p.LastReadAt
			}
		}
		for _, msg := range m.messages[id] {
			if msg.SenderUserID != userID && msg.CreatedAt.After(lastRead) {
				unread++
			}
			if lastMsg == nil || msg.CreatedAt.After(lastMsg.CreatedAt) {
				lm := msg
				lastMsg = &lm
			}
		}
		if lastMsg != nil {
			meta.LastMessage = &lastMsg.Body
			meta.LastMessageAt = &lastMsg.CreatedAt
		}
		for _, p := range parts {
			if p.UserID != userID {
				uid := p.UserID
				name := "user " + uid.String()[:8]
				meta.OtherUserID = &uid
				meta.OtherUserName = &name
				break
			}
		}
		meta.UnreadCount = unread
		out = append(out, meta)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].UpdatedAt.After(out[j].UpdatedAt)
	})
	total := int64(len(out))
	if offset > len(out) {
		offset = len(out)
	}
	end := offset + limit
	if limit < 1 {
		end = offset + 20
	}
	if end > len(out) {
		end = len(out)
	}
	return out[offset:end], total, nil
}

func containsUser(parts []messaging.Participant, userID uuid.UUID) bool {
	for _, p := range parts {
		if p.UserID == userID {
			return true
		}
	}
	return false
}

func (m *ConversationMemory) AddParticipant(_ context.Context, p *messaging.Participant) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	p.JoinedAt = time.Now().UTC()
	for _, existing := range m.participants[p.ConversationID] {
		if existing.UserID == p.UserID {
			return nil
		}
	}
	m.participants[p.ConversationID] = append(m.participants[p.ConversationID], *p)
	return nil
}

func (m *ConversationMemory) ListParticipants(_ context.Context, conversationID uuid.UUID) ([]messaging.Participant, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]messaging.Participant, len(m.participants[conversationID]))
	copy(out, m.participants[conversationID])
	return out, nil
}

func (m *ConversationMemory) IsParticipant(_ context.Context, conversationID, userID uuid.UUID) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return containsUser(m.participants[conversationID], userID), nil
}

func (m *ConversationMemory) Touch(_ context.Context, conversationID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, ok := m.rows[conversationID]
	if !ok {
		return domain.ErrNotFound
	}
	c.UpdatedAt = time.Now().UTC()
	return nil
}

func (m *ConversationMemory) UpdateLastRead(_ context.Context, conversationID, userID uuid.UUID, at time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.participants[conversationID] {
		if m.participants[conversationID][i].UserID == userID {
			m.participants[conversationID][i].LastReadAt = &at
			return nil
		}
	}
	return nil
}

func (m *ConversationMemory) SaveMessage(msg *messaging.Message) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if msg.ID == uuid.Nil {
		msg.ID = uuid.New()
	}
	msg.CreatedAt = time.Now().UTC()
	msg.UpdatedAt = msg.CreatedAt
	m.messages[msg.ConversationID] = append(m.messages[msg.ConversationID], *msg)
}

func (m *ConversationMemory) ListMessages(_ context.Context, conversationID uuid.UUID) []messaging.Message {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]messaging.Message, len(m.messages[conversationID]))
	copy(out, m.messages[conversationID])
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out
}

var _ messaging.ConversationRepository = (*ConversationMemory)(nil)

// --- Messages ---

type MessageMemory struct{ conv *ConversationMemory }

func NewMessageMemory(conv *ConversationMemory) *MessageMemory { return &MessageMemory{conv: conv} }

func (m *MessageMemory) Create(_ context.Context, msg *messaging.Message) error {
	m.conv.SaveMessage(msg)
	return nil
}

func (m *MessageMemory) ListByConversation(_ context.Context, conversationID uuid.UUID, before *uuid.UUID, limit int) ([]messaging.Message, error) {
	all := m.conv.ListMessages(context.Background(), conversationID)
	if limit < 1 || limit > 100 {
		limit = 50
	}
	if len(all) > limit {
		all = all[:limit]
	}
	return all, nil
}

var _ messaging.MessageRepository = (*MessageMemory)(nil)

// --- Notifications ---

type NotificationMemory struct {
	mu   sync.RWMutex
	rows []messaging.Notification
}

func NewNotificationMemory() *NotificationMemory { return &NotificationMemory{} }

func (m *NotificationMemory) Create(_ context.Context, n *messaging.Notification) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	n.CreatedAt = time.Now().UTC()
	m.rows = append(m.rows, *n)
	return nil
}

func (m *NotificationMemory) ListByUser(_ context.Context, userID uuid.UUID, limit, offset int) ([]messaging.Notification, int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []messaging.Notification
	for _, n := range m.rows {
		if n.UserID == userID {
			out = append(out, n)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	total := int64(len(out))
	if offset > len(out) {
		offset = len(out)
	}
	end := offset + limit
	if limit < 1 {
		end = offset + 30
	}
	if end > len(out) {
		end = len(out)
	}
	return out[offset:end], total, nil
}

func (m *NotificationMemory) UnreadCount(_ context.Context, userID uuid.UUID) (int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var n int64
	for _, notif := range m.rows {
		if notif.UserID == userID && !notif.IsRead {
			n++
		}
	}
	return n, nil
}

func (m *NotificationMemory) MarkRead(_ context.Context, id uuid.UUID, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := range m.rows {
		if m.rows[i].ID == id && m.rows[i].UserID == userID {
			m.rows[i].IsRead = true
			now := time.Now().UTC()
			m.rows[i].ReadAt = &now
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *NotificationMemory) MarkAllRead(_ context.Context, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC()
	for i := range m.rows {
		if m.rows[i].UserID == userID && !m.rows[i].IsRead {
			m.rows[i].IsRead = true
			m.rows[i].ReadAt = &now
		}
	}
	return nil
}

var _ messaging.NotificationRepository = (*NotificationMemory)(nil)

package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/chat"

	"github.com/google/uuid"
)

// In-memory chat threads (dev / tests). Postgres repo is a documented
// follow-up (migration 000021_chat).

type ChatMemory struct {
	mu       sync.RWMutex
	threads  map[uuid.UUID]*chat.Thread
	messages map[uuid.UUID][]chat.Message
}

func NewChatMemory() *ChatMemory {
	return &ChatMemory{
		threads:  map[uuid.UUID]*chat.Thread{},
		messages: map[uuid.UUID][]chat.Message{},
	}
}

func (m *ChatMemory) CreateThread(_ context.Context, t *chat.Thread) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	now := time.Now().UTC()
	if t.CreatedAt.IsZero() {
		t.CreatedAt = now
	}
	if t.UpdatedAt.IsZero() {
		t.UpdatedAt = now
	}
	if t.Status == "" {
		t.Status = chat.ThreadOpen
	}
	m.threads[t.ID] = t
	return nil
}

func (m *ChatMemory) GetThread(_ context.Context, id uuid.UUID) (*chat.Thread, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	t, ok := m.threads[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *t
	return &cp, nil
}

func (m *ChatMemory) ListThreadsByUser(_ context.Context, userID uuid.UUID) ([]chat.Thread, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []chat.Thread{}
	for _, t := range m.threads {
		if t.UserID == userID {
			out = append(out, *t)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UpdatedAt.After(out[j].UpdatedAt) })
	return out, nil
}

func (m *ChatMemory) AddMessage(_ context.Context, msg *chat.Message) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if msg.ID == uuid.Nil {
		msg.ID = uuid.New()
	}
	if msg.CreatedAt.IsZero() {
		msg.CreatedAt = time.Now().UTC()
	}
	m.messages[msg.ThreadID] = append(m.messages[msg.ThreadID], *msg)
	if t, ok := m.threads[msg.ThreadID]; ok {
		t.UpdatedAt = time.Now().UTC()
	}
	return nil
}

func (m *ChatMemory) ListMessages(_ context.Context, threadID uuid.UUID) ([]chat.Message, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]chat.Message, len(m.messages[threadID]))
	copy(out, m.messages[threadID])
	return out, nil
}

func (m *ChatMemory) SetStatus(_ context.Context, threadID uuid.UUID, status chat.ThreadStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	t, ok := m.threads[threadID]
	if !ok {
		return domain.ErrNotFound
	}
	t.Status = status
	t.UpdatedAt = time.Now().UTC()
	return nil
}

var _ chat.ThreadRepository = (*ChatMemory)(nil)

package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/lessonnote"
)

// PlayerNoteMemory — in-memory lessonnote.Repository for tests + dev fallback.
type PlayerNoteMemory struct {
	mu    sync.RWMutex
	notes []*lessonnote.PlayerNote
}

func NewPlayerNoteMemory() *PlayerNoteMemory {
	return &PlayerNoteMemory{notes: []*lessonnote.PlayerNote{}}
}

func (m *PlayerNoteMemory) Add(_ context.Context, n *lessonnote.PlayerNote) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	n.ID = uuid.New()
	n.CreatedAt = time.Now().UTC()
	cp := *n
	m.notes = append(m.notes, &cp)
	*n = cp
	return nil
}

func (m *PlayerNoteMemory) ListByLesson(_ context.Context, lessonID uuid.UUID) ([]lessonnote.PlayerNote, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []lessonnote.PlayerNote{}
	for _, n := range m.notes {
		if n.LessonID == lessonID {
			out = append(out, *n)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].TimestampSec < out[j].TimestampSec })
	return out, nil
}

func (m *PlayerNoteMemory) ListByUser(_ context.Context, userID, lessonID uuid.UUID) ([]lessonnote.PlayerNote, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []lessonnote.PlayerNote{}
	for _, n := range m.notes {
		if n.UserID == userID && n.LessonID == lessonID {
			out = append(out, *n)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].TimestampSec < out[j].TimestampSec })
	return out, nil
}

func (m *PlayerNoteMemory) Delete(_ context.Context, id, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := m.notes[:0]
	found := false
	for _, n := range m.notes {
		if n.ID == id {
			if n.UserID != userID {
				// Only the owner may delete. Reported as not-found (like the
				// Postgres WHERE user_id=$2 path) so existence isn't leaked.
				return domain.ErrNotFound
			}
			found = true
			continue
		}
		out = append(out, n)
	}
	m.notes = out
	if !found {
		return domain.ErrNotFound
	}
	return nil
}

var _ lessonnote.Repository = (*PlayerNoteMemory)(nil)

package memory

import (
	"context"
	"sort"
	"sync"

	"ykay-virtual/internal/domain/booking"

	"github.com/google/uuid"
)

// In-memory lessons (tests / dev fallback).

type LessonMemory struct {
	mu      sync.RWMutex
	rows    map[uuid.UUID]*booking.Lesson
	student map[uuid.UUID][]uuid.UUID // studentProfileID → lesson IDs
}

func NewLessonMemory() *LessonMemory {
	return &LessonMemory{mu: sync.RWMutex{}, rows: map[uuid.UUID]*booking.Lesson{}, student: map[uuid.UUID][]uuid.UUID{}}
}

func (m *LessonMemory) Seed(l *booking.Lesson, studentIDs ...uuid.UUID) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	m.rows[l.ID] = l
	for _, sid := range studentIDs {
		m.student[sid] = append(m.student[sid], l.ID)
	}
}

func (m *LessonMemory) ListByStudent(_ context.Context, studentProfileID uuid.UUID, limit int) ([]booking.Lesson, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []booking.Lesson
	for _, id := range m.student[studentProfileID] {
		if l, ok := m.rows[id]; ok {
			out = append(out, *l)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartAt.After(out[j].StartAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (m *LessonMemory) ListByTutor(_ context.Context, tutorProfileID uuid.UUID, limit int) ([]booking.Lesson, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []booking.Lesson
	for _, l := range m.rows {
		if l.TutorProfileID == tutorProfileID {
			out = append(out, *l)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartAt.After(out[j].StartAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

var _ booking.LessonRepository = (*LessonMemory)(nil)

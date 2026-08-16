package memory

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/booking"
)

// LessonProgressMemory — in-memory LessonProgressRepository for tests + dev.
type LessonProgressMemory struct {
	mu    sync.RWMutex
	byKey map[string]*booking.LessonProgress
}

func NewLessonProgressMemory() *LessonProgressMemory {
	return &LessonProgressMemory{byKey: map[string]*booking.LessonProgress{}}
}

func (m *LessonProgressMemory) key(lessonID, studentID uuid.UUID) string {
	return lessonID.String() + "|" + studentID.String()
}

func (m *LessonProgressMemory) Upsert(_ context.Context, p *booking.LessonProgress) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	k := m.key(p.LessonID, p.StudentProfileID)
	now := time.Now().UTC()
	if existing, ok := m.byKey[k]; ok {
		existing.Watched = p.Watched
		existing.PositionSeconds = p.PositionSeconds
		if p.WatchedAt != nil {
			existing.WatchedAt = p.WatchedAt
		}
		existing.UpdatedAt = now
		return nil
	}
	copy := *p
	copy.ID = uuid.New()
	copy.CreatedAt = now
	copy.UpdatedAt = now
	m.byKey[k] = &copy
	return nil
}

func (m *LessonProgressMemory) GetByLessonAndStudent(_ context.Context, lessonID, studentProfileID uuid.UUID) (*booking.LessonProgress, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if p, ok := m.byKey[m.key(lessonID, studentProfileID)]; ok {
		return p, nil
	}
	return nil, nil
}

func (m *LessonProgressMemory) ListByStudent(_ context.Context, studentProfileID uuid.UUID, _ int) ([]booking.LessonProgress, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []booking.LessonProgress{}
	for _, p := range m.byKey {
		if p.StudentProfileID == studentProfileID {
			out = append(out, *p)
		}
	}
	return out, nil
}

var _ booking.LessonProgressRepository = (*LessonProgressMemory)(nil)

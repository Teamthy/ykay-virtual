package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"ykay-virtual/internal/domain"
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

func (m *LessonMemory) Create(_ context.Context, l *booking.Lesson) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	m.rows[l.ID] = l
	return nil
}

func (m *LessonMemory) HasOverlappingLessons(_ context.Context, tutorProfileID uuid.UUID, startAt, endAt time.Time, excludeLessonID *uuid.UUID) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, l := range m.rows {
		if l.TutorProfileID != tutorProfileID {
			continue
		}
		if l.Status == booking.LessonCancelled {
			continue
		}
		if excludeLessonID != nil && l.ID == *excludeLessonID {
			continue
		}
		// overlap: existing.start < new.end AND existing.end > new.start
		if l.StartAt.Before(endAt) && l.EndAt.After(startAt) {
			return true, nil
		}
	}
	return false, nil
}

var _ booking.LessonRepository = (*LessonMemory)(nil)

func (m *LessonMemory) SetVideoURL(_ context.Context, lessonID uuid.UUID, videoURL *string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	l, ok := m.rows[lessonID]
	if !ok {
		return domain.ErrNotFound
	}
	l.VideoURL = videoURL
	return nil
}

// Reschedule — FR-23: move a lesson to a new window and mark it RESCHEDULED.
func (m *LessonMemory) Reschedule(_ context.Context, lessonID uuid.UUID, startAt, endAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	l, ok := m.rows[lessonID]
	if !ok {
		return domain.ErrNotFound
	}
	l.StartAt = startAt
	l.EndAt = endAt
	l.Status = booking.LessonRescheduled
	return nil
}

// UpdateStatus — FR-23: lesson lifecycle transition (e.g. CANCELLED).
func (m *LessonMemory) UpdateStatus(_ context.Context, lessonID uuid.UUID, status booking.LessonStatus) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	l, ok := m.rows[lessonID]
	if !ok {
		return domain.ErrNotFound
	}
	l.Status = status
	return nil
}

func (m *LessonMemory) ListRecordedForStudent(_ context.Context, studentProfileID uuid.UUID, limit int) ([]booking.Lesson, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var out []booking.Lesson
	for _, id := range m.student[studentProfileID] {
		if l, ok := m.rows[id]; ok && l.VideoURL != nil && *l.VideoURL != "" && l.Status != booking.LessonCancelled {
			out = append(out, *l)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartAt.After(out[j].StartAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

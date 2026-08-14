package memory

import (
	"context"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"

	"github.com/google/uuid"
)

// MeetingMemory — in-memory meeting-link state (dev/tests). Backed by the
// same LessonMemory rows so seed data is shared.

type MeetingMemory struct{ lm *LessonMemory }

func NewMeetingMemory(lm *LessonMemory) *MeetingMemory { return &MeetingMemory{lm: lm} }

func (m *MeetingMemory) GetLesson(_ context.Context, lessonID uuid.UUID) (*booking.Lesson, error) {
	m.lm.mu.RLock()
	defer m.lm.mu.RUnlock()
	if l, ok := m.lm.rows[lessonID]; ok {
		cp := *l
		return &cp, nil
	}
	return nil, domain.ErrNotFound
}

func (m *MeetingMemory) GetMeeting(_ context.Context, lessonID uuid.UUID) (*booking.LessonMeeting, error) {
	m.lm.mu.RLock()
	defer m.lm.mu.RUnlock()
	l, ok := m.lm.rows[lessonID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	out := &booking.LessonMeeting{
		LessonID:          lessonID,
		Provider:          l.MeetingProvider,
		ProviderRef:       l.MeetingRef,
		MeetingURL:        "",
		ExpiresAt:         l.MeetingExpiresAt,
		JoinWindowMinutes: l.JoinWindowMinutes,
	}
	if l.MeetingURL != nil {
		out.MeetingURL = *l.MeetingURL
	}
	if out.JoinWindowMinutes <= 0 {
		out.JoinWindowMinutes = 15
	}
	return out, nil
}

func (m *MeetingMemory) UpsertMeeting(_ context.Context, mm booking.LessonMeeting) error {
	m.lm.mu.Lock()
	defer m.lm.mu.Unlock()
	l, ok := m.lm.rows[mm.LessonID]
	if !ok {
		return domain.ErrNotFound
	}
	l.MeetingProvider = mm.Provider
	l.MeetingRef = mm.ProviderRef
	l.MeetingURL = &mm.MeetingURL
	l.MeetingExpiresAt = mm.ExpiresAt
	l.JoinWindowMinutes = mm.JoinWindowMinutes
	return nil
}

func (m *MeetingMemory) IsParticipant(_ context.Context, lessonID, studentProfileID uuid.UUID) (bool, error) {
	m.lm.mu.RLock()
	defer m.lm.mu.RUnlock()
	for _, id := range m.lm.student[studentProfileID] {
		if id == lessonID {
			return true, nil
		}
	}
	return false, nil
}

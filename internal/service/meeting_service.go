package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/meeting"
)

// LessonMeetingRepo — narrow read/write surface for meeting-link state.
// Implemented by postgres.MeetingRepo and memory.MeetingMemory.
type LessonMeetingRepo interface {
	GetLesson(ctx context.Context, lessonID uuid.UUID) (*booking.Lesson, error)
	GetMeeting(ctx context.Context, lessonID uuid.UUID) (*booking.LessonMeeting, error)
	UpsertMeeting(ctx context.Context, m booking.LessonMeeting) error
	// IsParticipant reports whether the student profile attends this lesson
	// (lesson_participants row or cohort enrollment with participant rows).
	IsParticipant(ctx context.Context, lessonID, studentProfileID uuid.UUID) (bool, error)
}

// MeetingService — live-class meeting-link lifecycle (G4.2).
//
// Tutor (host): GetOrCreateTutorLink creates/refreshes the room via the
// provider; refreshes are idempotent on the provider ref and only happen
// when the link expired.
//
// Student (participant): GetParticipantLink enforces the join window
// server-side — links are refused before/after the window so a leaked URL
// does not grant entry outside class time.
type MeetingService struct {
	repo     LessonMeetingRepo
	provider meeting.Provider
}

func NewMeetingService(repo LessonMeetingRepo, provider meeting.Provider) *MeetingService {
	return &MeetingService{repo: repo, provider: provider}
}

// GetOrCreateTutorLink returns the meeting link for the lesson's tutor,
// creating or refreshing the room as needed.
func (s *MeetingService) GetOrCreateTutorLink(ctx context.Context, lessonID, tutorProfileID uuid.UUID) (*booking.LessonMeeting, error) {
	lesson, err := s.repo.GetLesson(ctx, lessonID)
	if err != nil {
		return nil, err
	}
	if lesson.TutorProfileID != tutorProfileID {
		return nil, errors.New("forbidden: not this tutor's lesson")
	}

	now := time.Now().UTC()
	if m, err := s.repo.GetMeeting(ctx, lessonID); err == nil && m != nil && m.ProviderRef != "" {
		if m.ExpiresAt == nil || m.ExpiresAt.After(now) {
			return m, nil // existing link still valid — no new room
		}
	}

	link, err := s.provider.Create(ctx, lessonID.String(), lesson.Title, lesson.StartAt, lesson.EndAt)
	if err != nil {
		return nil, fmt.Errorf("meeting provider: %w", err)
	}
	m := booking.LessonMeeting{
		LessonID:          lessonID,
		Provider:          lesson.MeetingProvider,
		ProviderRef:       link.ProviderRef,
		MeetingURL:        link.JoinURL,
		ExpiresAt:         &link.ExpiresAt,
		JoinWindowMinutes: 15,
	}
	if err := s.repo.UpsertMeeting(ctx, m); err != nil {
		return nil, err
	}
	return &m, nil
}

// GetParticipantLink returns the join link for a learner enrolled in the
// lesson, enforcing the join window (meeting.ErrJoinWindowClosed outside).
func (s *MeetingService) GetParticipantLink(ctx context.Context, lessonID, studentProfileID uuid.UUID) (*booking.LessonMeeting, error) {
	lesson, err := s.repo.GetLesson(ctx, lessonID)
	if err != nil {
		return nil, err
	}
	ok, err := s.repo.IsParticipant(ctx, lessonID, studentProfileID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, errors.New("forbidden: not a participant of this lesson")
	}
	m, err := s.repo.GetMeeting(ctx, lessonID)
	if err != nil || m == nil || m.MeetingURL == "" {
		return nil, errors.New("meeting link not ready yet — the tutor has not opened the room")
	}
	if !m.JoinWindowOpen(lesson.StartAt, lesson.EndAt, time.Now().UTC()) {
		return nil, meeting.ErrJoinWindowClosed
	}
	return m, nil
}

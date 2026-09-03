package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/meeting"

	"github.com/google/uuid"
)

// fakeMeetingRepo — in-memory LessonMeetingRepo for service tests.
type fakeMeetingRepo struct {
	lesson       *booking.Lesson
	meeting      *booking.LessonMeeting
	participants map[uuid.UUID]bool
	upserted     int
}

func (f *fakeMeetingRepo) GetLesson(context.Context, uuid.UUID) (*booking.Lesson, error) {
	if f.lesson == nil {
		return nil, domain.ErrNotFound
	}
	return f.lesson, nil
}
func (f *fakeMeetingRepo) GetMeeting(context.Context, uuid.UUID) (*booking.LessonMeeting, error) {
	if f.meeting == nil {
		return nil, domain.ErrNotFound
	}
	return f.meeting, nil
}
func (f *fakeMeetingRepo) UpsertMeeting(_ context.Context, m booking.LessonMeeting) error {
	f.meeting = &m
	f.upserted++
	return nil
}
func (f *fakeMeetingRepo) IsParticipant(_ context.Context, _, studentID uuid.UUID) (bool, error) {
	return f.participants[studentID], nil
}

func newMeetingFixture() (*fakeMeetingRepo, *booking.Lesson, uuid.UUID, uuid.UUID) {
	tutor := uuid.New()
	student := uuid.New()
	lessonID := uuid.New()
	start := time.Now().UTC().Add(5 * time.Minute)
	lesson := &booking.Lesson{
		ID:              lessonID,
		TutorProfileID:  tutor,
		Title:           "Algebra foundations",
		StartAt:         start,
		EndAt:           start.Add(90 * time.Minute),
		MeetingProvider: "stub",
	}
	repo := &fakeMeetingRepo{lesson: lesson, participants: map[uuid.UUID]bool{student: true}}
	return repo, lesson, tutor, student
}

func TestMeetingServiceTutorCreatesThenReusesLink(t *testing.T) {
	repo, lesson, tutor, _ := newMeetingFixture()
	svc := NewMeetingService(repo, meeting.StubMeetingProvider{})

	m1, err := svc.GetOrCreateTutorLink(context.Background(), lesson.ID, tutor)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if m1.MeetingURL == "" || m1.ProviderRef == "" {
		t.Fatalf("link incomplete: %+v", m1)
	}
	m2, err := svc.GetOrCreateTutorLink(context.Background(), lesson.ID, tutor)
	if err != nil {
		t.Fatalf("reuse: %v", err)
	}
	if m2.ProviderRef != m1.ProviderRef || repo.upserted != 1 {
		t.Fatalf("existing link must be reused (no new room), upserts=%d", repo.upserted)
	}
}

func TestMeetingServiceRefreshesExpiredLink(t *testing.T) {
	repo, lesson, tutor, _ := newMeetingFixture()
	svc := NewMeetingService(repo, meeting.StubMeetingProvider{})

	expired := time.Now().UTC().Add(-time.Hour)
	repo.meeting = &booking.LessonMeeting{
		LessonID: lesson.ID, ProviderRef: "old-room",
		MeetingURL: "https://meet.ykvirtual.local/room/old", ExpiresAt: &expired,
	}
	m, err := svc.GetOrCreateTutorLink(context.Background(), lesson.ID, tutor)
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	if m.ProviderRef == "old-room" {
		t.Fatal("expired link must be refreshed with a new room")
	}
}

func TestMeetingServiceRejectsForeignTutor(t *testing.T) {
	repo, lesson, _, _ := newMeetingFixture()
	svc := NewMeetingService(repo, meeting.StubMeetingProvider{})
	if _, err := svc.GetOrCreateTutorLink(context.Background(), lesson.ID, uuid.New()); err == nil {
		t.Fatal("a non-owning tutor must be rejected")
	}
}

func TestMeetingServiceStudentJoinWindow(t *testing.T) {
	repo, lesson, _, student := newMeetingFixture()
	svc := NewMeetingService(repo, meeting.StubMeetingProvider{})
	expiry := time.Now().UTC().Add(2 * time.Hour)
	repo.meeting = &booking.LessonMeeting{
		LessonID: lesson.ID, Provider: "stub",
		MeetingURL: "https://meet.ykvirtual.local/room/x",
		ExpiresAt:  &expiry, JoinWindowMinutes: 15,
	}

	// Window is open (lesson starts in 5m, window opens at start−15m).
	if _, err := svc.GetParticipantLink(context.Background(), lesson.ID, student); err != nil {
		t.Fatalf("join inside window failed: %v", err)
	}

	// Far before the lesson → window closed.
	lesson.StartAt = time.Now().UTC().Add(24 * time.Hour)
	lesson.EndAt = lesson.StartAt.Add(90 * time.Minute)
	if _, err := svc.GetParticipantLink(context.Background(), lesson.ID, student); err != meeting.ErrJoinWindowClosed {
		t.Fatalf("expected ErrJoinWindowClosed, got %v", err)
	}

	// After the lesson + grace → closed.
	lesson.StartAt = time.Now().UTC().Add(-3 * time.Hour)
	lesson.EndAt = lesson.StartAt.Add(90 * time.Minute)
	if _, err := svc.GetParticipantLink(context.Background(), lesson.ID, student); err != meeting.ErrJoinWindowClosed {
		t.Fatalf("expected ErrJoinWindowClosed after lesson, got %v", err)
	}
}

func TestMeetingServiceRejectsNonParticipant(t *testing.T) {
	repo, lesson, _, _ := newMeetingFixture()
	svc := NewMeetingService(repo, meeting.StubMeetingProvider{})
	if _, err := svc.GetParticipantLink(context.Background(), lesson.ID, uuid.New()); err == nil {
		t.Fatal("non-participant must be rejected")
	}
}

func TestMeetingServiceLinkNotReady(t *testing.T) {
	repo, lesson, _, student := newMeetingFixture()
	svc := NewMeetingService(repo, meeting.StubMeetingProvider{})
	repo.meeting = nil // tutor hasn't opened the room yet
	if _, err := svc.GetParticipantLink(context.Background(), lesson.ID, student); err == nil {
		t.Fatal("missing link must error until the tutor opens the room")
	}
}

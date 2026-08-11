package lessons

import (
	"context"
	"strings"
	"testing"

	"ykay-virtual/internal/notifications"
	"ykay-virtual/internal/tutors"
)

func TestCreateLesson(t *testing.T) {
	tutorService := tutors.NewService()
	_, err := tutorService.CreateProfile(context.Background(), tutors.CreateProfileRequest{
		Name:     "Mr. Adebayo",
		Subject:  "Computer Science",
		Status:   "APPROVED",
		Timezone: "Africa/Lagos",
	})
	if err != nil {
		t.Fatalf("expected tutor to be created: %v", err)
	}

	service := NewService(tutorService)

	response, err := service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-igcse-cs",
		Title:       "IGCSE Computer Science Live Class",
		TutorID:     "tutor-1",
		TutorName:   "Mr. Adebayo",
		StartTime:   "2026-08-20T16:00:00Z",
		EndTime:     "2026-08-20T17:00:00Z",
		Timezone:    "Africa/Lagos",
	})
	if err != nil {
		t.Fatalf("expected lesson to be created: %v", err)
	}

	if response.Lesson.Status != StatusScheduled {
		t.Fatalf("expected scheduled status, got %s", response.Lesson.Status)
	}
}

func TestCreateLessonRequiresApprovedTutor(t *testing.T) {
	tutorService := tutors.NewService()
	_, err := tutorService.CreateProfile(context.Background(), tutors.CreateProfileRequest{
		Name:     "Ms. Okafor",
		Subject:  "Mathematics",
		Status:   "PENDING_REVIEW",
		Timezone: "Africa/Lagos",
	})
	if err != nil {
		t.Fatalf("expected tutor to be created: %v", err)
	}

	service := NewService(tutorService)

	_, err = service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-igcse-math",
		Title:       "Mathematics Live Class",
		TutorID:     "tutor-1",
		TutorName:   "Ms. Okafor",
		StartTime:   "2026-08-20T16:00:00Z",
		EndTime:     "2026-08-20T17:00:00Z",
		Timezone:    "Africa/Lagos",
	})
	if err == nil {
		t.Fatal("expected lesson creation to fail for a non-approved tutor")
	}
	if !strings.Contains(err.Error(), "approved") {
		t.Fatalf("expected approval-related error, got %v", err)
	}
}

func TestMarkAttendance(t *testing.T) {
	tutorService := tutors.NewService()
	_, err := tutorService.CreateProfile(context.Background(), tutors.CreateProfileRequest{
		Name:     "Mr. Adebayo",
		Subject:  "Computer Science",
		Status:   "APPROVED",
		Timezone: "Africa/Lagos",
	})
	if err != nil {
		t.Fatalf("expected tutor to be created: %v", err)
	}

	service := NewService(tutorService)

	created, err := service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-igcse-cs",
		Title:       "IGCSE Computer Science Live Class",
		TutorID:     "tutor-1",
		TutorName:   "Mr. Adebayo",
		StartTime:   "2026-08-20T16:00:00Z",
		EndTime:     "2026-08-20T17:00:00Z",
		Timezone:    "Africa/Lagos",
	})
	if err != nil {
		t.Fatalf("expected lesson to be created: %v", err)
	}

	updated, err := service.MarkAttendance(context.Background(), created.Lesson.ID, StatusAttended, "tutor-1", "TUTOR")
	if err != nil {
		t.Fatalf("expected attendance to be marked: %v", err)
	}

	if updated.Status != StatusAttended {
		t.Fatalf("expected attended status, got %s", updated.Status)
	}
}

// AC-03: A tutor can mark attendance only for assigned lessons/cohorts.
func TestTutorCannotMarkAttendanceForUnassignedLesson(t *testing.T) {
	tutorService := tutors.NewService()
	_, _ = tutorService.CreateProfile(context.Background(), tutors.CreateProfileRequest{
		Name:     "Mr. Adebayo",
		Subject:  "Computer Science",
		Status:   "APPROVED",
		Timezone: "Africa/Lagos",
	})

	service := NewService(tutorService)
	created, _ := service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-igcse-cs",
		Title:       "IGCSE Computer Science Live Class",
		TutorID:     "tutor-1",
		TutorName:   "Mr. Adebayo",
		StartTime:   "2026-08-20T16:00:00Z",
		EndTime:     "2026-08-20T17:00:00Z",
		Timezone:    "Africa/Lagos",
	})

	_, err := service.MarkAttendance(context.Background(), created.Lesson.ID, StatusAttended, "other-tutor-99", "TUTOR")
	if err == nil {
		t.Fatal("expected error when unassigned tutor tries to mark attendance")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "forbidden") {
		t.Fatalf("expected forbidden error, got %v", err)
	}
}

// AC-05: A tutor cannot be double-booked into overlapping lessons without an explicit authorized override.
func TestTutorCannotBeDoubleBookedWithoutOverride(t *testing.T) {
	tutorService := tutors.NewService()
	_, _ = tutorService.CreateProfile(context.Background(), tutors.CreateProfileRequest{
		Name:     "Mr. Adebayo",
		Subject:  "Computer Science",
		Status:   "APPROVED",
		Timezone: "Africa/Lagos",
	})

	service := NewService(tutorService)
	_, _ = service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-1",
		Title:       "Lesson 1",
		TutorID:     "tutor-1",
		TutorName:   "Mr. Adebayo",
		StartTime:   "2026-08-20T16:00:00Z",
		EndTime:     "2026-08-20T17:00:00Z",
		Timezone:    "Africa/Lagos",
	})

	// Overlapping lesson without override should fail
	_, err := service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-2",
		Title:       "Lesson 2 Overlap",
		TutorID:     "tutor-1",
		TutorName:   "Mr. Adebayo",
		StartTime:   "2026-08-20T16:30:00Z",
		EndTime:     "2026-08-20T17:30:00Z",
		Timezone:    "Africa/Lagos",
		Override:    false,
	})
	if err == nil {
		t.Fatal("expected double-booking without override to fail")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "double-booking") {
		t.Fatalf("expected double-booking error, got %v", err)
	}

	// Overlapping lesson WITH override should succeed
	_, err = service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-2",
		Title:       "Lesson 2 Overlap With Override",
		TutorID:     "tutor-1",
		TutorName:   "Mr. Adebayo",
		StartTime:   "2026-08-20T16:30:00Z",
		EndTime:     "2026-08-20T17:30:00Z",
		Timezone:    "Africa/Lagos",
		Override:    true,
	})
	if err != nil {
		t.Fatalf("expected double-booking with override=true to succeed: %v", err)
	}
}

// AC-07: Cancelling/rescheduling a lesson updates dashboards and triggers notifications.
func TestCancelAndRescheduleLessonTriggersNotification(t *testing.T) {
	tutorService := tutors.NewService()
	_, _ = tutorService.CreateProfile(context.Background(), tutors.CreateProfileRequest{
		Name:     "Mr. Adebayo",
		Subject:  "Computer Science",
		Status:   "APPROVED",
		Timezone: "Africa/Lagos",
	})

	notifService := notifications.NewService()
	service := NewService(tutorService).WithNotifications(notifService)

	created, _ := service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-igcse-cs",
		Title:       "IGCSE Computer Science Live Class",
		TutorID:     "tutor-1",
		TutorName:   "Mr. Adebayo",
		StartTime:   "2026-08-20T16:00:00Z",
		EndTime:     "2026-08-20T17:00:00Z",
		Timezone:    "Africa/Lagos",
	})

	rescheduled, err := service.Reschedule(context.Background(), created.Lesson.ID, "2026-08-21T16:00:00Z", "2026-08-21T17:00:00Z", "admin@ykay.ng")
	if err != nil {
		t.Fatalf("expected reschedule to succeed: %v", err)
	}
	if !strings.Contains(rescheduled.Outcome, "Rescheduled") {
		t.Fatalf("expected outcome to contain Rescheduled, got %s", rescheduled.Outcome)
	}

	cancelled, err := service.Cancel(context.Background(), created.Lesson.ID, "Student illness", "admin@ykay.ng")
	if err != nil {
		t.Fatalf("expected cancel to succeed: %v", err)
	}
	if cancelled.Status != StatusCancelled {
		t.Fatalf("expected cancelled status, got %s", cancelled.Status)
	}

	notifs := notifService.ListByUser(context.Background(), "tutor-1")
	if len(notifs) != 2 {
		t.Fatalf("expected 2 notifications (reschedule + cancel), got %d", len(notifs))
	}
}

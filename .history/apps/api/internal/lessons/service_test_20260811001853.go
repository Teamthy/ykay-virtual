package lessons

import (
	"context"
	"strings"
	"testing"

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

	updated, err := service.MarkAttendance(context.Background(), created.Lesson.ID, StatusAttended)
	if err != nil {
		t.Fatalf("expected attendance to be marked: %v", err)
	}

	if updated.Status != StatusAttended {
		t.Fatalf("expected attended status, got %s", updated.Status)
	}
}

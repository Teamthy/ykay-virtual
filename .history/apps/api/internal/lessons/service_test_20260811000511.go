package lessons

import (
	"context"
	"testing"
)

func TestCreateLesson(t *testing.T) {
	service := NewService()

	response, err := service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-igcse-cs",
		Title:       "IGCSE Computer Science Live Class",
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

func TestMarkAttendance(t *testing.T) {
	service := NewService()

	created, err := service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-igcse-cs",
		Title:       "IGCSE Computer Science Live Class",
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

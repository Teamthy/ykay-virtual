package admin

import (
	"context"
	"testing"
)

func TestCreateProgrammeSummary(t *testing.T) {
	service := NewService()

	response, err := service.CreateProgrammeSummary(context.Background(), CreateProgrammeSummaryRequest{
		Title:           "IGCSE Computer Science",
		Curriculum:      "British",
		Status:          "PUBLISHED",
		EnrollmentCount: 12,
	})
	if err != nil {
		t.Fatalf("expected programme summary to be created: %v", err)
	}

	if response.Summary.Title != "IGCSE Computer Science" {
		t.Fatalf("expected title to be preserved, got %s", response.Summary.Title)
	}
}

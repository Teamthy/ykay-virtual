package tuitionrequests

import (
	"context"
	"testing"
)

func TestCreateTuitionRequest(t *testing.T) {
	service := NewService()

	response, err := service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-igcse-cs",
		ParentEmail:  "parent@example.com",
		LearnerName:  "Ada",
		Subject:      "Computer Science",
		Goal:         "Prepare for IGCSE exam",
	})
	if err != nil {
		t.Fatalf("expected tuition request to be created: %v", err)
	}

	if response.Request.Status != StatusPendingReview {
		t.Fatalf("expected pending review status, got %s", response.Request.Status)
	}
}

func TestCreateTuitionRequestRejectsMissingSubject(t *testing.T) {
	service := NewService()

	_, err := service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-igcse-cs",
		ParentEmail:  "parent@example.com",
		LearnerName:  "Ada",
		Subject:      "",
		Goal:         "Prepare for IGCSE exam",
	})
	if err == nil {
		t.Fatal("expected missing subject to be rejected")
	}
}

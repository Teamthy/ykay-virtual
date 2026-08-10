package enrollments

import (
	"context"
	"testing"
)

func TestCreateEnrollment(t *testing.T) {
	service := NewService()

	response, err := service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-igcse-cs",
		ParentEmail: "parent@example.com",
		LearnerName: "Ada",
	})
	if err != nil {
		t.Fatalf("expected enrollment to be created: %v", err)
	}

	if response.Enrollment.Status != StatusPendingPayment {
		t.Fatalf("expected pending payment status, got %s", response.Enrollment.Status)
	}
}

func TestCreateEnrollmentRejectsMissingLearnerName(t *testing.T) {
	service := NewService()

	_, err := service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-igcse-cs",
		ParentEmail: "parent@example.com",
		LearnerName: "",
	})
	if err == nil {
		t.Fatal("expected missing learner name to be rejected")
	}
}

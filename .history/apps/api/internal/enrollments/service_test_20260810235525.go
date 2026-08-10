package enrollments

import (
	"context"
	"testing"
)

func TestCreateEnrollment(t *testing.T) {
	service := NewService()

	enrollment, err := service.Create(context.Background(), CreateRequest{
		ProgrammeID: "prog-igcse-cs",
		ParentEmail: "parent@example.com",
		LearnerName: "Ada",
	})
	if err != nil {
		t.Fatalf("expected enrollment to be created: %v", err)
	}

	if enrollment.Status != StatusPendingPayment {
		t.Fatalf("expected pending payment status, got %s", enrollment.Status)
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

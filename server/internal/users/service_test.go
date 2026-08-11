package users

import (
	"context"
	"strings"
	"testing"
)

func TestCreateAndGetLearner(t *testing.T) {
	s := NewService()
	ctx := context.Background()

	learner, err := s.CreateLearner(ctx, CreateLearnerRequest{
		ParentEmail: "parent@ykay.ng",
		Name:        "Chioma Adebayo",
		AgeBand:     "14-16",
		SchoolYear:  "Year 10",
	})
	if err != nil {
		t.Fatalf("expected learner creation to succeed: %v", err)
	}

	fetched, err := s.GetLearner(ctx, learner.ID, "parent@ykay.ng", "PARENT")
	if err != nil {
		t.Fatalf("expected to get own learner: %v", err)
	}
	if fetched.Name != "Chioma Adebayo" {
		t.Fatalf("expected name Chioma Adebayo, got %s", fetched.Name)
	}
}

func TestParentCannotAccessAnotherFamilyLearner(t *testing.T) {
	s := NewService()
	ctx := context.Background()

	learner, err := s.CreateLearner(ctx, CreateLearnerRequest{
		ParentEmail: "family-a@ykay.ng",
		Name:        "Child A",
		AgeBand:     "11-13",
		SchoolYear:  "Year 7",
	})
	if err != nil {
		t.Fatalf("expected learner creation to succeed: %v", err)
	}

	_, err = s.GetLearner(ctx, learner.ID, "family-b@ykay.ng", "PARENT")
	if err == nil {
		t.Fatal("expected access denied for another family's parent")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "forbidden") {
		t.Fatalf("expected forbidden error, got %v", err)
	}
}

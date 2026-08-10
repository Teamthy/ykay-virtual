package tutors

import (
	"context"
	"testing"
)

func TestCreateTutorProfile(t *testing.T) {
	service := NewService()

	response, err := service.CreateProfile(context.Background(), CreateProfileRequest{
		Name:     "Mr. Adebayo",
		Subject:  "Computer Science",
		Status:   "PENDING_REVIEW",
		Timezone: "Africa/Lagos",
	})
	if err != nil {
		t.Fatalf("expected tutor profile to be created: %v", err)
	}

	if response.Profile.Status != "PENDING_REVIEW" {
		t.Fatalf("expected pending review status, got %s", response.Profile.Status)
	}
}

func TestCreateTutorProfileDefaultsStatusToPendingReview(t *testing.T) {
	service := NewService()

	response, err := service.CreateProfile(context.Background(), CreateProfileRequest{
		Name:    "Ms. Okafor",
		Subject: "Mathematics",
	})
	if err != nil {
		t.Fatalf("expected tutor profile to be created with default status: %v", err)
	}

	if response.Profile.Status != "PENDING_REVIEW" {
		t.Fatalf("expected default status PENDING_REVIEW, got %s", response.Profile.Status)
	}
}

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

func TestUpdateTutorProfileStatus(t *testing.T) {
	service := NewService()

	created, err := service.CreateProfile(context.Background(), CreateProfileRequest{
		Name:    "Dr. Bello",
		Subject: "Physics",
	})
	if err != nil {
		t.Fatalf("expected tutor profile to be created: %v", err)
	}

	updated, err := service.UpdateProfileStatus(context.Background(), created.Profile.ID, "APPROVED")
	if err != nil {
		t.Fatalf("expected tutor profile status to be updated: %v", err)
	}

	if updated.Profile.Status != "APPROVED" {
		t.Fatalf("expected approved status, got %s", updated.Profile.Status)
	}
}

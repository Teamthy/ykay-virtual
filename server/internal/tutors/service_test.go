package tutors

import (
	"context"
	"strings"
	"testing"
)

func TestCreateTutorProfile(t *testing.T) {
	service := NewService()

	response, err := service.CreateProfile(context.Background(), CreateProfileRequest{
		Name:     "Dr. Fatima Aliyu",
		Subject:  "Physics",
		Status:   "APPROVED",
		Timezone: "Africa/Lagos",
	})
	if err != nil {
		t.Fatalf("expected profile to be created: %v", err)
	}

	if response.Profile.Name != "Dr. Fatima Aliyu" {
		t.Fatalf("unexpected name: %s", response.Profile.Name)
	}
}

func TestCreateTutorProfileDefaultsStatusToPendingReview(t *testing.T) {
	service := NewService()

	response, err := service.CreateProfile(context.Background(), CreateProfileRequest{
		Name:     "Mr. Chidi Nwosu",
		Subject:  "Mathematics",
		Timezone: "Africa/Lagos",
	})
	if err != nil {
		t.Fatalf("expected profile to be created: %v", err)
	}

	if response.Profile.Status != "PENDING_REVIEW" {
		t.Fatalf("expected PENDING_REVIEW, got %s", response.Profile.Status)
	}
}

func TestUpdateTutorProfileStatus(t *testing.T) {
	service := NewService()

	created, err := service.CreateProfile(context.Background(), CreateProfileRequest{
		Name:     "Mr. Chidi Nwosu",
		Subject:  "Mathematics",
		Timezone: "Africa/Lagos",
	})
	if err != nil {
		t.Fatalf("expected profile to be created: %v", err)
	}

	updated, err := service.UpdateProfileStatus(context.Background(), created.Profile.ID, "APPROVED")
	if err != nil {
		t.Fatalf("expected status to be updated: %v", err)
	}

	if updated.Profile.Status != "APPROVED" {
		t.Fatalf("expected APPROVED, got %s", updated.Profile.Status)
	}
}

// AC-10: Tutor qualification files are not publicly accessible.
func TestTutorQualificationFilesNotPubliclyAccessible(t *testing.T) {
	service := NewService()
	ctx := context.Background()

	// 1. Upload qualification file
	qual, err := service.UploadQualification(ctx, "tutor-1", "degree_certificate.pdf")
	if err != nil {
		t.Fatalf("expected qualification upload to succeed: %v", err)
	}
	if qual.IsPublic {
		t.Fatal("qualification file must not be marked public")
	}

	// 2. Public / anonymous user access should be rejected
	_, err = service.GetQualificationFile(ctx, qual.ID, "STUDENT", "user-2")
	if err == nil {
		t.Fatal("expected access denied for public/student request")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "forbidden") {
		t.Fatalf("expected forbidden error, got %v", err)
	}

	// 3. Authorized admin access should succeed
	fetched, err := service.GetQualificationFile(ctx, qual.ID, "ACADEMIC_ADMIN", "admin-1")
	if err != nil {
		t.Fatalf("expected admin to access qualification file: %v", err)
	}
	if fetched.Filename != "degree_certificate.pdf" {
		t.Fatalf("expected degree_certificate.pdf, got %s", fetched.Filename)
	}

	// 4. Owner tutor access should succeed
	fetchedOwner, err := service.GetQualificationFile(ctx, qual.ID, "TUTOR", "tutor-1")
	if err != nil {
		t.Fatalf("expected owner tutor to access qualification file: %v", err)
	}
	if fetchedOwner.ID != qual.ID {
		t.Fatalf("expected id match, got %s", fetchedOwner.ID)
	}
}

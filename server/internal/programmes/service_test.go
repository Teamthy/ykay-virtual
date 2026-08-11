package programmes

import (
	"context"
	"strings"
	"testing"
)

func TestListAndGetProgramme(t *testing.T) {
	service := NewService()
	programmes := service.List(false)
	if len(programmes) != 2 {
		t.Fatalf("expected 2 programmes, got %d", len(programmes))
	}

	programme, err := service.Get("prog-igcse-cs")
	if err != nil {
		t.Fatalf("expected programme to be found: %v", err)
	}
	if programme.Title != "IGCSE Computer Science" {
		t.Fatalf("unexpected title: %s", programme.Title)
	}
}

// AC-09: Admin can publish/unpublish a programme without deployment.
func TestAdminCanPublishUnpublishProgramme(t *testing.T) {
	service := NewService()
	ctx := context.Background()

	// 1. Create a draft programme
	draft, err := service.Create(ctx, CreateRequest{
		Title:      "A-Level Physics Bootcamp",
		Curriculum: "British Curriculum",
		Level:      "A Level",
		Subject:    "Physics",
		Format:     "Cohort",
		Summary:    "Intensive revision bootcamp",
		Price:      45000,
		Status:     "DRAFT",
	})
	if err != nil {
		t.Fatalf("expected create programme to succeed: %v", err)
	}

	// 2. Public list should NOT include DRAFT programme
	publicList := service.List(true)
	for _, p := range publicList {
		if p.ID == draft.ID {
			t.Fatalf("public list should not include draft programme %s", draft.ID)
		}
	}

	// 3. Non-admin trying to publish should be forbidden
	_, err = service.UpdateStatus(ctx, draft.ID, "PUBLISHED", "STUDENT")
	if err == nil {
		t.Fatal("expected error when non-admin attempts to publish programme")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "forbidden") {
		t.Fatalf("expected forbidden error, got %v", err)
	}

	// 4. Admin publishing programme should succeed
	published, err := service.UpdateStatus(ctx, draft.ID, "PUBLISHED", "ACADEMIC_ADMIN")
	if err != nil {
		t.Fatalf("expected admin publish to succeed: %v", err)
	}
	if published.Status != "PUBLISHED" {
		t.Fatalf("expected status PUBLISHED, got %s", published.Status)
	}

	// 5. Public list should now INCLUDE the newly published programme without deployment
	publicListAfter := service.List(true)
	found := false
	for _, p := range publicListAfter {
		if p.ID == draft.ID {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("expected published programme to appear in public list")
	}

	// 6. Admin can unpublish programme dynamically
	unpublished, err := service.UpdateStatus(ctx, draft.ID, "UNPUBLISHED", "ACADEMIC_ADMIN")
	if err != nil {
		t.Fatalf("expected unpublish to succeed: %v", err)
	}
	if unpublished.Status != "UNPUBLISHED" {
		t.Fatalf("expected UNPUBLISHED, got %s", unpublished.Status)
	}
}

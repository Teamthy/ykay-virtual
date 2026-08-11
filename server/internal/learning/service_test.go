package learning

import (
	"context"
	"strings"
	"testing"
)

func TestCreateAndGetResourceWithAccess(t *testing.T) {
	s := NewService()
	ctx := context.Background()

	res, err := s.CreateResource(ctx, "prog-igcse-cs", "IGCSE Computer Science Notes", "https://cdn.ykay.ng/notes/cs.pdf", "PDF")
	if err != nil {
		t.Fatalf("expected create resource to succeed: %v", err)
	}

	fetched, err := s.GetResource(ctx, res.ID, []string{"prog-igcse-cs", "prog-igcse-math"})
	if err != nil {
		t.Fatalf("expected get resource to succeed for enrolled student: %v", err)
	}
	if fetched.Title != "IGCSE Computer Science Notes" {
		t.Fatalf("expected title match, got %s", fetched.Title)
	}
}

func TestStudentCannotAccessUnenrolledResource(t *testing.T) {
	s := NewService()
	ctx := context.Background()

	res, err := s.CreateResource(ctx, "prog-igcse-cs", "IGCSE Computer Science Notes", "https://cdn.ykay.ng/notes/cs.pdf", "PDF")
	if err != nil {
		t.Fatalf("expected create resource to succeed: %v", err)
	}

	_, err = s.GetResource(ctx, res.ID, []string{"prog-igcse-math", "prog-waec-physics"})
	if err == nil {
		t.Fatal("expected access denied for unenrolled student")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "forbidden") {
		t.Fatalf("expected forbidden error, got %v", err)
	}
}

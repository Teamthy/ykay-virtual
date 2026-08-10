package programmes

import "testing"

func TestListAndGetProgramme(t *testing.T) {
	service := NewService()
	programmes := service.List()
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

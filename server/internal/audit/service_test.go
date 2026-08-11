package audit

import (
	"context"
	"testing"
)

func TestRecordAndListAuditEvents(t *testing.T) {
	s := NewService()
	ctx := context.Background()

	event := s.Record(ctx, "admin@ykay.ng", "APPROVE_TUTOR", "TutorProfile", "tutor-1", map[string]string{
		"status": "APPROVED",
	})
	if event.ID != "audit-1" {
		t.Fatalf("expected audit-1, got %s", event.ID)
	}

	events := s.List(ctx)
	if len(events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(events))
	}

	filtered := s.GetByTarget(ctx, "TutorProfile", "tutor-1")
	if len(filtered) != 1 {
		t.Fatalf("expected 1 filtered audit event, got %d", len(filtered))
	}
}

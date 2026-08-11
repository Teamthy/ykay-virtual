package admin

import (
	"context"
	"testing"

	"ykay-virtual/internal/audit"
)

func TestCreateProgrammeSummary(t *testing.T) {
	service := NewService()

	response, err := service.CreateProgrammeSummary(context.Background(), CreateProgrammeSummaryRequest{
		Title:           "IGCSE Computer Science",
		Curriculum:      "British",
		Status:          "PUBLISHED",
		EnrollmentCount: 12,
	})
	if err != nil {
		t.Fatalf("expected programme summary to be created: %v", err)
	}

	if response.Summary.Title != "IGCSE Computer Science" {
		t.Fatalf("expected title to be preserved, got %s", response.Summary.Title)
	}
}

func TestGetDashboardKPIs(t *testing.T) {
	service := NewService()
	kpis := service.GetDashboardKPIs(context.Background())
	if kpis.TotalLearners <= 0 || kpis.TotalRevenueNGN <= 0 {
		t.Fatalf("expected positive KPIs, got %+v", kpis)
	}
}

// AC-12: Key administrative changes create an audit event.
func TestAdminChangesCreateAuditEvent(t *testing.T) {
	auditService := audit.NewService()
	service := NewService().WithAudit(auditService)
	ctx := context.Background()

	_, err := service.CreateProgrammeSummary(ctx, CreateProgrammeSummaryRequest{
		Title:           "A-Level Maths",
		Curriculum:      "British",
		Status:          "PUBLISHED",
		EnrollmentCount: 5,
	})
	if err != nil {
		t.Fatalf("expected create summary to succeed: %v", err)
	}

	events := auditService.List(ctx)
	if len(events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(events))
	}
	if events[0].Action != "CREATE_PROGRAMME_SUMMARY" {
		t.Fatalf("unexpected action: %s", events[0].Action)
	}
}

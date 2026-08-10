package payments

import (
	"context"
	"testing"
)

func TestCreateInvoice(t *testing.T) {
	service := NewService()

	response, err := service.Create(context.Background(), CreateRequest{
		LearnerName: "Ada Okafor",
		ProgrammeID: "prog-igcse-cs",
		Amount:      250000,
		Currency:    "NGN",
		Description: "IGCSE Computer Science tuition",
	})
	if err != nil {
		t.Fatalf("expected invoice to be created: %v", err)
	}

	if response.Invoice.Status != StatusPending {
		t.Fatalf("expected pending status, got %s", response.Invoice.Status)
	}
}

func TestMarkInvoicePaid(t *testing.T) {
	service := NewService()

	created, err := service.Create(context.Background(), CreateRequest{
		LearnerName: "Ada Okafor",
		ProgrammeID: "prog-igcse-cs",
		Amount:      250000,
		Currency:    "NGN",
		Description: "IGCSE Computer Science tuition",
	})
	if err != nil {
		t.Fatalf("expected invoice to be created: %v", err)
	}

	updated, err := service.MarkPaid(context.Background(), created.Invoice.ID)
	if err != nil {
		t.Fatalf("expected invoice to be marked as paid: %v", err)
	}

	if updated.Status != StatusPaid {
		t.Fatalf("expected paid status, got %s", updated.Status)
	}
}

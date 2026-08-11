package support

import (
	"context"
	"testing"
)

func TestCreateTicket(t *testing.T) {
	service := NewService()

	response, err := service.Create(context.Background(), CreateRequest{
		Name:    "Ada",
		Email:   "ada@example.com",
		Subject: "Lesson issue",
		Message: "I could not access the live class.",
	})
	if err != nil {
		t.Fatalf("expected ticket to be created: %v", err)
	}

	if response.Ticket.Status != StatusOpen {
		t.Fatalf("expected open status, got %s", response.Ticket.Status)
	}
}

func TestCreateTicketRejectsMissingMessage(t *testing.T) {
	service := NewService()

	_, err := service.Create(context.Background(), CreateRequest{
		Name:    "Ada",
		Email:   "ada@example.com",
		Subject: "Lesson issue",
		Message: "",
	})
	if err == nil {
		t.Fatal("expected missing message to be rejected")
	}
}

package payments

import (
	"context"
	"strings"
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

// AC-06: A verified payment webhook processed twice does not create duplicate enrolments/credits.
func TestVerifiedWebhookProcessedTwiceIsIdempotent(t *testing.T) {
	service := NewService().WithSecretKey("test_secret")
	ctx := context.Background()

	// 1. First webhook processing should succeed and create transaction
	firstResp, err := service.ProcessWebhook(ctx, WebhookRequest{
		Reference: "paystack-ref-9988",
		Amount:    150000,
		Provider:  "PAYSTACK",
		Signature: "test_secret",
	})
	if err != nil {
		t.Fatalf("expected first webhook processing to succeed: %v", err)
	}
	if firstResp.DuplicateIgnored {
		t.Fatal("first processing should not be flagged as duplicate")
	}

	txCountFirst := len(service.ListTransactions(ctx))
	if txCountFirst != 1 {
		t.Fatalf("expected 1 transaction, got %d", txCountFirst)
	}

	// 2. Second webhook processing with SAME reference should be idempotent (no duplicate created)
	secondResp, err := service.ProcessWebhook(ctx, WebhookRequest{
		Reference: "paystack-ref-9988",
		Amount:    150000,
		Provider:  "PAYSTACK",
		Signature: "test_secret",
	})
	if err != nil {
		t.Fatalf("expected second webhook processing to succeed idempotently: %v", err)
	}
	if !secondResp.DuplicateIgnored {
		t.Fatal("second processing should be flagged as duplicate ignored")
	}

	txCountSecond := len(service.ListTransactions(ctx))
	if txCountSecond != 1 {
		t.Fatalf("expected 1 transaction after duplicate webhook, got %d", txCountSecond)
	}

	// 3. Webhook with invalid signature should be rejected
	_, err = service.ProcessWebhook(ctx, WebhookRequest{
		Reference: "paystack-ref-invalid",
		Amount:    150000,
		Provider:  "PAYSTACK",
		Signature: "wrong_secret",
	})
	if err == nil {
		t.Fatal("expected error for invalid signature")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "forbidden") {
		t.Fatalf("expected forbidden error, got %v", err)
	}
}

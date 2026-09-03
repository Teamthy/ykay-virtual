package payment_provider

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newStubPaystack(t *testing.T) (*PaystackProvider, *httptest.Server) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/transferrecipient":
			json.NewEncoder(w).Encode(paystackEnvelope{
				Status: true, Message: "Recipient created",
				Data: paystackData{RecipientCode: "RCP_stub123"},
			})
		case "/transfer":
			json.NewEncoder(w).Encode(paystackEnvelope{
				Status: true, Message: "Transfer requires OTP",
				Data: paystackData{TransferCode: "TRF_stub456", Status: "otp"},
			})
		case "/transfer/finalize":
			json.NewEncoder(w).Encode(paystackEnvelope{
				Status: true, Message: "Transfer completed",
				Data: paystackData{TransferCode: "TRF_stub456", Status: "success"},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)

	// Override the base URL via env (same mechanism as production staging).
	t.Setenv("PAYSTACK_BASE_URL", srv.URL)
	return NewPaystack("sk_live_realSecret123"), srv
}

func TestPaystackTransferRecipientAndFlow(t *testing.T) {
	p, _ := newStubPaystack(t)
	ctx := context.Background()

	code, err := p.CreateTransferRecipient(ctx, TransferRecipientInput{
		AccountNumber: "0123456789", BankCode: "058", AccountName: "Ada Okafor", Email: "t@test.com",
	})
	if err != nil {
		t.Fatalf("CreateTransferRecipient: %v", err)
	}
	if code != "RCP_stub123" {
		t.Fatalf("recipient code = %q, want RCP_stub123", code)
	}

	res, err := p.InitiateTransfer(ctx, 30000, "NGN", code, "payout-ref", "YK-Virtual tutor payout")
	if err != nil {
		t.Fatalf("InitiateTransfer: %v", err)
	}
	if res.Status != TransferOTP || res.TransferCode != "TRF_stub456" {
		t.Fatalf("initiate result = %+v", res)
	}

	final, err := p.FinalizeTransfer(ctx, res.TransferCode, "123456")
	if err != nil {
		t.Fatalf("FinalizeTransfer: %v", err)
	}
	if final.Status != TransferSuccess {
		t.Fatalf("finalize status = %s, want success", final.Status)
	}
}

func TestPaystackTransfers_FailClosedOnPlaceholderSecret(t *testing.T) {
	p := NewPaystack("test-secret")
	ctx := context.Background()

	if _, err := p.CreateTransferRecipient(ctx, TransferRecipientInput{AccountNumber: "1", BankCode: "058", AccountName: "X"}); err == nil {
		t.Fatal("placeholder secret must refuse recipient creation")
	}
	if _, err := p.InitiateTransfer(ctx, 10, "NGN", "rcp", "ref", "reason"); err == nil {
		t.Fatal("placeholder secret must refuse transfer initiation")
	}
	if _, err := p.FinalizeTransfer(ctx, "trf", "123456"); err == nil {
		t.Fatal("placeholder secret must refuse finalize")
	}
}

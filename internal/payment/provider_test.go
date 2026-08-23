package payment_provider

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFlutterwaveVerify_SecretHeader(t *testing.T) {
	p := NewFlutterwave("whsec-test")
	if !p.VerifyWebhookSignature([]byte(`{"event":"charge.completed"}`), "whsec-test", "whsec-test") {
		t.Fatal("verif-hash secret compare must accept")
	}
	if p.VerifyWebhookSignature([]byte(`{}`), "wrong", "whsec-test") {
		t.Fatal("wrong secret must reject")
	}
}

func TestFlutterwaveVerify_HMAC(t *testing.T) {
	secret := "whsec-test"
	body := []byte(`{"event":"charge.completed"}`)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	sig := hex.EncodeToString(mac.Sum(nil))
	p := NewFlutterwave(secret)
	if !p.VerifyWebhookSignature(body, sig, secret) {
		t.Fatal("HMAC-SHA256 signature must accept")
	}
}

func TestPaystackVerify_HMAC(t *testing.T) {
	p := NewPaystack("sk")
	if p.VerifyWebhookSignature([]byte(`{}`), "nope", "sk") {
		t.Fatal("invalid paystack sig must reject")
	}
}

func TestPaystackInitialize_SendsCallbackURL(t *testing.T) {
	var got map[string]any
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &got)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": true,
			"data":   map[string]any{"authorization_url": "https://checkout.paystack.com/x"},
		})
	}))
	defer ts.Close()

	p := &PaystackProvider{Secret: "sk_test", BaseURL: ts.URL, HTTPClient: ts.Client()}
	link, err := p.CreatePaymentLinkWithCallback(1000, "NGN", "REF-1", "a@b.com", "https://app.example.com/receipts/abc")
	if err != nil {
		t.Fatalf("initialize: %v", err)
	}
	if link != "https://checkout.paystack.com/x" {
		t.Fatalf("unexpected link %q", link)
	}
	if got["callback_url"] != "https://app.example.com/receipts/abc" {
		t.Fatalf("callback_url not forwarded, body: %v", got)
	}
	if got["amount"] != float64(100000) {
		t.Fatalf("amount must be in kobo, got %v", got["amount"])
	}
}

func TestFlutterwaveCreatePayment_UsesCallbackAsRedirect(t *testing.T) {
	var got map[string]any
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &got)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "success",
			"data":   map[string]any{"link": "https://checkout.flutterwave.com/x"},
		})
	}))
	defer ts.Close()

	p := &FlutterwaveProvider{Secret: "FLWSECK-test", BaseURL: ts.URL, HTTPClient: ts.Client()}
	if _, err := p.CreatePaymentLinkWithCallback(1000, "NGN", "REF-2", "a@b.com", "https://app.example.com/receipts/xyz"); err != nil {
		t.Fatalf("create payment: %v", err)
	}
	if got["redirect_url"] != "https://app.example.com/receipts/xyz" {
		t.Fatalf("redirect_url not forwarded, body: %v", got)
	}
}

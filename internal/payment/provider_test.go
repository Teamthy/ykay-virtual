package payment_provider

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestPaystackVerifyTransaction_ConvertsKoboAndReportsStatus(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("verify must be GET, got %s", r.Method)
		}
		if !strings.HasPrefix(r.URL.Path, "/transaction/verify/") {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer sk-test" {
			t.Fatalf("missing bearer secret")
		}
		if ref := strings.TrimPrefix(r.URL.Path, "/transaction/verify/"); ref != "NUV-VRF-PS" {
			t.Fatalf("reference not path-escaped into URL: %q", ref)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": true,
			"data": map[string]any{
				"reference": "NUV-VRF-PS",
				"status":    "success",
				"amount":    7_500_000, // kobo
				"currency":  "NGN",
			},
		})
	}))
	defer ts.Close()

	p := &PaystackProvider{Secret: "sk-test", BaseURL: ts.URL, HTTPClient: ts.Client()}
	res, err := p.VerifyTransaction("NUV-VRF-PS")
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !res.IsSuccess() {
		t.Fatalf("expected success, got %q", res.Status)
	}
	if res.Amount != 75000 {
		t.Fatalf("kobo → major conversion failed: %v", res.Amount)
	}
	if res.Currency != "NGN" {
		t.Fatalf("currency: %q", res.Currency)
	}
}

func TestPaystackVerifyTransaction_UnconfiguredReportsPending(t *testing.T) {
	p := NewPaystack("")
	res, err := p.VerifyTransaction("whatever")
	if err != nil {
		t.Fatalf("unconfigured verify must not error: %v", err)
	}
	if res.IsSuccess() {
		t.Fatal("unconfigured gateway must NEVER report success (would settle unpaid orders)")
	}
}

func TestFlutterwaveVerifyTransaction_ReportsMajorUnits(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("tx_ref") != "NUV-VRF-FLW" {
			t.Fatalf("tx_ref not forwarded: %q", r.URL.RawQuery)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "success",
			"data": map[string]any{
				"tx_ref":   "NUV-VRF-FLW",
				"status":   "successful",
				"amount":   75000, // already major units
				"currency": "NGN",
			},
		})
	}))
	defer ts.Close()

	p := &FlutterwaveProvider{Secret: "FLWSECK-test", BaseURL: ts.URL, HTTPClient: ts.Client()}
	res, err := p.VerifyTransaction("NUV-VRF-FLW")
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !res.IsSuccess() {
		t.Fatalf("flutterwave 'successful' must count as success, got %q", res.Status)
	}
	if res.Amount != 75000 {
		t.Fatalf("flutterwave amounts are major units — no conversion: %v", res.Amount)
	}
}

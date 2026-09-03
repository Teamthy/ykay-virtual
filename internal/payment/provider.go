package payment_provider

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// Provider — payment gateway abstraction (Paystack / Flutterwave).
// Webhook signatures are always verified server-side; the client redirect is
// never trusted. CreatePaymentLink returns a hosted checkout URL.

type Provider interface {
	Name() string
	VerifyWebhookSignature(payload []byte, signature string, secret string) bool
	CreatePaymentLink(amount float64, currency, reference, email string) (string, error)
	Refund(reference string, amount float64) error
}

// CallbackLinkCreator — optional capability: providers that can send the payer
// back to an order-specific URL after checkout implement this. PaymentService
// prefers it whenever a callback URL is available, so the payer lands on the
// in-app receipt (which polls the webhook-confirmed order status) instead of
// being stranded on the gateway's generic success page.
type CallbackLinkCreator interface {
	CreatePaymentLinkWithCallback(amount float64, currency, reference, email, callbackURL string) (string, error)
}

// --- Paystack ---

type PaystackProvider struct {
	Secret     string
	BaseURL    string // https://api.paystack.co by default
	HTTPClient *http.Client
}

func NewPaystack(secret string) *PaystackProvider {
	base := "https://api.paystack.co"
	// PAYSTACK_BASE_URL — staging sandbox override (vendor sandbox, gateway
	// mock, or a local simulator). Never set in production.
	if v := os.Getenv("PAYSTACK_BASE_URL"); v != "" {
		base = strings.TrimRight(v, "/")
	}
	return &PaystackProvider{
		Secret:     secret,
		BaseURL:    base,
		HTTPClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *PaystackProvider) Name() string { return "PAYSTACK" }

// Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret.
func (p *PaystackProvider) VerifyWebhookSignature(payload []byte, signature string, secret string) bool {
	mac := hmac.New(sha512.New, []byte(secret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

type paystackInitResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    struct {
		AuthorizationURL string `json:"authorization_url"`
		AccessCode       string `json:"access_code"`
		Reference        string `json:"reference"`
	} `json:"data"`
}

func (p *PaystackProvider) Refund(reference string, amount float64) error {
	if p.Secret == "" || p.Secret == "test-secret" || strings.HasPrefix(p.Secret, "e2e") {
		return nil
	}
	body, _ := json.Marshal(map[string]any{
		"transaction": reference,
		"amount":      int64(amount * 100),
	})
	req, err := http.NewRequest(http.MethodPost, p.BaseURL+"/refund", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+p.Secret)
	req.Header.Set("Content-Type", "application/json")
	res, err := p.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("paystack refund: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		raw, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return fmt.Errorf("paystack refund failed (HTTP %d): %s", res.StatusCode, strings.TrimSpace(string(raw)))
	}
	return nil
}

// VerifyResult — normalized outcome of a server-side transaction
// verification. Used by the payer-facing "confirm now" path when the webhook
// is delayed or lost: the API asks the gateway directly instead of making the
// payer wait for a webhook delivery.
type VerifyResult struct {
	Reference string  // gateway reference as verified
	Status    string  // "success" | "failed" | "pending" | "abandoned" …
	Amount    float64 // MAJOR units as the gateway reports it (already converted)
	Currency  string  // ISO 4217 as reported by the gateway
}

// TransactionVerifier — providers that support direct transaction lookup.
// Both gateways implement it; asserted at the call site so a future provider
// without lookup support degrades gracefully.
type TransactionVerifier interface {
	VerifyTransaction(reference string) (*VerifyResult, error)
}

// IsSuccess reports whether the gateway confirmed the transaction paid
// (same truth table as the webhook isSuccessEvent path).
func (v *VerifyResult) IsSuccess() bool {
	s := strings.ToLower(strings.TrimSpace(v.Status))
	return s == "success" || s == "successful" || s == "completed"
}

// VerifyTransaction — GET /transaction/verify/:reference.
// Amount arrives in KOBO (subunits) exactly like the webhook payload; it is
// converted to major units here so the service can run the same
// reconciliation guards as the webhook path.
func (p *PaystackProvider) VerifyTransaction(reference string) (*VerifyResult, error) {
	if p.Secret == "" || p.Secret == "test-secret" || strings.HasPrefix(p.Secret, "e2e") {
		// Unconfigured (dev/e2e): no live gateway to ask — report pending so
		// the caller never settles from a fabricated confirmation.
		return &VerifyResult{Reference: reference, Status: "pending"}, nil
	}
	req, err := http.NewRequest(http.MethodGet, p.BaseURL+"/transaction/verify/"+url.PathEscape(reference), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+p.Secret)
	res, err := p.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("paystack verify: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		raw, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return nil, fmt.Errorf("paystack verify failed (HTTP %d): %s", res.StatusCode, strings.TrimSpace(string(raw)))
	}
	var out struct {
		Status bool `json:"status"`
		Data   struct {
			Reference string  `json:"reference"`
			Status    string  `json:"status"`
			Amount    float64 `json:"amount"` // kobo
			Currency  string  `json:"currency"`
		} `json:"data"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("paystack verify decode: %w", err)
	}
	return &VerifyResult{
		Reference: out.Data.Reference,
		Status:    strings.ToLower(strings.TrimSpace(out.Data.Status)),
		Amount:    out.Data.Amount / 100,
		Currency:  strings.ToUpper(strings.TrimSpace(out.Data.Currency)),
	}, nil
}

func (p *PaystackProvider) CreatePaymentLink(amount float64, currency, reference, email string) (string, error) {
	return p.CreatePaymentLinkWithCallback(amount, currency, reference, email, "")
}

// CreatePaymentLinkWithCallback — Paystack initialize with an order-specific
// callback_url so the payer returns to the in-app receipt after paying.
func (p *PaystackProvider) CreatePaymentLinkWithCallback(amount float64, currency, reference, email, callbackURL string) (string, error) {
	if p.Secret == "" {
		if strings.EqualFold(os.Getenv("ENVIRONMENT"), "production") || strings.EqualFold(os.Getenv("ENVIRONMENT"), "prod") {
			return "", fmt.Errorf("paystack secret is not configured")
		}
		return fmt.Sprintf("https://paystack.com/pay/%s", reference), nil
	}
	payload := map[string]any{
		"amount":    int64(amount * 100), // kobo
		"currency":  currency,
		"reference": reference,
		"email":     email,
	}
	if callbackURL != "" {
		payload["callback_url"] = callbackURL
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, p.BaseURL+"/transaction/initialize", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+p.Secret)
	req.Header.Set("Content-Type", "application/json")
	res, err := p.HTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("paystack initialize: %w", err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 400 {
		return "", fmt.Errorf("paystack initialize failed")
	}
	var out paystackInitResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", fmt.Errorf("paystack initialize decode: %w", err)
	}
	if !out.Status {
		return "", fmt.Errorf("paystack initialize rejected: %s", out.Message)
	}
	return out.Data.AuthorizationURL, nil
}

// --- Flutterwave ---

type FlutterwaveProvider struct {
	Secret     string
	BaseURL    string
	HTTPClient *http.Client
}

func NewFlutterwave(secret string) *FlutterwaveProvider {
	base := "https://api.flutterwave.com/v3"
	// FLUTTERWAVE_BASE_URL — staging sandbox override (see NewPaystack).
	if v := os.Getenv("FLUTTERWAVE_BASE_URL"); v != "" {
		base = strings.TrimRight(v, "/")
	}
	return &FlutterwaveProvider{
		Secret:     secret,
		BaseURL:    base,
		HTTPClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *FlutterwaveProvider) Name() string { return "FLUTTERWAVE" }

// Flutterwave signs webhooks with HMAC-SHA256 of the raw body (hex) using the
// "FLWSECK-" prefixed secret.
func (p *FlutterwaveProvider) VerifyWebhookSignature(payload []byte, signature string, secret string) bool {
	if secret == "" || signature == "" {
		return false
	}
	// Dashboard "verif-hash" is the secret compared directly (vendor default).
	if hmac.Equal([]byte(signature), []byte(secret)) {
		return true
	}
	// Some integrations HMAC-SHA256 the body with the secret.
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

func (p *FlutterwaveProvider) Refund(reference string, amount float64) error {
	if p.Secret == "" || p.Secret == "test-secret" || strings.HasPrefix(p.Secret, "e2e") {
		return nil
	}
	body, _ := json.Marshal(map[string]any{"amount": amount})
	req, err := http.NewRequest(http.MethodPost, p.BaseURL+"/transactions/"+reference+"/refund", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+p.Secret)
	req.Header.Set("Content-Type", "application/json")
	res, err := p.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("flutterwave refund: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		raw, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return fmt.Errorf("flutterwave refund failed (HTTP %d): %s", res.StatusCode, strings.TrimSpace(string(raw)))
	}
	return nil
}

// VerifyTransaction — GET /transactions/verify-by-reference?tx_ref=…
// Flutterwave reports amounts in MAJOR units (no conversion needed).
func (p *FlutterwaveProvider) VerifyTransaction(reference string) (*VerifyResult, error) {
	if p.Secret == "" || p.Secret == "test-secret" || strings.HasPrefix(p.Secret, "e2e") {
		// Unconfigured (dev/e2e): no live gateway to ask — report pending so
		// the caller never settles from a fabricated confirmation.
		return &VerifyResult{Reference: reference, Status: "pending"}, nil
	}
	req, err := http.NewRequest(http.MethodGet,
		p.BaseURL+"/transactions/verify-by-reference?tx_ref="+url.QueryEscape(reference), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+p.Secret)
	res, err := p.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("flutterwave verify: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		raw, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return nil, fmt.Errorf("flutterwave verify failed (HTTP %d): %s", res.StatusCode, strings.TrimSpace(string(raw)))
	}
	var out struct {
		Status string `json:"status"`
		Data   struct {
			Reference string  `json:"tx_ref"`
			Status    string  `json:"status"`
			Amount    float64 `json:"amount"`
			Currency  string  `json:"currency"`
		} `json:"data"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("flutterwave verify decode: %w", err)
	}
	return &VerifyResult{
		Reference: out.Data.Reference,
		Status:    strings.ToLower(strings.TrimSpace(out.Data.Status)),
		Amount:    out.Data.Amount,
		Currency:  strings.ToUpper(strings.TrimSpace(out.Data.Currency)),
	}, nil
}

func (p *FlutterwaveProvider) CreatePaymentLink(amount float64, currency, reference, email string) (string, error) {
	return p.CreatePaymentLinkWithCallback(amount, currency, reference, email, "")
}

// CreatePaymentLinkWithCallback — Flutterwave hosted payment with an
// order-specific redirect_url (falls back to SITE_URL when absent).
func (p *FlutterwaveProvider) CreatePaymentLinkWithCallback(amount float64, currency, reference, email, callbackURL string) (string, error) {
	if p.Secret == "" {
		if strings.EqualFold(os.Getenv("ENVIRONMENT"), "production") || strings.EqualFold(os.Getenv("ENVIRONMENT"), "prod") {
			return "", fmt.Errorf("flutterwave secret is not configured")
		}
		return fmt.Sprintf("https://checkout.flutterwave.com/pay/%s", reference), nil
	}
	redirect := callbackURL
	if redirect == "" {
		if site := strings.TrimRight(os.Getenv("SITE_URL"), "/"); site != "" {
			redirect = site + "/dashboard"
		} else {
			redirect = "https://virtual.ykaycollege.com/dashboard"
		}
	}
	body, _ := json.Marshal(map[string]any{
		"tx_ref":       reference,
		"amount":       amount,
		"currency":     currency,
		"redirect_url": redirect,
		"customer":     map[string]string{"email": email},
	})
	req, err := http.NewRequest(http.MethodPost, p.BaseURL+"/payments", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+p.Secret)
	req.Header.Set("Content-Type", "application/json")
	res, err := p.HTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("flutterwave create payment: %w", err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 400 {
		return "", fmt.Errorf("flutterwave create payment failed")
	}
	var out struct {
		Status string `json:"status"`
		Data   struct {
			Link string `json:"link"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", fmt.Errorf("flutterwave decode: %w", err)
	}
	if out.Status != "success" {
		return "", fmt.Errorf("flutterwave rejected")
	}
	return out.Data.Link, nil
}

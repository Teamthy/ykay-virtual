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
	"time"
)

// Provider — payment gateway abstraction (Paystack / Flutterwave).
// Webhook signatures are always verified server-side; the client redirect is
// never trusted. CreatePaymentLink returns a hosted checkout URL.

type Provider interface {
	Name() string
	VerifyWebhookSignature(payload []byte, signature string, secret string) bool
	CreatePaymentLink(amount float64, currency, reference, email string) (string, error)
}

// --- Paystack ---

type PaystackProvider struct {
	Secret     string
	BaseURL    string // https://api.paystack.co by default
	HTTPClient *http.Client
}

func NewPaystack(secret string) *PaystackProvider {
	return &PaystackProvider{
		Secret:     secret,
		BaseURL:    "https://api.paystack.co",
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

func (p *PaystackProvider) CreatePaymentLink(amount float64, currency, reference, email string) (string, error) {
	if p.Secret == "" {
		// Dev mode: no secret configured — return a mock link so local
		// development can exercise the full checkout flow.
		return fmt.Sprintf("https://paystack.com/pay/%s", reference), nil
	}
	body, _ := json.Marshal(map[string]any{
		"amount":    int64(amount * 100), // kobo
		"currency":  currency,
		"reference": reference,
		"email":     email,
	})
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
		return "", fmt.Errorf("paystack initialize status %d: %s", res.StatusCode, string(raw))
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
	return &FlutterwaveProvider{
		Secret:     secret,
		BaseURL:    "https://api.flutterwave.com/v3",
		HTTPClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *FlutterwaveProvider) Name() string { return "FLUTTERWAVE" }

// Flutterwave signs webhooks with HMAC-SHA256 of the raw body (hex) using the
// "FLWSECK-" prefixed secret.
func (p *FlutterwaveProvider) VerifyWebhookSignature(payload []byte, signature string, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

func (p *FlutterwaveProvider) CreatePaymentLink(amount float64, currency, reference, email string) (string, error) {
	if p.Secret == "" {
		return fmt.Sprintf("https://checkout.flutterwave.com/pay/%s", reference), nil
	}
	body, _ := json.Marshal(map[string]any{
		"tx_ref":       reference,
		"amount":       amount,
		"currency":     currency,
		"redirect_url": "https://ykayvirtual.com/checkout/verify",
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
		return "", fmt.Errorf("flutterwave create payment status %d: %s", res.StatusCode, string(raw))
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

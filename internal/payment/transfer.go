package payment_provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// TransferProvider — outbound money-movement seam for bank payouts (Paystack
// Transfers). Unlike payment collection, transfers move REAL money out, so
// implementations must never fake success: when not configured (empty or
// test/e2e secret) every call returns an error.
type TransferProvider interface {
	// CreateTransferRecipient registers the bank account with the provider and
	// returns its recipient code (cache this on the tutor profile).
	CreateTransferRecipient(ctx context.Context, in TransferRecipientInput) (string, error)
	// InitiateTransfer moves `amount` (in `currency`) to the recipient.
	// reference makes the call idempotent at the provider.
	InitiateTransfer(ctx context.Context, amount float64, currency, recipientCode, reference, reason string) (TransferResult, error)
	// FinalizeTransfer completes an OTP-gated transfer.
	FinalizeTransfer(ctx context.Context, transferCode, otp string) (TransferResult, error)
}

// TransferRecipientInput — the bank destination.
type TransferRecipientInput struct {
	AccountNumber string
	BankCode      string
	AccountName   string
	Email         string // payer-account email used by some providers for receipts
}

// TransferStatus — provider-side transfer lifecycle.
type TransferStatus string

const (
	TransferSuccess TransferStatus = "success"
	TransferOTP     TransferStatus = "otp"     // provider requires finalize+OTP
	TransferPending TransferStatus = "pending" // bank still processing
	TransferFailed  TransferStatus = "failed"
)

// TransferResult — outcome of initiate/finalize.
type TransferResult struct {
	Status       TransferStatus
	TransferCode string
	Message      string
}

// ── Paystack implementation ───────────────────────────────────────────────

// paystackEnabledSecret — transfer calls are only allowed with a real secret
// (no "test-secret"/"e2e" placeholders). Transfers move real money: fail
// closed.
func paystackTransferSecret(secret string) (string, error) {
	secret = strings.TrimSpace(secret)
	if secret == "" || secret == "test-secret" || strings.HasPrefix(secret, "e2e") {
		return "", fmt.Errorf("paystack transfers not configured (set a real PAYSTACK_SECRET and PAYSTACK_TRANSFER_ENABLED=true)")
	}
	return secret, nil
}

type paystackData struct {
	RecipientCode string `json:"recipient_code"`
	TransferCode  string `json:"transfer_code"`
	Status        string `json:"status"`
	Reference     string `json:"reference"`
}

type paystackEnvelope struct {
	Status  bool         `json:"status"`
	Message string       `json:"message"`
	Data    paystackData `json:"data"`
}

func (p *PaystackProvider) paystackPost(ctx context.Context, path string, payload map[string]any) (*paystackEnvelope, error) {
	secret, err := paystackTransferSecret(p.Secret)
	if err != nil {
		return nil, err
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.BaseURL+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+secret)
	req.Header.Set("Content-Type", "application/json")
	res, err := p.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("paystack %s: %w", path, err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode >= 400 {
		return nil, fmt.Errorf("paystack %s failed (status %d): %s", path, res.StatusCode, strings.TrimSpace(string(raw)))
	}
	var out paystackEnvelope
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("paystack %s decode: %w", path, err)
	}
	if !out.Status {
		return nil, fmt.Errorf("paystack %s rejected: %s", path, out.Message)
	}
	return &out, nil
}

// CreateTransferRecipient — registers a NUBAN bank account.
func (p *PaystackProvider) CreateTransferRecipient(ctx context.Context, in TransferRecipientInput) (string, error) {
	env, err := p.paystackPost(ctx, "/transferrecipient", map[string]any{
		"type":           "nuban",
		"name":           in.AccountName,
		"account_number": in.AccountNumber,
		"bank_code":      in.BankCode,
		"currency":       "NGN",
		"email":          in.Email,
	})
	if err != nil {
		return "", err
	}
	if env.Data.RecipientCode == "" {
		return "", fmt.Errorf("paystack transferrecipient: empty recipient_code")
	}
	return env.Data.RecipientCode, nil
}

// InitiateTransfer — moves money to the recipient. `reference` (the payout
// id) makes retries idempotent at Paystack.
func (p *PaystackProvider) InitiateTransfer(ctx context.Context, amount float64, currency, recipientCode, reference, reason string) (TransferResult, error) {
	env, err := p.paystackPost(ctx, "/transfer", map[string]any{
		"source":    "balance",
		"amount":    int64(amount * 100),
		"currency":  currency,
		"recipient": recipientCode,
		"reference": reference,
		"reason":    reason,
	})
	if err != nil {
		return TransferResult{Status: TransferFailed}, err
	}
	return paystackResult(env), nil
}

// FinalizeTransfer — completes an OTP-gated transfer.
func (p *PaystackProvider) FinalizeTransfer(ctx context.Context, transferCode, otp string) (TransferResult, error) {
	env, err := p.paystackPost(ctx, "/transfer/finalize", map[string]any{
		"transfer_code": transferCode,
		"otp":           otp,
	})
	if err != nil {
		return TransferResult{Status: TransferFailed}, err
	}
	return paystackResult(env), nil
}

func paystackResult(env *paystackEnvelope) TransferResult {
	res := TransferResult{TransferCode: env.Data.TransferCode, Message: env.Message}
	switch strings.ToLower(env.Data.Status) {
	case "success":
		res.Status = TransferSuccess
	case "otp":
		res.Status = TransferOTP
	case "pending":
		res.Status = TransferPending
	default:
		res.Status = TransferFailed
	}
	return res
}

var _ TransferProvider = (*PaystackProvider)(nil)
var _ = time.Now

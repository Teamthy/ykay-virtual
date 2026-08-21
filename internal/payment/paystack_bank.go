package payment_provider

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// BankResolver — resolves Nigerian bank account names via Paystack's
// resolve endpoint. Only enabled when the secret is configured; fail closed
// otherwise (name resolution is a convenience, never a payout path).
type BankResolver struct {
	secret string
	http   *http.Client
}

func NewBankResolver(secret string) *BankResolver {
	return &BankResolver{secret: secret, http: &http.Client{Timeout: 12 * time.Second}}
}

func (b *BankResolver) Enabled() bool { return b.secret != "" }

// ResolveAccountName returns the verified account holder name for a
// (bank_code, account_number) pair.
func (b *BankResolver) ResolveAccountName(accountNumber, bankCode string) (string, error) {
	if !b.Enabled() {
		return "", fmt.Errorf("paystack is not configured")
	}
	q := url.Values{}
	q.Set("account_number", accountNumber)
	q.Set("bank_code", bankCode)
	req, err := http.NewRequest(http.MethodGet, "https://api.paystack.co/bank/resolve?"+q.Encode(), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+b.secret)
	res, err := b.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("paystack bank resolve: %w", err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	var out struct {
		Status  bool   `json:"status"`
		Message string `json:"message"`
		Data    struct {
			AccountName string `json:"account_name"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return "", fmt.Errorf("paystack bank resolve: bad response")
	}
	if !out.Status {
		return "", fmt.Errorf("paystack bank resolve: %s", out.Message)
	}
	return out.Data.AccountName, nil
}

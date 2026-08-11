package payment_provider

import (
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
)

type Provider interface {
	VerifyWebhookSignature(payload []byte, signature string, secret string) bool
}

type PaystackProvider struct{}

func (p PaystackProvider) VerifyWebhookSignature(payload []byte, signature string, secret string) bool {
	mac := hmac.New(sha512.New, []byte(secret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

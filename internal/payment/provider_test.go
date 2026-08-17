package payment_provider

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
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

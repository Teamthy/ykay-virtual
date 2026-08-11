package service

import (
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"

	"ykay-virtual/internal/cache"
	"ykay-virtual/internal/domain/payment"
	payment_provider "ykay-virtual/internal/payment"
)

// newMemCache returns a fresh in-memory cache for service tests.
func newMemCache() *cache.InMemoryCache { return cache.NewInMemoryCache() }

// testProviders wires Paystack + Flutterwave providers with a fixed secret so
// webhook signature tests can compute valid HMACs.
func testProviders() map[payment.PaymentProvider]payment_provider.Provider {
	return map[payment.PaymentProvider]payment_provider.Provider{
		payment.ProviderPaystack:    payment_provider.NewPaystack("test-secret"),
		payment.ProviderFlutterwave: payment_provider.NewFlutterwave("test-secret"),
	}
}

// signPaystack computes the HMAC-SHA512 hex signature Paystack sends.
func signPaystack(payload []byte, secret string) string {
	mac := hmac.New(sha512.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

func strPtr(s string) *string { return &s }

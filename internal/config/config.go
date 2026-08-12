package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
)

// Dev defaults — deliberately permissive so `go run ./cmd/api` works with
// zero configuration. Validate() refuses to start in production unless the
// risky defaults are explicitly overridden (fail-fast, per hardening audit).
const (
	DevDatabaseURL = "postgres://nuvora:nuvora@localhost:5432/nuvora?sslmode=disable"
	DevSiteURL     = "https://nuvora.com"
	DevPort        = "8080"
)

type Config struct {
	Port               string
	DatabaseURL        string
	RedisURL           string
	S3Endpoint         string
	S3PublicBucket     string
	S3PrivateBucket    string
	S3Region           string
	S3AccessKey        string
	S3SecretKey        string
	PaymentProvider    string
	PaystackSecret     string
	FlutterwaveSecret  string
	Environment        string
	OtelEndpoint       string
	SiteURL            string
	AllowedOrigins     string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	GeminiAPIKey       string
	GeminiModel        string
	ChatbotEnabled     bool
	ExpoAccessToken    string
}

func Load() Config {
	return Config{
		Port:            getEnv("PORT", DevPort),
		DatabaseURL:     getEnv("DATABASE_URL", DevDatabaseURL),
		RedisURL:        getEnv("REDIS_URL", "redis://localhost:6379/0"),
		S3Endpoint:      getEnv("S3_ENDPOINT", ""),
		S3PublicBucket:  getEnv("S3_PUBLIC_BUCKET", "nuvora-public"),
		S3PrivateBucket: getEnv("S3_PRIVATE_BUCKET", "nuvora-private"),
		S3Region:        getEnv("S3_REGION", "us-east-1"),
		S3AccessKey:     getEnv("S3_ACCESS_KEY", ""),
		S3SecretKey:     getEnv("S3_SECRET_KEY", ""),
		PaymentProvider: getEnv("PAYMENT_PROVIDER", "PAYSTACK"),
		PaystackSecret:  getEnv("PAYSTACK_SECRET", ""),
		Environment:     getEnv("ENVIRONMENT", "development"),
		OtelEndpoint:    getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
		SiteURL:         getEnv("SITE_URL", DevSiteURL),
		// CORS is fail-closed: empty allowlist means NO cross-origin headers
		// are emitted (the web app talks to the API same-origin through the
		// Next.js rewrite). Production must set explicit origins.
		AllowedOrigins:     getEnv("ALLOWED_ORIGINS", ""),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/v1/auth/google/callback"),
		GeminiAPIKey:       getEnv("GEMINI_API_KEY", ""),
		GeminiModel:        getEnv("GEMINI_MODEL", "gemini-2.0-flash"),
		ChatbotEnabled:     strings.ToLower(getEnv("CHATBOT_ENABLED", "true")) != "false",
		ExpoAccessToken:    getEnv("EXPO_ACCESS_TOKEN", ""),
	}
}

// Validate — fail-fast guard rails for production deployments. Development
// config is intentionally unconstrained; production refuses known-insecure
// or unset-critical values (hardening audit: SEC-002/SEC-004).
func (c Config) Validate() error {
	if c.Environment != "production" {
		return nil
	}
	if c.AllowedOrigins == "" {
		return errors.New("production: ALLOWED_ORIGINS must be an explicit comma-separated list (CORS is fail-closed; empty disables cross-origin entirely)")
	}
	if strings.Contains(c.AllowedOrigins, "*") {
		return fmt.Errorf("production: ALLOWED_ORIGINS must not contain wildcards (got %q)", c.AllowedOrigins)
	}
	if c.DatabaseURL == DevDatabaseURL {
		return errors.New("production: DATABASE_URL must be explicitly configured")
	}
	if c.SiteURL == DevSiteURL {
		return errors.New("production: SITE_URL must be explicitly configured")
	}
	if c.Port == DevPort {
		return errors.New("production: PORT must be explicitly configured")
	}
	if c.GoogleClientID == "" || c.GoogleClientSecret == "" {
		return errors.New("production: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required")
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

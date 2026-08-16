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
	Port              string
	DatabaseURL       string
	RedisURL          string
	S3Endpoint        string
	S3PublicBucket    string
	S3PrivateBucket   string
	S3Region          string
	S3AccessKey       string
	S3SecretKey       string
	PaymentProvider   string
	PaystackSecret    string
	FlutterwaveSecret string
	Environment       string
	OtelEndpoint      string
	SiteURL           string
	AllowedOrigins    string
	// CookieDomain — the session-cookie domain, if any. When the web app and
	// API live on different hosts (e.g. Vercel frontend + Render API), set this
	// to the shared parent domain (".vercel.app" or a custom domain like
	// "nuvora.com") so the browser sends the nuvora_session cookie to the web
	// origin through the proxy. Empty = host-only cookie (default).
	CookieDomain       string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	GeminiAPIKey       string
	GeminiModel        string
	ChatbotEnabled     bool
	ExpoAccessToken    string
	TermiiAPIKey       string
	TermiiSenderID     string
	TermiiFrom         string
	MeetingProvider    string
	WherebyAPIKey      string
	// AI guardrails (G4.3): per-request token cap + daily budget. When the
	// budget is exhausted the assistant degrades to a canned fallback reply
	// instead of failing the chat.
	AIMaxTokensPerRequest int
	AIDailyBudgetTokens   int
	// SeedDemoData enables fixture accounts/catalogue only for explicit local development.
	// It must never be enabled in production.
	SeedDemoData bool
}

func Load() Config {
	cfg := Config{
		Port:              getEnv("PORT", DevPort),
		DatabaseURL:       getEnv("DATABASE_URL", DevDatabaseURL),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379/0"),
		S3Endpoint:        getEnv("S3_ENDPOINT", ""),
		S3PublicBucket:    getEnv("S3_PUBLIC_BUCKET", "nuvora-public"),
		S3PrivateBucket:   getEnv("S3_PRIVATE_BUCKET", "nuvora-private"),
		S3Region:          getEnv("S3_REGION", "us-east-1"),
		S3AccessKey:       getEnv("S3_ACCESS_KEY", ""),
		S3SecretKey:       getEnv("S3_SECRET_KEY", ""),
		PaymentProvider:   getEnv("PAYMENT_PROVIDER", "PAYSTACK"),
		PaystackSecret:    getEnv("PAYSTACK_SECRET", ""),
		FlutterwaveSecret: getEnv("FLUTTERWAVE_SECRET", ""),
		Environment:       getEnv("ENVIRONMENT", "development"),
		OtelEndpoint:      getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
		SiteURL:           getEnv("SITE_URL", DevSiteURL),
		// CORS is fail-closed: empty allowlist means NO cross-origin headers
		// are emitted (the web app talks to the API same-origin through the
		// Next.js rewrite). Production must set explicit origins.
		AllowedOrigins:     getEnv("ALLOWED_ORIGINS", ""),
		CookieDomain:       getEnv("COOKIE_DOMAIN", ""),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:3100/auth/google/callback"),
		GeminiAPIKey:       getEnv("GEMINI_API_KEY", ""),
		GeminiModel:        getEnv("GEMINI_MODEL", "gemini-2.0-flash"),
		ChatbotEnabled:     strings.ToLower(getEnv("CHATBOT_ENABLED", "true")) != "false",
		ExpoAccessToken:    getEnv("EXPO_ACCESS_TOKEN", ""),
		TermiiAPIKey:       getEnv("TERMII_API_KEY", ""),
		TermiiSenderID:     getEnv("TERMII_SENDER_ID", ""),
		TermiiFrom:         getEnv("TERMII_FROM", ""),
		MeetingProvider:    getEnv("MEETING_PROVIDER", "stub"),
		WherebyAPIKey:      getEnv("WHEREBY_API_KEY", ""),
		SeedDemoData:       strings.EqualFold(getEnv("SEED_DEMO_DATA", "false"), "true"),
	}
	if v := getEnvInt("AI_MAX_TOKENS_PER_REQUEST", 1024); v > 0 {
		cfg.AIMaxTokensPerRequest = v
	} else {
		cfg.AIMaxTokensPerRequest = 1024
	}
	if v := getEnvInt("AI_DAILY_BUDGET_TOKENS", 200000); v > 0 {
		cfg.AIDailyBudgetTokens = v
	} else {
		cfg.AIDailyBudgetTokens = 200000
	}
	return cfg
}

// Validate — fail-fast guard rails for production deployments. Development
// config is intentionally unconstrained; production refuses known-insecure
// or unset-critical values (hardening audit: SEC-002/SEC-004).
func (c Config) Validate() error {
	if c.Environment != "production" {
		return nil
	}
	if c.SeedDemoData {
		return errors.New("production: SEED_DEMO_DATA must be false")
	}
	if c.AllowedOrigins == "" {
		return errors.New("production: ALLOWED_ORIGINS must be an explicit comma-separated list (CORS is fail-closed; empty disables cross-origin entirely)")
	}
	if strings.Contains(c.AllowedOrigins, "*") {
		return fmt.Errorf("production: ALLOWED_ORIGINS must not contain wildcards (got %q)", c.AllowedOrigins)
	}
	// Presence checks (YK-003): require the env var to be EXPLICITLY set,
	// rather than comparing the value against a dev default — otherwise a
	// legitimate production value that equals the default (e.g. PORT=8080)
	// is wrongly rejected.
	if _, ok := os.LookupEnv("PORT"); !ok {
		return errors.New("production: PORT must be explicitly configured")
	}
	if _, ok := os.LookupEnv("DATABASE_URL"); !ok {
		return errors.New("production: DATABASE_URL must be explicitly configured")
	}
	if _, ok := os.LookupEnv("SITE_URL"); !ok {
		return errors.New("production: SITE_URL must be explicitly configured")
	}
	// Fail-closed on payment secrets (YK-009): an enabled provider must have a
	// strong, non-empty webhook secret in production, else HMAC verification
	// is forgeable and payment init silently falls back to mock behaviour.
	if c.PaymentProvider != "" && c.PaymentProvider != "none" {
		if c.PaymentProvider == "PAYSTACK" {
			sec, ok := os.LookupEnv("PAYSTACK_SECRET")
			if !ok || strings.TrimSpace(sec) == "" {
				return errors.New("production: PAYSTACK_SECRET must be set when PAYMENT_PROVIDER=PAYSTACK (empty secret makes webhook HMAC forgeable)")
			}
		}
		if c.PaymentProvider == "FLUTTERWAVE" {
			sec, ok := os.LookupEnv("FLUTTERWAVE_SECRET")
			if !ok || strings.TrimSpace(sec) == "" {
				return errors.New("production: FLUTTERWAVE_SECRET must be set when PAYMENT_PROVIDER=FLUTTERWAVE (empty secret makes webhook HMAC forgeable)")
			}
		}
	}
	// Google OAuth is OPTIONAL: the login buttons degrade gracefully when
	// creds are absent, so missing creds must not block a production deploy.
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// getEnvInt parses an integer env var; returns fallback on parse failure.
func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		var n int
		if _, err := fmt.Sscanf(v, "%d", &n); err == nil {
			return n
		}
	}
	return fallback
}

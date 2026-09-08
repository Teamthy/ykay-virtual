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
	DevDatabaseURL = "postgres://ykvirtual:ykvirtual@localhost:5432/ykvirtual?sslmode=disable"
	DevSiteURL     = "https://virtual.ykaycollege.com"
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
	// API live on different hosts, set this to the custom registrable domain
	// ("virtual.ykaycollege.com"). Never ".vercel.app" (public suffix). Empty = host-only.
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
	// YK-013: YKAY College federated login. YK Virtual has its own identity
	// store; rather than duplicating College credentials into it, a presented
	// College session is verified against the College portal, which stays the
	// single source of truth for suspension/revocation.
	//
	// CollegeAPIURL is the base URL of the EDU Portal (no trailing slash).
	// CollegeSSOSecret is the shared service secret sent as
	// X-College-SSO-Secret; it must equal the portal's COLLEGE_SSO_SECRET and
	// must NOT be the portal's AUTH_SECRET.
	CollegeAPIURL    string
	CollegeSSOSecret string

	// CBTAttemptSecret signs the stateless practice-bank attempt tickets
	// (paper draw → grade binding: student, ids, deadline). Optional: when
	// empty a random per-boot key is used (tickets die on restart). Set it
	// to survive restarts / share across instances.
	CBTAttemptSecret string
	// SeedDemoData enables fixture accounts/catalogue only for explicit local development.
	// It must never be enabled in production.
	SeedDemoData bool
}

// IsProduction reports whether this process must use production fail-closed
// guards. Accepts production / prod / PRODUCTION (case-insensitive).
func (c Config) IsProduction() bool {
	switch strings.ToLower(strings.TrimSpace(c.Environment)) {
	case "production", "prod":
		return true
	default:
		return false
	}
}

func Load() Config {
	cfg := Config{
		Port:              getEnv("PORT", DevPort),
		DatabaseURL:       getEnv("DATABASE_URL", DevDatabaseURL),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379/0"),
		S3Endpoint:        getEnv("S3_ENDPOINT", ""),
		S3PublicBucket:    getEnv("S3_PUBLIC_BUCKET", "yk-virtual-public"),
		S3PrivateBucket:   getEnv("S3_PRIVATE_BUCKET", "yk-virtual-private"),
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
		// Empty by default: federated College login is opt-in, and an unset
		// URL disables the endpoint entirely rather than calling a dev default.
		CollegeAPIURL:    strings.TrimRight(getEnv("COLLEGE_API_URL", ""), "/"),
		CollegeSSOSecret: getEnv("COLLEGE_SSO_SECRET", ""),
		CBTAttemptSecret: getEnv("CBT_ATTEMPT_SECRET", ""),
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
	if !c.IsProduction() {
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

	// YK-011: reject TEST-MODE provider credentials in production.
	//
	// The presence check above only proves the variable is non-empty, so
	// copying `.env.production.example` (which ships `PAYSTACK_SECRET=sk_test_…`)
	// straight into a production deploy passes validation and then silently
	// runs live traffic against Paystack's sandbox: real customers get charged
	// nothing, nothing settles, and the webhook is signed with a test secret.
	// That failure is invisible from inside the app — every call returns 200.
	//
	// Checked for BOTH providers regardless of the active one, because
	// cmd/api registers a webhook route for each and verifies it against
	// that provider's configured secret.
	for _, p := range []struct{ name, env string }{
		{"Paystack", "PAYSTACK_SECRET"},
		{"Flutterwave", "FLUTTERWAVE_SECRET"},
	} {
		sec := strings.TrimSpace(os.Getenv(p.env))
		if sec == "" {
			continue // absence is handled by the presence check above
		}
		lower := strings.ToLower(sec)
		for _, marker := range []string{"sk_test_", "pk_test_", "flw_secret_test", "flwseck_test"} {
			if strings.HasPrefix(lower, marker) || strings.Contains(lower, "_test_") {
				return fmt.Errorf(
					"production: %s looks like a %s TEST-MODE credential (%q…). "+
						"Live payments will not settle against a sandbox key — set the live secret, "+
						"or unset %s entirely to disable that provider",
					p.env, p.name, marker, p.env,
				)
			}
		}
	}
	if _, ok := os.LookupEnv("METRICS_TOKEN"); !ok || strings.TrimSpace(os.Getenv("METRICS_TOKEN")) == "" {
		return errors.New("production: METRICS_TOKEN must be set (open /metrics is forbidden)")
	}

	// YK-013: federated College login is opt-in, but half-configured is not a
	// legal state. A URL with no secret means every verification would be
	// rejected by the portal (403) and users would see "invalid login" with no
	// server-side explanation; a secret with no URL means the endpoint is
	// silently disabled. Fail at boot instead.
	if (c.CollegeAPIURL != "") != (c.CollegeSSOSecret != "") {
		return errors.New("production: COLLEGE_API_URL and COLLEGE_SSO_SECRET must be set together (or both left empty to disable YKAY College federated login)")
	}
	if c.CollegeSSOSecret != "" && len(c.CollegeSSOSecret) < 32 {
		return errors.New("production: COLLEGE_SSO_SECRET must be at least 32 characters")
	}
	if c.CBTAttemptSecret != "" && len(c.CBTAttemptSecret) < 32 {
		return errors.New("production: CBT_ATTEMPT_SECRET must be at least 32 characters")
	}
	if c.CollegeAPIURL != "" && !strings.HasPrefix(c.CollegeAPIURL, "https://") {
		return errors.New("production: COLLEGE_API_URL must be https (the shared secret and session tokens cross the network)")
	}
	dbURL := c.DatabaseURL
	if strings.Contains(dbURL, "sslmode=disable") &&
		!strings.Contains(dbURL, "localhost") &&
		!strings.Contains(dbURL, "127.0.0.1") &&
		!strings.Contains(dbURL, "@postgres:") {
		return errors.New("production: DATABASE_URL must not use sslmode=disable against a remote host")
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

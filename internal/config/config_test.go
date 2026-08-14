package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Production fail-fast validation (hardening SEC-002/SEC-004): known dev
// defaults must refuse to start in production.
func TestValidate_ProductionFailFast(t *testing.T) {
	orig := os.Environ()
	t.Cleanup(func() {
		os.Clearenv()
		for _, kv := range orig {
			k, v := splitEnv(kv)
			_ = os.Setenv(k, v)
		}
	})

	set := func(kv map[string]string) {
		os.Clearenv()
		for k, v := range kv {
			_ = os.Setenv(k, v)
		}
	}

	prodOK := map[string]string{
		"ENVIRONMENT":          "production",
		"PORT":                 "443",
		"DATABASE_URL":         "postgres://u:p@prod.example.com:5432/nuvora?sslmode=require",
		"SITE_URL":             "https://app.nuvora.com",
		"ALLOWED_ORIGINS":      "https://app.nuvora.com",
		"GOOGLE_CLIENT_ID":     "id",
		"GOOGLE_CLIENT_SECRET": "secret",
	}

	t.Run("valid production config passes", func(t *testing.T) {
		set(prodOK)
		require.NoError(t, Load().Validate())
	})

	t.Run("google creds optional in production", func(t *testing.T) {
		// Google OAuth degrades gracefully — missing creds must not block deploy.
		set(prodOK)
		require.NoError(t, Load().Validate())
	})

	t.Run("demo fixture seed rejected in production", func(t *testing.T) {
		cfg := map[string]string{}
		for k, v := range prodOK {
			cfg[k] = v
		}
		cfg["SEED_DEMO_DATA"] = "true"
		set(cfg)
		assert.Error(t, Load().Validate())
	})

	t.Run("wildcard origins rejected in production", func(t *testing.T) {
		cfg := map[string]string{}
		for k, v := range prodOK {
			cfg[k] = v
		}
		cfg["ALLOWED_ORIGINS"] = "*"
		set(cfg)
		assert.Error(t, Load().Validate())
	})

	t.Run("empty origins rejected in production", func(t *testing.T) {
		cfg := prodOK
		cfg["ALLOWED_ORIGINS"] = ""
		set(cfg)
		assert.Error(t, Load().Validate())
	})

	t.Run("default database url rejected in production", func(t *testing.T) {
		cfg := prodOK
		cfg["DATABASE_URL"] = DevDatabaseURL
		set(cfg)
		assert.Error(t, Load().Validate())
	})

	t.Run("default site url rejected in production", func(t *testing.T) {
		cfg := prodOK
		cfg["SITE_URL"] = DevSiteURL
		set(cfg)
		assert.Error(t, Load().Validate())
	})

	t.Run("development defaults pass (dev is unconstrained)", func(t *testing.T) {
		os.Clearenv()
		require.NoError(t, Load().Validate())
	})
}

func splitEnv(kv string) (string, string) {
	for i := 0; i < len(kv); i++ {
		if kv[i] == '=' {
			return kv[:i], kv[i+1:]
		}
	}
	return kv, ""
}

// TestG4EnvSurface — regression for the FlutterwaveSecret bug (declared but
// never loaded: webhook verification always failed) + the G4.3 AI caps.
func TestG4EnvSurface(t *testing.T) {
	os.Clearenv()
	defer os.Clearenv()
	t.Setenv("FLUTTERWAVE_SECRET", "FW_SECRET_TEST_1")
	t.Setenv("PAYSTACK_SECRET", "sk_test_1")
	t.Setenv("TERMII_API_KEY", "TL_xxx")
	t.Setenv("MEETING_PROVIDER", "whereby")
	t.Setenv("WHEREBY_API_KEY", "wk_1")
	t.Setenv("AI_MAX_TOKENS_PER_REQUEST", "2048")
	t.Setenv("AI_DAILY_BUDGET_TOKENS", "99999")

	cfg := Load()
	if cfg.FlutterwaveSecret != "FW_SECRET_TEST_1" {
		t.Fatalf("FlutterwaveSecret not loaded from env (webhook verification would break): %q", cfg.FlutterwaveSecret)
	}
	if cfg.PaystackSecret != "sk_test_1" {
		t.Fatalf("PaystackSecret = %q", cfg.PaystackSecret)
	}
	if cfg.TermiiAPIKey != "TL_xxx" || cfg.MeetingProvider != "whereby" || cfg.WherebyAPIKey != "wk_1" {
		t.Fatalf("G4.2 env surface not loaded: %+v", cfg)
	}
	if cfg.AIMaxTokensPerRequest != 2048 || cfg.AIDailyBudgetTokens != 99999 {
		t.Fatalf("AI caps not loaded: max=%d budget=%d", cfg.AIMaxTokensPerRequest, cfg.AIDailyBudgetTokens)
	}
}

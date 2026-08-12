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

	t.Run("wildcard origins rejected in production", func(t *testing.T) {
		cfg := prodOK
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

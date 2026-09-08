package config

import (
	"strings"
	"testing"
)

// setProdEnv configures the minimum environment Validate() requires to get
// past its earlier presence checks, so a test can reach the payment-credential
// assertions. t.Setenv restores the environment automatically.
func setProdEnv(t *testing.T, extra map[string]string) {
	t.Helper()

	base := map[string]string{
		"ENVIRONMENT":     "production",
		"PORT":            "8080",
		"DATABASE_URL":    "postgres://u:p@db.internal:5432/ykv?sslmode=require",
		"SITE_URL":        "https://virtual.ykaycollege.com",
		"ALLOWED_ORIGINS": "https://virtual.ykaycollege.com",
		"METRICS_TOKEN":   "metrics-token-value",
		"SEED_DEMO_DATA":  "false",
	}
	for k, v := range extra {
		base[k] = v
	}
	for k, v := range base {
		t.Setenv(k, v)
	}
	// Variables the caller did not specify must be cleared, not inherited from
	// the ambient environment.
	for _, k := range []string{"PAYSTACK_SECRET", "FLUTTERWAVE_SECRET", "PAYMENT_PROVIDER"} {
		if _, specified := extra[k]; !specified {
			t.Setenv(k, "")
		}
	}
}

// YK-011: a test-mode provider credential must never start a production
// process. Copying .env.production.example (which ships PAYSTACK_SECRET=
// sk_test_…) into a deploy would otherwise pass validation and silently run
// live traffic against the sandbox, where nothing settles and the failure is
// invisible from inside the app.
func TestValidate_ProductionRejectsTestModePaymentSecrets(t *testing.T) {
	cases := []struct {
		name   string
		env    map[string]string
		wantIn string
	}{
		{
			name:   "paystack sk_test_ secret key",
			env:    map[string]string{"PAYMENT_PROVIDER": "PAYSTACK", "PAYSTACK_SECRET": "sk_test_abc123def456"},
			wantIn: "TEST-MODE",
		},
		{
			name:   "paystack pk_test_ key pasted into the secret slot",
			env:    map[string]string{"PAYMENT_PROVIDER": "PAYSTACK", "PAYSTACK_SECRET": "pk_test_abc123"},
			wantIn: "TEST-MODE",
		},
		{
			name:   "flutterwave test secret",
			env:    map[string]string{"PAYMENT_PROVIDER": "FLUTTERWAVE", "FLUTTERWAVE_SECRET": "FLW_SECRET_TEST_abcdef-XXXX"},
			wantIn: "TEST-MODE",
		},
		{
			// The active provider has a valid LIVE key, but Flutterwave's
			// secret is test-mode and cmd/api still registers its webhook route.
			name: "inactive provider is still checked",
			env: map[string]string{
				"PAYMENT_PROVIDER":   "PAYSTACK",
				"PAYSTACK_SECRET":    "sk_live_a1b2c3d4e5f6",
				"FLUTTERWAVE_SECRET": "FLWSECK_TEST-abcdef123456",
			},
			wantIn: "TEST-MODE",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			setProdEnv(t, tc.env)

			err := Load().Validate()
			if err == nil {
				t.Fatalf("Validate() = nil, want error containing %q", tc.wantIn)
			}
			if !strings.Contains(err.Error(), tc.wantIn) {
				t.Fatalf("Validate() error = %q, want it to contain %q", err.Error(), tc.wantIn)
			}
		})
	}
}

// The mirror case: live-mode credentials must be accepted, otherwise the guard
// would simply make production unbootable.
func TestValidate_ProductionAcceptsLiveModePaymentSecrets(t *testing.T) {
	setProdEnv(t, map[string]string{
		"PAYMENT_PROVIDER":   "PAYSTACK",
		"PAYSTACK_SECRET":    "sk_live_9f8e7d6c5b4a3210",
		"FLUTTERWAVE_SECRET": "FLWSECK-9f8e7d6c5b4a3210abcdef",
	})

	if err := Load().Validate(); err != nil {
		t.Fatalf("Validate() = %v, want nil for live-mode credentials", err)
	}
}

// An unset secret for the INACTIVE provider must stay legal — operators disable
// a provider by leaving its variable empty, and that must not block a deploy.
func TestValidate_ProductionAllowsUnsetInactiveProviderSecret(t *testing.T) {
	setProdEnv(t, map[string]string{
		"PAYMENT_PROVIDER": "PAYSTACK",
		"PAYSTACK_SECRET":  "sk_live_9f8e7d6c5b4a3210",
	})

	if err := Load().Validate(); err != nil {
		t.Fatalf("Validate() = %v, want nil when the inactive provider has no secret", err)
	}
}

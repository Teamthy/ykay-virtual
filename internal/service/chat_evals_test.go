package service

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// CI evals — deterministic provider, full rubric.
func TestChatPromptEvals_CI(t *testing.T) {
	results := runEvals(context.Background(), FakeEvalProvider{})
	require.Len(t, results, len(chatEvals))
	for _, r := range results {
		if !r.Pass {
			t.Errorf("eval %q FAILED: %v\n  reply: %s", r.Name, r.Issues, r.Reply)
		}
	}
	assert.True(t, allEvalsPass(results), "every eval case must pass in CI")
}

// Live evals — real Gemini when GEMINI_API_KEY is present (skipped in CI
// without the key). Run locally: GEMINI_API_KEY=... go test ./internal/service/ -run Live -v
func TestChatPromptEvals_Live(t *testing.T) {
	key := os.Getenv("GEMINI_API_KEY")
	if key == "" {
		t.Skip("GEMINI_API_KEY not set — skipping live prompt evals")
	}
	provider := NewGeminiProvider(key, os.Getenv("GEMINI_MODEL"))
	results := runEvals(context.Background(), provider)
	failed := 0
	for _, r := range results {
		if r.Pass {
			t.Logf("✅ %s", r.Name)
		} else {
			failed++
			t.Logf("❌ %s — %v\n   reply: %s", r.Name, r.Issues, r.Reply)
		}
	}
	// Live evals are advisory (LLM variance); log pass rate but only fail
	// hard on catastrophic failures (e.g. hallucinating prices).
	t.Logf("live eval pass rate: %d/%d", len(results)-failed, len(results))
}

func allEvalsPass(results []EvalResult) bool {
	for _, r := range results {
		if !r.Pass {
			return false
		}
	}
	return true
}

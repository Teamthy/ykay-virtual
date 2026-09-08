package bankdata

import (
	encsv "encoding/csv"
	"strings"
	"testing"
)

// TestBankCSVIsValid — CI gate for the embedded question bank. Every row must
// carry a subject slug, a stem, four non-empty options, an in-range key, a
// non-empty explanation and a source; stems must be unique per subject (the
// importer's dedupe key), because duplicates silently shrink a seeded bank.
func TestBankCSVIsValid(t *testing.T) {
	r := encsv.NewReader(strings.NewReader(CSV()))
	header, err := r.Read()
	if err != nil {
		t.Fatalf("bank csv header: %v", err)
	}
	want := []string{"subjectSlug", "subjectName", "classLevel", "department", "topic",
		"difficulty", "stem", "optionA", "optionB", "optionC", "optionD",
		"correctIndex", "explanation", "source"}
	for i, h := range want {
		if i >= len(header) || header[i] != h {
			t.Fatalf("column %d: got %q want %q", i, header[i], h)
		}
	}
	seen := map[string]bool{}
	total := 0
	for {
		row, err := r.Read()
		if err != nil {
			break
		}
		total++
		g := func(i int) string { return strings.TrimSpace(row[i]) }
		if g(0) == "" || g(6) == "" || g(7) == "" || g(8) == "" || g(9) == "" || g(10) == "" {
			t.Fatalf("row %d: empty required field: %v", total+1, row)
		}
		key := g(11)
		if key != "0" && key != "1" && key != "2" && key != "3" {
			t.Fatalf("row %d: correctIndex %q out of range", total+1, key)
		}
		// Legacy rows (pre-2026-09) carry terse explanations — enriching all
		// 2,061 of them is tracked in docs/CBT-EXPANSION.md. New NERDC-aligned
		// tranches must meet the quality bar from day one.
		if g(12) == "" {
			t.Fatalf("row %d: missing explanation: %q", total+1, g(6))
		}
		if strings.HasPrefix(g(13), "nerdc-") && len(g(12)) < 40 {
			t.Fatalf("row %d: nerdc explanation too thin (%d chars): %q", total+1, len(g(12)), g(6))
		}
		if g(13) == "" {
			t.Fatalf("row %d: missing source", total+1)
		}
		dupKey := strings.ToLower(g(0) + "|" + g(6))
		if seen[dupKey] {
			t.Fatalf("row %d: duplicate stem in subject %s: %q", total+1, g(0), g(6))
		}
		seen[dupKey] = true
	}
	if total < 2100 {
		t.Fatalf("bank shrank unexpectedly: %d questions", total)
	}
}

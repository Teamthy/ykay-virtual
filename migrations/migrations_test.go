package migrations

import (
	"strings"
	"testing"
)

// TestChainStatic is the CI migration-safety gate (no DB required). It runs
// as part of `go test ./...` and fails the build if the embedded chain has
// duplicate version numbers or git conflict markers — the two conditions that
// broke a live deploy (two files both numbered 000044, and `<<<<<<<`
// conflict markers injected by `git apply --3way`).
func TestChainStatic(t *testing.T) {
	files, err := Files()
	if err != nil {
		t.Fatalf("Files(): %v", err)
	}
	if len(files) == 0 {
		t.Fatal("no embedded migration files found")
	}
	if err := Validate(files); err != nil {
		t.Fatalf("Validate(): %v", err)
	}

	// Each version must have an .up.sql; missing up would silently skip it.
	ups := map[int]bool{}
	downs := map[int]bool{}
	for _, f := range files {
		if f.Up {
			ups[f.Version] = true
		} else {
			downs[f.Version] = true
		}
	}
	for v := range ups {
		if !downs[v] {
			// Missing .down.sql disables that version's rollback but does not
			// block an upgrade, so it is reported (not failed) here.
			t.Logf("notice: version %06d has an .up.sql but no .down.sql", v)
		}
	}

	// No file may contain conflict markers (defensive, Validate already checks).
	for _, f := range files {
		for _, marker := range []string{"<<<<<<<", ">>>>>>>"} {
			if strings.Contains(f.SQL, marker) {
				t.Errorf("%s contains %q", f.Name, marker)
			}
		}
	}
}

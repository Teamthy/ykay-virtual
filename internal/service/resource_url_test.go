package service

import (
	"errors"
	"testing"

	"ykay-virtual/internal/domain"
)

func TestNormalizeResourceURL(t *testing.T) {
	cases := []struct {
		in   string
		want string
		err  bool
	}{
		{"https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz12345/view?usp=sharing",
			"https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz12345/preview", false},
		{"https://docs.google.com/file/d/shortID/view", "", true}, // too-short id
		{"https://example.com/notes.pdf", "https://example.com/notes.pdf", false},
		{"javascript:alert(1)", "", true},
		{"file:///etc/passwd", "", true},
		{"   ", "", false}, // empty link is allowed (no URL)
	}
	for _, tc := range cases {
		got, err := NormalizeResourceURL(tc.in)
		if tc.err {
			if err == nil {
				t.Fatalf("expected error for %q", tc.in)
			}
			if !errors.Is(err, domain.ErrInvalidInput) {
				t.Fatalf("expected ErrInvalidInput for %q, got %v", tc.in, err)
			}
			continue
		}
		if err != nil {
			t.Fatalf("unexpected error for %q: %v", tc.in, err)
		}
		if got != tc.want {
			t.Fatalf("NormalizeResourceURL(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

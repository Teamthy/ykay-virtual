package postgres

import (
	"errors"
	"fmt"
	"testing"
)

// sqlStateErr mimics lib/pq's *pq.Error (SQLState() method, no Code()).
type sqlStateErr struct{ state string }

func (e *sqlStateErr) Error() string    { return "pq: " + e.state }
func (e *sqlStateErr) SQLState() string { return e.state }

// codeErr mimics pgx-style errors (Code() method).
type codeErr struct{ code string }

func (e *codeErr) Error() string { return "pgx: " + e.code }
func (e *codeErr) Code() string  { return e.code }

func TestIsUniqueViolation(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want bool
	}{
		{"lib/pq 23505", &sqlStateErr{state: "23505"}, true},
		{"lib/pq other", &sqlStateErr{state: "42501"}, false},
		{"pgx-style 23505", &codeErr{code: "23505"}, true},
		{"pgx-style other", &codeErr{code: "23503"}, false},
		{"wrapped lib/pq", fmt.Errorf("create webhook: %w", &sqlStateErr{state: "23505"}), true},
		{"non-pq error", errors.New("boom"), false},
	}
	for _, c := range cases {
		if got := isUniqueViolation(c.err); got != c.want {
			t.Errorf("%s: isUniqueViolation = %v, want %v", c.name, got, c.want)
		}
	}
}

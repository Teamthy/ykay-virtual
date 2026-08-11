package pkg

import (
	"regexp"
	"strings"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

func ValidateEmail(email string) bool {
	return emailRegex.MatchString(strings.TrimSpace(email))
}

func ValidateRequiredString(s string, field string) []ErrorDetail {
	if strings.TrimSpace(s) == "" {
		return []ErrorDetail{{Field: field, Message: field + " is required"}}
	}
	return nil
}

func ValidateMinLength(s string, min int, field string) []ErrorDetail {
	if len(strings.TrimSpace(s)) < min {
		return []ErrorDetail{{Field: field, Message: field + " must be at least " + string(rune(min)) + " characters"}}
	}
	return nil
}

package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"testing"

	"ykay-virtual/internal/domain"
)

// A-29 — the auth edge maps ErrEmailDelivery to 503 EMAIL_UNAVAILABLE so
// clients can show "email delivery is down, retry soon" instead of treating
// it like a server bug (or worse, a bad code).

func TestWriteAppError_EmailDelivery_Maps503(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteAppError(rec, fmt.Errorf("%w: we couldn't send your code right now", domain.ErrEmailDelivery))

	if rec.Code != 503 {
		t.Fatalf("expected 503, got %d", rec.Code)
	}
	var body struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Error.Code != "EMAIL_UNAVAILABLE" {
		t.Fatalf("expected EMAIL_UNAVAILABLE, got %s", body.Error.Code)
	}
	if body.Error.Message == "" || body.Error.Message == "email delivery unavailable" {
		t.Fatalf("user-facing message must be the actionable one, got %q", body.Error.Message)
	}
	_ = domain.ErrEmailDelivery // sentinel reference for future table tests
}

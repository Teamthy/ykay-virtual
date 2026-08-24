package httpapi

import (
	"bufio"
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"ykay-virtual/internal/middleware"
	"ykay-virtual/internal/realtime"

	"github.com/google/uuid"
)

// Phase 5b — the SSE stream endpoint. Auth is the standard session actor;
// events written for the subscribed user must arrive on the wire before the
// test deadline; anonymous requests are rejected before the stream opens.

func TestEventsStream_RequiresAuth(t *testing.T) {
	h := NewEventsHandler(realtime.NewBroker(nil))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/me/events", nil)
	rec := httptest.NewRecorder()
	h.Stream(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous stream must 401, got %d", rec.Code)
	}
}

func TestEventsStream_DeliversEvents(t *testing.T) {
	broker := realtime.NewBroker(nil)
	defer broker.Close()
	h := NewEventsHandler(broker)
	h.heartbeatsInterval = 50 * time.Millisecond
	h.maxLife = 5 * time.Second

	user := uuid.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/me/events", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.ActorKey, middleware.Actor{UserID: user}))
	rec := httptest.NewRecorder()

	streamDone := make(chan struct{})
	go func() {
		defer close(streamDone)
		h.Stream(rec, req)
	}()

	// Give the handler a moment to subscribe, then publish for this user.
	time.Sleep(100 * time.Millisecond)
	broker.Publish(context.Background(), realtime.Event{
		Type: realtime.EventMessageNew, Recipient: user, ConversationID: "c-1", MessageID: "m-1",
	})
	// A message for someone else must never leak onto this stream.
	broker.Publish(context.Background(), realtime.Event{
		Type: realtime.EventMessageNew, Recipient: uuid.New(),
	})

	// Read incrementally from the recorded response.
deadline:
	for start := time.Now(); time.Since(start) < 2*time.Second; {
		body := rec.Body.String()
		if strings.Contains(body, "event: message.new") &&
			strings.Contains(body, `"conversation_id":"c-1"`) {
			break deadline
		}
		time.Sleep(25 * time.Millisecond)
	}
	body := rec.Body.String()
	if !strings.Contains(body, ": connected") {
		t.Fatalf("stream must open with a comment frame, got %q", body)
	}
	if !strings.Contains(body, "event: message.new") {
		t.Fatalf("event frame missing, got %q", body)
	}
	if strings.Contains(body, `"recipient":"`+uuid.New().String()) {
		t.Fatal("cross-user leak")
	}
	// count message.new frames: exactly one (the other-user event filtered).
	if got := strings.Count(body, "event: message.new"); got != 1 {
		t.Fatalf("expected exactly 1 message.new frame, got %d in %q", got, body)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/event-stream") {
		t.Fatalf("content-type must be text/event-stream, got %q", ct)
	}
	_ = streamDone
}

func TestEventsStream_SSEWireFormat(t *testing.T) {
	// The frames must parse as standard SSE: named events with a single
	// JSON data line (EventSource compatibility).
	broker := realtime.NewBroker(nil)
	defer broker.Close()
	h := NewEventsHandler(broker)
	h.heartbeatsInterval = time.Hour // no heartbeat noise
	h.maxLife = 2 * time.Second

	user := uuid.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/me/events", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.ActorKey, middleware.Actor{UserID: user}))
	rec := httptest.NewRecorder()

	done := make(chan struct{})
	go func() { h.Stream(rec, req); close(done) }()
	time.Sleep(100 * time.Millisecond)
	broker.Publish(context.Background(), realtime.Event{Type: realtime.EventMessageNew, Recipient: user})
	<-done // maxLife closes the stream

	scanner := bufio.NewScanner(strings.NewReader(rec.Body.String()))
	sawNamedFrame := false
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "event: ") {
			sawNamedFrame = true
		}
		if strings.HasPrefix(line, "data: ") && !sawNamedFrame {
			t.Fatalf("data line before any event frame: %q", line)
		}
	}
	if !sawNamedFrame {
		t.Fatal("no named event frame on the wire")
	}
}

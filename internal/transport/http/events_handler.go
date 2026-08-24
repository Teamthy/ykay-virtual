package httpapi

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"ykay-virtual/internal/realtime"
)

// EventsHandler — GET /api/v1/me/events (Phase 5b realtime).
//
// Server-Sent Events stream: one long-lived response per authenticated user
// carrying that user's poke events ("message.new" …). Clients keep their
// interval polling as the fallback; this stream only makes fresh data arrive
// instantly instead of on the next poll tick.
//
//   - Heartbeat every 25s keeps proxies/LBs from idling the connection.
//   - Stream recycles after maxStreamLife (EventSource reconnects by
//     itself, so the recycle is invisible to users).
//   - Auth identical to every other /me route (httpOnly session cookie).
type EventsHandler struct {
	broker  *realtime.Broker
	heartbeatsInterval time.Duration
	maxLife time.Duration
}

func NewEventsHandler(broker *realtime.Broker) *EventsHandler {
	return &EventsHandler{broker: broker, heartbeatsInterval: 25 * time.Second, maxLife: 9 * time.Minute}
}

func (h *EventsHandler) Stream(w http.ResponseWriter, r *http.Request) {
	actor := requireActor(w, r)
	if actor == nil {
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		WriteAppError(w, fmt.Errorf("streaming unsupported"))
		return
	}

	// SSE headers: no-cache (never), no-transform (defeat transparent
	// proxies), X-Accel-Buffering (nginx/Render-style proxies: do not
	// buffer this response).
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	writeSSE := func(payload string) bool {
		if _, err := io.WriteString(w, payload); err != nil {
			return false
		}
		flusher.Flush()
		return true
	}

	if !writeSSE(": connected\n\n") {
		return
	}

	events, cancel := h.broker.Subscribe(actor.UserID)
	defer cancel()

	heartbeat := time.NewTicker(h.heartbeatsInterval)
	defer heartbeat.Stop()
	lifetime := time.NewTimer(h.maxLife)
	defer lifetime.Stop()

	for {
		select {
		case <-r.Context().Done(): // client closed the tab / navigated away
			return
		case <-lifetime.C: // polite recycle; EventSource reconnects
			_ = writeSSE("event: recycle\ndata: {\"reason\":\"max_lifetime\"}\n\n")
			return
		case <-heartbeat.C:
			if !writeSSE(": ping\n\n") {
				return
			}
		case ev := <-events:
			data, err := json.Marshal(ev)
			if err != nil {
				continue
			}
			// Named event + JSON payload: addEventListener("message.new", …)
			if !writeSSE(fmt.Sprintf("event: %s\ndata: %s\n\n", ev.Type, data)) {
				return
			}
		}
	}
}

// compile-time: the handler must satisfy the mux signature.
var _ http.HandlerFunc = (&EventsHandler{broker: nil}).Stream

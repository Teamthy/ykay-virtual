// Package realtime — the Phase 5b live-event layer.
//
// A per-instance in-memory hub fans events out to connected SSE streams;
// when Redis is configured, publishes also go through a Redis pub/sub
// channel so every API instance receives every event (multi-instance
// fan-out). Without Redis the hub still works — events simply reach only
// the instance that produced them (fine for single-instance dev/e2e).
//
// Events are deliberately tiny "poke" signals ("a new message exists for
// user X in conversation Y"). The client responds by refetching through the
// normal REST endpoints — there is exactly one source of truth for data.
package realtime

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// Event types. Keep stable — clients match on these strings.
const (
	EventMessageNew      = "message.new"
	EventNotificationNew = "notification.new"
)

// Event — one deliverable poke for one user.
type Event struct {
	Type           string    `json:"type"`
	Recipient      uuid.UUID `json:"recipient"`
	ConversationID string    `json:"conversation_id,omitempty"`
	MessageID      string    `json:"message_id,omitempty"`
	At             time.Time `json:"at"`
}

// redisChannel — all instances subscribe here; each message is one Event.
const redisChannel = "ykvirtual:events"

// subscriber buffer — a slow client must never block the publisher. On
// overflow the oldest events are dropped: the client still has interval
// polling as the correctness net, realtime is a latency optimisation.
const subBuffer = 32

type Broker struct {
	mu   sync.RWMutex
	subs map[uuid.UUID]map[chan Event]struct{}
	rd   *redis.Client
	// done closes with the Redis subscribe loop.
	done chan struct{}
}

// NewBroker — pass a Redis client for cross-instance fan-out, or nil for a
// local-only hub (single-instance deployments / dev / tests).
func NewBroker(rd *redis.Client) *Broker {
	b := &Broker{subs: make(map[uuid.UUID]map[chan Event]struct{}), rd: rd, done: make(chan struct{})}
	if rd != nil {
		go b.redisLoop()
	}
	return b
}

// Subscribe registers a stream for userID. The returned channel receives
// that user's events; call the cancel func to unsubscribe (always defer it).
func (b *Broker) Subscribe(userID uuid.UUID) (<-chan Event, func()) {
	ch := make(chan Event, subBuffer)
	b.mu.Lock()
	if b.subs[userID] == nil {
		b.subs[userID] = make(map[chan Event]struct{})
	}
	b.subs[userID][ch] = struct{}{}
	b.mu.Unlock()
	cancel := func() {
		b.mu.Lock()
		if set, ok := b.subs[userID]; ok {
			delete(set, ch)
			if len(set) == 0 {
				delete(b.subs, userID)
			}
		}
		b.mu.Unlock()
		// No drain needed: every send is non-blocking (select/default), so a
		// dead-but-full channel can never stall a publisher; it is GC'd once
		// the handler drops its reference.
	}
	return ch, cancel
}

// Publish delivers ev to the recipient's streams on this instance and, when
// Redis is wired, to every other instance. Fire-and-forget by design: a
// delivery problem degrades to polling, never to a failed user request.
func (b *Broker) Publish(ctx context.Context, ev Event) {
	if ev.At.IsZero() {
		ev.At = time.Now().UTC()
	}
	b.localDeliver(ev)
	if b.rd != nil {
		payload, err := json.Marshal(ev)
		if err == nil {
			if err := b.rd.Publish(ctx, redisChannel, payload).Err(); err != nil {
				slog.Warn("realtime: redis publish failed", "error", err)
			}
		}
	}
}

// UserEvent — convenience used by services (matches the service-layer
// realtimePublisher interface).
func (b *Broker) UserEvent(ctx context.Context, userID uuid.UUID, eventType, conversationID, messageID string) {
	b.Publish(ctx, Event{Type: eventType, Recipient: userID, ConversationID: conversationID, MessageID: messageID})
}

// localDeliver — non-blocking send per subscriber; drop-oldest on overflow.
func (b *Broker) localDeliver(ev Event) {
	b.mu.RLock()
	set := b.subs[ev.Recipient]
	// Copy the set: cancel() takes the write lock and may run concurrently.
	chans := make([]chan Event, 0, len(set))
	for ch := range set {
		chans = append(chans, ch)
	}
	b.mu.RUnlock()
	for _, ch := range chans {
		select {
		case ch <- ev:
		default: // buffer full — drop oldest, push newest
			select {
			case <-ch:
			default:
			}
			select {
			case ch <- ev:
			default:
			}
		}
	}
}

// redisLoop — subscribe once; every received event fans out locally.
func (b *Broker) redisLoop() {
	sub := b.rd.Subscribe(context.Background(), redisChannel)
	defer sub.Close()
	ch := sub.Channel()
	for {
		select {
		case <-b.done:
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			var ev Event
			if err := json.Unmarshal([]byte(msg.Payload), &ev); err != nil {
				continue
			}
			b.localDeliver(ev)
		}
	}
}

// Close stops the Redis subscribe loop. Registered streams are closed by
// their owning HTTP handlers on connection teardown.
func (b *Broker) Close() {
	select {
	case <-b.done:
	default:
		close(b.done)
	}
}

// Subscribers — observability (tests, /health debugging).
func (b *Broker) Subscribers() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	n := 0
	for _, set := range b.subs {
		n += len(set)
	}
	return n
}

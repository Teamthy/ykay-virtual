package realtime

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

func jsonMarshal(v any) ([]byte, error)   { return json.Marshal(v) }
func jsonUnmarshal(b []byte, v any) error { return json.Unmarshal(b, v) }

func TestBroker_LocalPubSub(t *testing.T) {
	b := NewBroker(nil)
	defer b.Close()
	uid := uuid.New()

	ch, cancel := b.Subscribe(uid)
	defer cancel()

	b.Publish(context.Background(), Event{Type: EventMessageNew, Recipient: uid, ConversationID: "c1", MessageID: "m1"})
	select {
	case ev := <-ch:
		if ev.Type != EventMessageNew || ev.ConversationID != "c1" || ev.MessageID != "m1" {
			t.Fatalf("payload mismatch: %+v", ev)
		}
		if ev.At.IsZero() {
			t.Fatal("publisher must stamp At when unset")
		}
	case <-time.After(time.Second):
		t.Fatal("event not delivered locally")
	}
}

func TestBroker_NoDeliveryToOtherUsers(t *testing.T) {
	b := NewBroker(nil)
	defer b.Close()
	a, bID := uuid.New(), uuid.New()

	chA, cancelA := b.Subscribe(a)
	defer cancelA()
	chB, cancelB := b.Subscribe(bID)
	defer cancelB()

	b.Publish(context.Background(), Event{Type: EventMessageNew, Recipient: bID})
	select {
	case <-chB:
	default:
		t.Fatal("recipient must receive")
	}
	select {
	case ev := <-chA:
		t.Fatalf("must not leak to another user: %+v", ev)
	default:
	}
}

func TestBroker_MultiStreamSameUser(t *testing.T) {
	b := NewBroker(nil)
	defer b.Close()
	uid := uuid.New()

	ch1, c1 := b.Subscribe(uid)
	defer c1()
	ch2, c2 := b.Subscribe(uid)
	defer c2()

	b.Publish(context.Background(), Event{Type: EventNotificationNew, Recipient: uid})
	for i, ch := range []<-chan Event{ch1, ch2} {
		select {
		case <-ch:
		default:
			t.Fatalf("stream %d did not receive the event", i+1)
		}
	}
	if n := b.Subscribers(); n != 2 {
		t.Fatalf("expected 2 subscribers, got %d", n)
	}
}

func TestBroker_UnsubscribeStopsDelivery(t *testing.T) {
	b := NewBroker(nil)
	defer b.Close()
	uid := uuid.New()

	ch, cancel := b.Subscribe(uid)
	cancel() // immediately

	b.Publish(context.Background(), Event{Type: EventMessageNew, Recipient: uid})
	if n := b.Subscribers(); n != 0 {
		t.Fatalf("subscriber leaked after cancel: %d", n)
	}
	select {
	case ev := <-ch:
		t.Fatalf("cancelled stream received an event: %+v", ev)
	default:
	}
}

func TestBroker_SlowSubscriberDoesNotBlockPublisher(t *testing.T) {
	b := NewBroker(nil)
	defer b.Close()
	uid := uuid.New()

	_, cancel := b.Subscribe(uid) // never drained
	defer cancel()

	done := make(chan struct{})
	go func() {
		defer close(done)
		for i := 0; i < subBuffer*4; i++ {
			b.Publish(context.Background(), Event{Type: EventMessageNew, Recipient: uid})
		}
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("publisher blocked on a slow subscriber")
	}
}

func TestEvent_JSONRoundTrip(t *testing.T) {
	uid := uuid.New()
	ev := Event{Type: EventMessageNew, Recipient: uid, ConversationID: "c9", MessageID: "m9", At: time.Now().UTC().Truncate(0)}
	data, err := jsonMarshal(ev)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var back Event
	if err := jsonUnmarshal(data, &back); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if back.Type != ev.Type || back.Recipient != uid || back.ConversationID != "c9" || back.MessageID != "m9" {
		t.Fatalf("round-trip mismatch: %+v", back)
	}
}

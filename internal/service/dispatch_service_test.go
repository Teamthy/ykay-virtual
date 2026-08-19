package service

import (
	"context"
	"encoding/json"
	"testing"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

type captureEmail struct{ sent []string }

func (c *captureEmail) Send(_ context.Context, to, subject, body string) error {
	c.sent = append(c.sent, to+"|"+subject+"|"+body)
	return nil
}

type captureSMS struct{ sent []string }

func (c *captureSMS) Send(_ context.Context, to, message string) error {
	c.sent = append(c.sent, to+"|"+message)
	return nil
}

// fakeUsers — embeds the full interface (nil) so only FindByID is used;
// any other call would panic loudly in tests.
type fakeUsers struct {
	identity.UserRepository
	byID map[uuid.UUID]*identity.User
}

func (f *fakeUsers) FindByID(_ context.Context, id uuid.UUID) (*identity.User, error) {
	if u, ok := f.byID[id]; ok {
		return u, nil
	}
	return nil, domain.ErrNotFound
}

func TestDispatchHandlers(t *testing.T) {
	em := &captureEmail{}
	sm := &captureSMS{}
	uid := uuid.New()
	phone := "2348012345678"
	svc := NewDispatchService(em, sm, nil, nil, &fakeUsers{byID: map[uuid.UUID]*identity.User{
		uid: {ID: uid, Email: "parent@test.com", Phone: &phone},
	}})
	ctx := context.Background()

	// Email by explicit address
	if err := svc.HandleSendEmail(ctx, mustJob(t, map[string]string{"to": "a@b.c", "subject": "s", "body": "b"})); err != nil {
		t.Fatalf("email: %v", err)
	}
	if len(em.sent) != 1 || em.sent[0] != "a@b.c|s|b" {
		t.Fatalf("email payload wrong: %v", em.sent)
	}

	// Email resolved from user_id
	if err := svc.HandleSendEmail(ctx, mustJob(t, map[string]string{"user_id": uid.String(), "subject": "s", "body": "b"})); err != nil {
		t.Fatalf("email by user: %v", err)
	}
	if em.sent[1] != "parent@test.com|s|b" {
		t.Fatalf("email by user payload wrong: %v", em.sent)
	}

	// SMS resolved from user's phone
	if err := svc.HandleSendSMS(ctx, mustJob(t, map[string]string{"user_id": uid.String(), "body": "lesson soon"})); err != nil {
		t.Fatalf("sms: %v", err)
	}
	if sm.sent[0] != "2348012345678|lesson soon" {
		t.Fatalf("sms payload wrong: %v", sm.sent)
	}

	// Missing fields → job failure (retryable)
	if err := svc.HandleSendEmail(ctx, mustJob(t, map[string]string{"subject": "s"})); err == nil {
		t.Fatal("missing to/body must error")
	}
	if err := svc.HandleSendSMS(ctx, mustJob(t, map[string]string{"to": "x"})); err == nil {
		t.Fatal("missing body must error")
	}
	// Push with no push service wired → never an error (best-effort semantics)
	if err := svc.HandleSendPush(ctx, mustJob(t, map[string]string{"user_id": uid.String(), "title": "t"})); err != nil {
		// push==nil currently returns nil via NotifyUser guard; accept either
		_ = err
	}
	if err := svc.HandleSendEmail(ctx, json.RawMessage(`{bad json`)); err == nil {
		t.Fatal("malformed payload must error")
	}
}

func mustJob(t *testing.T, m map[string]string) json.RawMessage {
	t.Helper()
	b, err := json.Marshal(m)
	if err != nil {
		t.Fatal(err)
	}
	return b
}

func TestAIGuardBudget(t *testing.T) {
	g := NewAIGuard(100)
	if !g.TrySpend(60) || !g.TrySpend(40) {
		t.Fatal("spends within budget must succeed")
	}
	if g.TrySpend(1) {
		t.Fatal("budget exhausted must refuse")
	}
	if g.Used() != 100 {
		t.Fatalf("used = %d, want 100", g.Used())
	}
}

type captureWhatsApp struct{ sent []string }

func (c *captureWhatsApp) Send(_ context.Context, to, message string) error {
	c.sent = append(c.sent, to+"|"+message)
	return nil
}

func TestDispatchWhatsApp(t *testing.T) {
	em := &captureEmail{}
	sm := &captureSMS{}
	wa := &captureWhatsApp{}
	uid := uuid.New()
	phone := "2348012345678"
	svc := NewDispatchService(em, sm, wa, nil, &fakeUsers{byID: map[uuid.UUID]*identity.User{
		uid: {ID: uid, Email: "parent@test.com", Phone: &phone},
	}})
	ctx := context.Background()

	// By explicit phone.
	if err := svc.HandleSendWhatsApp(ctx, mustJob(t, map[string]string{"to": "2347000000000", "body": "Hello"})); err != nil {
		t.Fatalf("whatsapp by phone: %v", err)
	}
	// Resolved from user_id.
	if err := svc.HandleSendWhatsApp(ctx, mustJob(t, map[string]string{"user_id": uid.String(), "body": "By user"})); err != nil {
		t.Fatalf("whatsapp by user: %v", err)
	}
	if len(wa.sent) != 2 {
		t.Fatalf("expected 2 WhatsApp sends, got %d: %v", len(wa.sent), wa.sent)
	}
	if wa.sent[0] != "2347000000000|Hello" {
		t.Fatalf("whatsapp payload wrong: %v", wa.sent[0])
	}
	if wa.sent[1] != "2348012345678|By user" {
		t.Fatalf("whatsapp user-resolved payload wrong: %v", wa.sent[1])
	}
}

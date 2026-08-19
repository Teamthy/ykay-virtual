package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/notification"
)

// DispatchService — durable-queue notification dispatch (G4.1/G4.2).
//
// The API enqueues send_email / send_sms / send_push jobs; the worker runs
// these handlers with the real adapters (SMTP/console, Termii/console,
// Expo/console). Handlers are idempotent by contract: a redelivery at most
// re-sends a message (at-least-once), never mutates business state.
type DispatchService struct {
	email    notification.EmailSender
	sms      notification.SMSSender
	whatsapp notification.WhatsAppSender
	push     *PushService
	users    identity.UserRepository
}

func NewDispatchService(email notification.EmailSender, sms notification.SMSSender,
	whatsapp notification.WhatsAppSender, push *PushService, users identity.UserRepository) *DispatchService {
	return &DispatchService{email: email, sms: sms, whatsapp: whatsapp, push: push, users: users}
}

// HandleSendWhatsApp — send_whatsapp job handler (idempotent). Resolves the
// recipient's phone from the user record when only a user_id is provided.
func (s *DispatchService) HandleSendWhatsApp(ctx context.Context, raw json.RawMessage) error {
	j, err := decodeDispatchJob(raw)
	if err != nil {
		return err
	}
	if j.To == "" && j.UserID != "" {
		if u, err := s.users.FindByID(ctx, uuid.MustParse(j.UserID)); err == nil && u.Phone != nil {
			j.To = *u.Phone
		}
	}
	if j.To == "" || j.Body == "" {
		return fmt.Errorf("send_whatsapp: missing to/body")
	}
	if s.whatsapp == nil {
		return fmt.Errorf("send_whatsapp: WhatsApp sender not configured")
	}
	return s.whatsapp.Send(ctx, j.To, j.Body)
}

// DispatchJob payloads (kept flat for queue JSON compatibility).
type DispatchJob struct {
	UserID  string            `json:"user_id,omitempty"`
	To      string            `json:"to,omitempty"` // email or phone override
	Subject string            `json:"subject,omitempty"`
	Body    string            `json:"body,omitempty"`
	Title   string            `json:"title,omitempty"`
	Data    map[string]string `json:"data,omitempty"`
}

func decodeDispatchJob(raw json.RawMessage) (DispatchJob, error) {
	var j DispatchJob
	if len(raw) == 0 {
		return j, fmt.Errorf("empty payload")
	}
	if err := json.Unmarshal(raw, &j); err != nil {
		return j, fmt.Errorf("bad payload: %w", err)
	}
	return j, nil
}

// HandleSendEmail — send_email job handler (idempotent).
func (s *DispatchService) HandleSendEmail(ctx context.Context, raw json.RawMessage) error {
	j, err := decodeDispatchJob(raw)
	if err != nil {
		return err
	}
	if j.To == "" && j.UserID != "" {
		if u, err := s.users.FindByID(ctx, uuid.MustParse(j.UserID)); err == nil {
			j.To = u.Email
		}
	}
	if j.To == "" || j.Body == "" {
		return fmt.Errorf("send_email: missing to/body")
	}
	return s.email.Send(ctx, j.To, j.Subject, j.Body)
}

// HandleSendSMS — send_sms job handler (idempotent).
func (s *DispatchService) HandleSendSMS(ctx context.Context, raw json.RawMessage) error {
	j, err := decodeDispatchJob(raw)
	if err != nil {
		return err
	}
	if j.To == "" && j.UserID != "" {
		if u, err := s.users.FindByID(ctx, uuid.MustParse(j.UserID)); err == nil && u.Phone != nil {
			j.To = *u.Phone
		}
	}
	if j.To == "" || j.Body == "" {
		return fmt.Errorf("send_sms: missing to/body")
	}
	return s.sms.Send(ctx, j.To, j.Body)
}

// HandleSendPush — send_push job handler (idempotent).
func (s *DispatchService) HandleSendPush(ctx context.Context, raw json.RawMessage) error {
	j, err := decodeDispatchJob(raw)
	if err != nil {
		return err
	}
	if j.UserID == "" || j.Title == "" {
		return fmt.Errorf("send_push: missing user_id/title")
	}
	id, err := uuid.Parse(j.UserID)
	if err != nil {
		return fmt.Errorf("send_push: bad user_id: %w", err)
	}
	if err := s.push.NotifyUser(ctx, id, j.Title, j.Body, j.Data); err != nil {
		// Best-effort semantics: no devices / provider outage is logged but
		// not retried forever (delivery failure ≠ job failure).
		slog.Warn("dispatch: push skipped", "user_id", j.UserID, "error", err)
		return nil
	}
	return nil
}

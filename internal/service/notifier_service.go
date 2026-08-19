package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"

	"ykay-virtual/internal/notification"
	"ykay-virtual/internal/worker"
)

// NotifierService — outbound notification producer (gap #4).
// When a durable queue is available it enqueues send_whatsapp jobs for the
// worker; otherwise it dispatches directly through the injected WhatsApp
// sender (dev fallback). Fails closed if neither is configured.
type NotifierService struct {
	queue    worker.Queue
	whatsapp notification.WhatsAppSender
}

// NewNotifierService wires the queue + optional direct sender.
func NewNotifierService(queue worker.Queue, whatsapp notification.WhatsAppSender) *NotifierService {
	return &NotifierService{queue: queue, whatsapp: whatsapp}
}

// SendWhatsApp sends a WhatsApp message for a user. Recipient phone is
// resolved at dispatch time from the user record (direct path) or by the
// worker handler (queued path).
func (s *NotifierService) SendWhatsApp(ctx context.Context, userID uuid.UUID, body string) error {
	payload, err := json.Marshal(DispatchJob{UserID: userID.String(), Body: body})
	if err != nil {
		return err
	}
	return s.dispatch(ctx, payload)
}

// SendWhatsAppTo sends a WhatsApp message to an explicit phone number.
func (s *NotifierService) SendWhatsAppTo(ctx context.Context, phone, body string) error {
	payload, err := json.Marshal(DispatchJob{To: phone, Body: body})
	if err != nil {
		return err
	}
	return s.dispatch(ctx, payload)
}

func (s *NotifierService) dispatch(ctx context.Context, payload []byte) error {
	if s.queue != nil {
		_, err := s.queue.Enqueue(ctx, worker.JobSendWhatsApp, payload)
		return err
	}
	if s.whatsapp == nil {
		return fmt.Errorf("whatsapp: no queue or sender configured")
	}
	var j DispatchJob
	if err := json.Unmarshal(payload, &j); err != nil {
		return err
	}
	if j.To == "" {
		return fmt.Errorf("whatsapp: recipient phone unknown (direct dispatch requires phone)")
	}
	return s.whatsapp.Send(ctx, j.To, j.Body)
}

// Package notification — WhatsApp delivery (gap #4).
//
// Reuses the Termii messaging API's "whatsapp" channel (WhatsApp on Termii is
// available in Nigeria and many markets), so a single provider handles SMS and
// WhatsApp. Implementations:
//   - ConsoleWhatsAppSender  — logs messages to stdout (dev default)
//   - TermiiWhatsAppSender   — Termii "whatsapp" channel; configured via
//     TERMII_API_KEY + TERMII_WHATSAPP_SENDER (the numeric WhatsApp sender id
//     provided by Termii). Falls back to TERMII_FROM / TERMII_SENDER_ID.
package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
)

// WhatsAppSender — outbound WhatsApp adapter.
type WhatsAppSender interface {
	Send(ctx context.Context, to, message string) error
}

// NewWhatsAppSender returns the Termii WhatsApp sender when configured,
// otherwise the console sender (dev). WhatsApp requires a numeric sender id
// (Termii-issued); TERMII_WHATSAPP_SENDER overrides the SMS sender id.
func NewWhatsAppSender() WhatsAppSender {
	key := os.Getenv("TERMII_API_KEY")
	if key == "" {
		return ConsoleWhatsAppSender{}
	}
	from := os.Getenv("TERMII_WHATSAPP_SENDER")
	if from == "" {
		from = os.Getenv("TERMII_FROM")
	}
	return &TermiiWhatsAppSender{
		APIKey:  key,
		From:    from,
		BaseURL: "https://api.ng.termii.com",
		HTTP:    &http.Client{Timeout: 10 * time.Second},
	}
}

// ConsoleWhatsAppSender — dev: log the message (safe logging like SMS).
type ConsoleWhatsAppSender struct{}

func (ConsoleWhatsAppSender) Send(_ context.Context, to, message string) error {
	if os.Getenv("ENVIRONMENT") == "production" {
		slog.Warn("WhatsApp console sender used in production (provider not configured) — message NOT sent or logged", "to", to)
		return nil
	}
	slog.Info("WhatsApp (console/dev)", "to", to, "body", truncate(message, 300))
	return nil
}

// TermiiWhatsAppSender — Termii "whatsapp" channel.
// Docs: https://developers.termii.com/whatsapp — POST /api/sms/send with
// Channel "whatsapp" and the numeric WhatsApp sender id in "from".
type TermiiWhatsAppSender struct {
	APIKey  string
	From    string // TERMII_WHATSAPP_SENDER (numeric WhatsApp sender id)
	BaseURL string
	HTTP    *http.Client
}

type termiiWhatsAppRequest struct {
	To      string `json:"to"`
	From    string `json:"from"`
	SMS     string `json:"sms"`
	Type    string `json:"type"`
	Channel string `json:"channel"`
	APIKey  string `json:"api_key"`
}

// Send delivers one WhatsApp message through the Termii API.
func (t *TermiiWhatsAppSender) Send(ctx context.Context, to, message string) error {
	reqBody, err := json.Marshal(termiiWhatsAppRequest{
		To:      strings.TrimPrefix(to, "+"),
		From:    t.From,
		SMS:     message,
		Type:    "plain",
		Channel: "whatsapp",
		APIKey:  t.APIKey,
	})
	if err != nil {
		return fmt.Errorf("termii whatsapp: marshal request: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, t.BaseURL+"/api/sms/send", bytes.NewReader(reqBody))
	if err != nil {
		return fmt.Errorf("termii whatsapp: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := t.HTTP.Do(req)
	if err != nil {
		return fmt.Errorf("termii whatsapp: send: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<10))

	var out termiiSMSResponse
	_ = json.Unmarshal(body, &out)
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("termii whatsapp: HTTP %d: %s", resp.StatusCode, truncate(string(body), 300))
	}
	if out.MessageID == "" && out.Status != "Success" {
		return fmt.Errorf("termii whatsapp: rejected: %s", truncate(out.Message, 300))
	}
	return nil
}

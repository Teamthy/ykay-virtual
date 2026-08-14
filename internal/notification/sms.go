// Package notification — SMS delivery (G4.2, remediation plan).
//
// Implementations:
//   - ConsoleSMSSender — logs messages to stdout (dev default)
//   - TermiiSMSSender  — Termii (https://termii.com) messaging API, the
//     default Nigerian SMS channel; configured via TERMII_API_KEY +
//     TERMII_SENDER_ID. Uses the dnd channel with the "plain" type so the
//     message is never altered by the gateway.
package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// SMSSender — outbound SMS adapter.
type SMSSender interface {
	Send(ctx context.Context, to, message string) error
}

// NewSMSSender returns the Termii sender when configured, otherwise the
// console sender (dev).
func NewSMSSender() SMSSender {
	key := os.Getenv("TERMII_API_KEY")
	if key != "" {
		return NewTermiiSMSSender(key, os.Getenv("TERMII_SENDER_ID"), os.Getenv("TERMII_FROM"))
	}
	return ConsoleSMSSender{}
}

// ConsoleSMSSender — dev: log the SMS instead of sending it.
type ConsoleSMSSender struct{}

func (ConsoleSMSSender) Send(_ context.Context, to, message string) error {
	log.Printf("📱 SMS to=%s body=%q", to, truncate(message, 300))
	return nil
}

// TermiiSMSSender — Termii messaging API (api.ng.termii.com).
// Docs: https://developers.termii.com/messaging — POST /api/sms/send with
// the API key in the "api_key" JSON field; sender id in "from" (alphanumeric
// sender IDs require registration; shortcodes are supported).
type TermiiSMSSender struct {
	APIKey   string
	SenderID string // TERMII_SENDER_ID: registered alphanumeric sender, e.g. "Nuvora"
	From     string // TERMII_FROM override (e.g. "234XXXXXXXXXX" or "Nuvora")
	BaseURL  string
	HTTP     *http.Client
}

func NewTermiiSMSSender(apiKey, senderID, from string) *TermiiSMSSender {
	if senderID == "" && from == "" {
		senderID = "Nuvora" // default: replace with the registered sender id
	}
	return &TermiiSMSSender{
		APIKey:   apiKey,
		SenderID: senderID,
		From:     from,
		BaseURL:  "https://api.ng.termii.com",
		HTTP:     &http.Client{Timeout: 10 * time.Second},
	}
}

type termiiSMSRequest struct {
	To      string `json:"to"`
	From    string `json:"from"`
	SMS     string `json:"sms"`
	Type    string `json:"type"`    // "plain"
	Channel string `json:"channel"` // "dnd" (default) | "generic" | "whatsapp"
	APIKey  string `json:"api_key"`
}

type termiiSMSResponse struct {
	MessageID string `json:"message_id"`
	Message   string `json:"message"`
	Status    string `json:"status"`
	Balance   any    `json:"balance,omitempty"`
}

// Send delivers one SMS through the Termii messaging API.
func (t *TermiiSMSSender) Send(ctx context.Context, to, message string) error {
	from := t.From
	if from == "" {
		from = t.SenderID
	}
	reqBody, err := json.Marshal(termiiSMSRequest{
		To:      strings.TrimPrefix(to, "+"),
		From:    from,
		SMS:     message,
		Type:    "plain",
		Channel: "dnd",
		APIKey:  t.APIKey,
	})
	if err != nil {
		return fmt.Errorf("termii: marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, t.BaseURL+"/api/sms/send", bytes.NewReader(reqBody))
	if err != nil {
		return fmt.Errorf("termii: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := t.HTTP.Do(req)
	if err != nil {
		return fmt.Errorf("termii: send: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<10))

	var out termiiSMSResponse
	_ = json.Unmarshal(body, &out)

	// Termii returns 200 with a "message" field on failures; non-2xx on
	// auth/validation errors. Treat both as delivery failures.
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("termii: HTTP %d: %s", resp.StatusCode, truncate(string(body), 300))
	}
	if out.MessageID == "" && out.Status != "Success" {
		return fmt.Errorf("termii: rejected: %s", truncate(out.Message, 300))
	}
	return nil
}

package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// PushService — device registry + best-effort push notifications (phase 35
// / M4). Deliveries go through a PushSender (Expo by default); failures are
// swallowed so push never blocks the request path.

type PushSender interface {
	Send(ctx context.Context, tokens []string, title, body string, data map[string]string) error
}

type PushService struct {
	devices identity.DeviceRepository
	sender  PushSender
}

func NewPushService(devices identity.DeviceRepository, sender PushSender) *PushService {
	return &PushService{devices: devices, sender: sender}
}

// RegisterDevice — upserts a device for the user (touch last-seen).
func (s *PushService) RegisterDevice(ctx context.Context, userID uuid.UUID, token, platform, appVersion string) (*identity.Device, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, fmt.Errorf("invalid input: device token is required")
	}
	if platform == "" {
		platform = "web"
	}
	d := &identity.Device{
		ID: uuid.New(), UserID: userID, Token: token,
		Platform: platform, AppVersion: appVersion, LastSeenAt: time.Now().UTC(),
	}
	if err := s.devices.Create(ctx, d); err != nil {
		return nil, err
	}
	return d, nil
}

func (s *PushService) ListDevices(ctx context.Context, userID uuid.UUID) ([]identity.Device, error) {
	list, err := s.devices.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []identity.Device{}
	}
	return list, nil
}

func (s *PushService) RemoveDevice(ctx context.Context, id, userID uuid.UUID) error {
	return s.devices.Delete(ctx, id, userID)
}

// NotifyUser — pushes to every device of the user. Best-effort: sender
// errors are returned to the caller for logging but never fatal.
func (s *PushService) NotifyUser(ctx context.Context, userID uuid.UUID, title, body string, data map[string]string) error {
	if s == nil || s.sender == nil || s.devices == nil {
		return nil // push not wired — best-effort no-op
	}
	devices, err := s.devices.ListByUser(ctx, userID)
	if err != nil || len(devices) == 0 {
		return err // no devices → nothing to do
	}
	tokens := make([]string, 0, len(devices))
	for _, d := range devices {
		tokens = append(tokens, d.Token)
	}
	return s.sender.Send(ctx, tokens, title, body, data)
}

// --- Expo push sender (https://exp.host/--/api/v2/push/send) ---

const expoPushEndpoint = "https://exp.host/--/api/v2/push/send"

type ExpoPushSender struct {
	accessToken string
	client      *http.Client
}

func NewExpoPushSender(accessToken string) *ExpoPushSender {
	return &ExpoPushSender{accessToken: accessToken, client: &http.Client{Timeout: 15 * time.Second}}
}

func (e *ExpoPushSender) Send(ctx context.Context, tokens []string, title, body string, data map[string]string) error {
	if len(tokens) == 0 {
		return nil
	}
	messages := make([]map[string]any, 0, len(tokens))
	for _, t := range tokens {
		msg := map[string]any{
			"to":    t,
			"title": title,
			"body":  body,
			"sound": "default",
		}
		if len(data) > 0 {
			msg["data"] = data
		}
		messages = append(messages, msg)
	}
	raw, err := json.Marshal(messages)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, expoPushEndpoint, bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if e.accessToken != "" {
		req.Header.Set("Authorization", "Bearer "+e.accessToken)
	}
	resp, err := e.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	bodyResp, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("expo push: status %d: %s", resp.StatusCode, truncate(string(bodyResp), 300))
	}
	return nil
}

// LogPushSender — records deliveries for tests / local dev.
type LogPushSender struct {
	Sent []map[string]any
}

func (l *LogPushSender) Send(_ context.Context, tokens []string, title, body string, data map[string]string) error {
	l.Sent = append(l.Sent, map[string]any{
		"tokens": tokens, "title": title, "body": body, "data": data,
	})
	return nil
}

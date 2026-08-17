// Package meeting — live-class meeting-link lifecycle (G4.2, remediation plan).
//
// MeetingProvider creates/refreshes video rooms for lessons. The provider
// reference + expiry are persisted on the lesson row (meeting_ref,
// meeting_expires_at) so links survive restarts and are never regenerated
// per request. Join windows are enforced server-side: participants may only
// fetch a join link between (start - join_window) and (end + grace).
//
// Providers:
//   - StubMeetingProvider — dev/fixtures (fake meet.nuvora.local — never prod)
//   - JitsiProvider       — public meet.jit.si rooms, no API key (free)
//   - WherebyProvider     — https://api.whereby.dev/v1/meetings (real REST)
package meeting

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// ErrJoinWindowClosed — raised when the lesson is outside its join window.
var ErrJoinWindowClosed = errors.New("join window is not open")

// MeetingLink is the provider-neutral result of CreateOrRefresh.
type MeetingLink struct {
	ProviderRef string
	JoinURL     string
	RoomURL     string
	ExpiresAt   time.Time
}

// Provider creates/refreshes a meeting room for one lesson.
type Provider interface {
	// Create returns a fresh room. lessonID is the API's lesson UUID.
	Create(ctx context.Context, lessonID, title string, startAt, endAt time.Time) (MeetingLink, error)
}

// ---------------------------------------------------------------- Whereby --

// WherebyProvider — Whereby REST API (https://whereby.dev).
// Set MEETING_PROVIDER=whereby + WHEREBY_API_KEY. Rooms auto-close 1h after
// endAt via the endDate field.
type WherebyProvider struct {
	APIKey  string
	BaseURL string
	HTTP    *http.Client
}

func NewWhereby(apiKey string) *WherebyProvider {
	return &WherebyProvider{
		APIKey:  apiKey,
		BaseURL: "https://api.whereby.dev/v1",
		HTTP:    &http.Client{Timeout: 15 * time.Second},
	}
}

type wherebyRequest struct {
	IsLocked  bool     `json:"isLocked"`
	RoomMode  string   `json:"roomMode"`
	StartDate string   `json:"startDate"`
	EndDate   string   `json:"endDate"`
	Fields    []string `json:"fields"`
}

type wherebyResponse struct {
	MeetingID string `json:"meetingId"`
	RoomURL   string `json:"roomUrl"`
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
}

func (w *WherebyProvider) Create(ctx context.Context, lessonID, title string, startAt, endAt time.Time) (MeetingLink, error) {
	body, err := json.Marshal(wherebyRequest{
		IsLocked:  true, // only the host can join first; tutor controls entry
		RoomMode:  "normal",
		StartDate: startAt.UTC().Format(time.RFC3339),
		EndDate:   endAt.Add(1 * time.Hour).UTC().Format(time.RFC3339),
		Fields:    []string{"hostRoomUrl"},
	})
	if err != nil {
		return MeetingLink{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, w.BaseURL+"/meetings", bytes.NewReader(body))
	if err != nil {
		return MeetingLink{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+w.APIKey)

	resp, err := w.HTTP.Do(req)
	if err != nil {
		return MeetingLink{}, fmt.Errorf("whereby: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 8<<10))
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return MeetingLink{}, fmt.Errorf("whereby: HTTP %d: %s", resp.StatusCode, truncate(string(raw), 300))
	}
	var out wherebyResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return MeetingLink{}, fmt.Errorf("whereby: decode: %w", err)
	}
	expires := endAt.Add(1 * time.Hour)
	if t, err := time.Parse(time.RFC3339, out.EndDate); err == nil {
		expires = t
	}
	return MeetingLink{
		ProviderRef: out.MeetingID,
		JoinURL:     out.RoomURL,
		RoomURL:     out.RoomURL,
		ExpiresAt:   expires,
	}, nil
}

// ---------------------------------------------------------------- Jitsi ----

// JitsiProvider — 8x8's public Jitsi Meet (https://meet.jit.si).
// No account or API key. Each lesson gets a unique public room URL.
// Anyone with the link can join (same as sharing a Meet link). Swap to
// Whereby when you have a key for locked rooms + host controls.
type JitsiProvider struct {
	BaseURL string // default https://meet.jit.si
}

func NewJitsi() *JitsiProvider {
	return &JitsiProvider{BaseURL: "https://meet.jit.si"}
}

func (j *JitsiProvider) Create(_ context.Context, lessonID, title string, _, endAt time.Time) (MeetingLink, error) {
	base := j.BaseURL
	if base == "" {
		base = "https://meet.jit.si"
	}
	room := "nuvora-" + lessonID
	url := strings.TrimRight(base, "/") + "/" + room
	_ = title
	return MeetingLink{
		ProviderRef: room,
		JoinURL:     url,
		RoomURL:     url,
		ExpiresAt:   endAt.Add(1 * time.Hour),
	}, nil
}

// ---------------------------------------------------------------- Stub -----

// StubMeetingProvider — deterministic dev provider (no network). Join URLs
// are obviously fake (https://meet.nuvora.local/…) so nobody mistakes them
// for real rooms; the tutor dashboard renders them as disabled in dev.
type StubMeetingProvider struct{}

func (StubMeetingProvider) Create(_ context.Context, lessonID, _ string, _ time.Time, endAt time.Time) (MeetingLink, error) {
	return MeetingLink{
		ProviderRef: "stub-" + lessonID,
		JoinURL:     fmt.Sprintf("https://meet.nuvora.local/room/%s", lessonID),
		RoomURL:     fmt.Sprintf("https://meet.nuvora.local/room/%s", lessonID),
		ExpiresAt:   endAt.Add(1 * time.Hour),
	}, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

package notifications

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type Channel string

const (
	ChannelEmail    Channel = "EMAIL"
	ChannelSMS      Channel = "SMS"
	ChannelWhatsApp Channel = "WHATSAPP"
	ChannelInternal Channel = "INTERNAL"
)

type Notification struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Recipient string    `json:"recipient"`
	Kind      string    `json:"kind"`
	Channel   Channel   `json:"channel"`
	Message   string    `json:"message"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

type SendRequest struct {
	UserID    string
	Recipient string
	Kind      string
	Channel   Channel
	Message   string
}

type Service struct {
	mu            sync.RWMutex
	notifications []Notification
}

func NewService() *Service {
	return &Service{
		notifications: make([]Notification, 0),
	}
}

func (s *Service) Send(_ context.Context, req SendRequest) (Notification, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	channel := req.Channel
	if channel == "" {
		channel = ChannelEmail
	}

	notif := Notification{
		ID:        fmt.Sprintf("notif-%d", len(s.notifications)+1),
		UserID:    req.UserID,
		Recipient: req.Recipient,
		Kind:      req.Kind,
		Channel:   channel,
		Message:   req.Message,
		Status:    "DELIVERED",
		CreatedAt: time.Now().UTC(),
	}
	s.notifications = append(s.notifications, notif)
	return notif, nil
}

func (s *Service) ListByUser(_ context.Context, userID string) []Notification {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var userNotifs []Notification
	for _, n := range s.notifications {
		if n.UserID == userID || userID == "" {
			userNotifs = append(userNotifs, n)
		}
	}
	return userNotifs
}

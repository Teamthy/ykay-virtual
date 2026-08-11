package audit

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type Event struct {
	ID         string            `json:"id"`
	Actor      string            `json:"actor"`
	Action     string            `json:"action"`
	TargetType string            `json:"targetType"`
	TargetID   string            `json:"targetId"`
	Timestamp  time.Time         `json:"timestamp"`
	Meta       map[string]string `json:"meta,omitempty"`
}

type Service struct {
	mu     sync.RWMutex
	events []Event
}

func NewService() *Service {
	return &Service{
		events: make([]Event, 0),
	}
}

func (s *Service) Record(_ context.Context, actor, action, targetType, targetID string, meta map[string]string) Event {
	s.mu.Lock()
	defer s.mu.Unlock()

	event := Event{
		ID:         fmt.Sprintf("audit-%d", len(s.events)+1),
		Actor:      actor,
		Action:     action,
		TargetType: targetType,
		TargetID:   targetID,
		Timestamp:  time.Now().UTC(),
		Meta:       meta,
	}
	s.events = append(s.events, event)
	return event
}

func (s *Service) List(_ context.Context) []Event {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]Event, len(s.events))
	copy(out, s.events)
	return out
}

func (s *Service) GetByTarget(_ context.Context, targetType, targetID string) []Event {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var filtered []Event
	for _, e := range s.events {
		if e.TargetType == targetType && e.TargetID == targetID {
			filtered = append(filtered, e)
		}
	}
	return filtered
}

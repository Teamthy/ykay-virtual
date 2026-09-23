package memory

import (
	"context"
	"sort"
	"sync"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/mastery"
)

// MasteryMemory — in-memory mastery.Repository for tests + dev fallback.
type MasteryMemory struct {
	mu    sync.RWMutex
	cells map[string]*mastery.TopicMastery // studentProfileID|subject|topic
}

func NewMasteryMemory() *MasteryMemory {
	return &MasteryMemory{cells: map[string]*mastery.TopicMastery{}}
}

func masteryKey(sp uuid.UUID, subject, topic string) string {
	return sp.String() + "|" + subject + "|" + topic
}

func (m *MasteryMemory) RecordResult(_ context.Context, sp uuid.UUID, subject, topic string, correct bool) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	k := masteryKey(sp, subject, topic)
	c, ok := m.cells[k]
	if !ok {
		c = &mastery.TopicMastery{Subject: subject, Topic: topic}
		m.cells[k] = c
	}
	c.Attempts++
	if correct {
		c.Correct++
	}
	c.Mastery = c.Correct * 100 / c.Attempts
	return nil
}

func (m *MasteryMemory) Mastery(_ context.Context, sp uuid.UUID, subject string) ([]mastery.TopicMastery, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := []mastery.TopicMastery{}
	for _, c := range m.cells {
		if c.Subject == "" {
			continue
		}
		if subject != "" && c.Subject != subject {
			continue
		}
		out = append(out, *c)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Subject != out[j].Subject {
			return out[i].Subject < out[j].Subject
		}
		return out[i].Mastery < out[j].Mastery
	})
	return out, nil
}

func (m *MasteryMemory) WeakTopics(_ context.Context, sp uuid.UUID, subject string, below int) ([]mastery.TopicMastery, error) {
	all, err := m.Mastery(context.Background(), sp, subject)
	if err != nil {
		return nil, err
	}
	out := []mastery.TopicMastery{}
	for _, c := range all {
		if c.Mastery < below {
			out = append(out, c)
		}
	}
	return out, nil
}

var _ mastery.Repository = (*MasteryMemory)(nil)

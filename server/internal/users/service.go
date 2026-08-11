package users

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

type LearnerProfile struct {
	ID          string    `json:"id"`
	ParentEmail string    `json:"parentEmail"`
	Name        string    `json:"name"`
	AgeBand     string    `json:"ageBand"`
	SchoolYear  string    `json:"schoolYear"`
	CreatedAt   time.Time `json:"createdAt"`
}

type CreateLearnerRequest struct {
	ParentEmail string `json:"parentEmail"`
	Name        string `json:"name"`
	AgeBand     string `json:"ageBand"`
	SchoolYear  string `json:"schoolYear"`
}

type Service struct {
	mu       sync.RWMutex
	learners map[string]LearnerProfile
}

func NewService() *Service {
	return &Service{
		learners: make(map[string]LearnerProfile),
	}
}

func (s *Service) CreateLearner(_ context.Context, req CreateLearnerRequest) (LearnerProfile, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if strings.TrimSpace(req.ParentEmail) == "" {
		return LearnerProfile{}, errors.New("parent email is required")
	}
	if strings.TrimSpace(req.Name) == "" {
		return LearnerProfile{}, errors.New("learner name is required")
	}

	id := fmt.Sprintf("learner-%d", len(s.learners)+1)
	learner := LearnerProfile{
		ID:          id,
		ParentEmail: strings.ToLower(strings.TrimSpace(req.ParentEmail)),
		Name:        strings.TrimSpace(req.Name),
		AgeBand:     strings.TrimSpace(req.AgeBand),
		SchoolYear:  strings.TrimSpace(req.SchoolYear),
		CreatedAt:   time.Now().UTC(),
	}
	s.learners[id] = learner
	return learner, nil
}

// GetLearner enforces object-level authorization (AC-04):
// If requestRole == "PARENT", requestEmail must match the learner's ParentEmail.
func (s *Service) GetLearner(_ context.Context, learnerID, requestEmail, requestRole string) (LearnerProfile, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	learner, exists := s.learners[learnerID]
	if !exists {
		return LearnerProfile{}, errors.New("learner not found")
	}

	if strings.EqualFold(requestRole, "PARENT") {
		if !strings.EqualFold(strings.TrimSpace(requestEmail), learner.ParentEmail) {
			return LearnerProfile{}, errors.New("forbidden: parent cannot access another family's learner")
		}
	}
	return learner, nil
}

func (s *Service) ListLearnersByParent(_ context.Context, parentEmail string) []LearnerProfile {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var list []LearnerProfile
	for _, l := range s.learners {
		if strings.EqualFold(l.ParentEmail, strings.TrimSpace(parentEmail)) {
			list = append(list, l)
		}
	}
	return list
}

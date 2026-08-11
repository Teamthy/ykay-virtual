package learning

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

type Resource struct {
	ID          string    `json:"id"`
	ProgrammeID string    `json:"programmeId"`
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	Type        string    `json:"type"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Assignment struct {
	ID          string    `json:"id"`
	ProgrammeID string    `json:"programmeId"`
	Title       string    `json:"title"`
	Instructions string   `json:"instructions"`
	DueDate     time.Time `json:"dueDate"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Submission struct {
	ID           string    `json:"id"`
	AssignmentID string    `json:"assignmentId"`
	StudentID    string    `json:"studentId"`
	URL          string    `json:"url"`
	Score        int       `json:"score,omitempty"`
	Feedback     string    `json:"feedback,omitempty"`
	SubmittedAt  time.Time `json:"submittedAt"`
}

type Service struct {
	mu          sync.RWMutex
	resources   map[string]Resource
	assignments map[string]Assignment
	submissions map[string]Submission
}

func NewService() *Service {
	return &Service{
		resources:   make(map[string]Resource),
		assignments: make(map[string]Assignment),
		submissions: make(map[string]Submission),
	}
}

func (s *Service) CreateResource(_ context.Context, programmeID, title, url, resType string) (Resource, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if strings.TrimSpace(programmeID) == "" || strings.TrimSpace(title) == "" {
		return Resource{}, errors.New("programmeId and title are required")
	}

	id := fmt.Sprintf("res-%d", len(s.resources)+1)
	res := Resource{
		ID:          id,
		ProgrammeID: strings.TrimSpace(programmeID),
		Title:       strings.TrimSpace(title),
		URL:         strings.TrimSpace(url),
		Type:        strings.TrimSpace(resType),
		CreatedAt:   time.Now().UTC(),
	}
	s.resources[id] = res
	return res, nil
}

// GetResource enforces AC-08:
// A student accesses only resources attached to programmes/cohorts they're granted.
func (s *Service) GetResource(_ context.Context, resourceID string, enrolledProgrammeIDs []string) (Resource, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	res, exists := s.resources[resourceID]
	if !exists {
		return Resource{}, errors.New("resource not found")
	}

	enrolled := false
	for _, progID := range enrolledProgrammeIDs {
		if strings.EqualFold(strings.TrimSpace(progID), res.ProgrammeID) {
			enrolled = true
			break
		}
	}
	if !enrolled {
		return Resource{}, errors.New("forbidden: student is not enrolled in this programme cohort")
	}
	return res, nil
}

func (s *Service) CreateAssignment(_ context.Context, programmeID, title, instructions string, dueDate time.Time) (Assignment, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if strings.TrimSpace(programmeID) == "" || strings.TrimSpace(title) == "" {
		return Assignment{}, errors.New("programmeId and title are required")
	}

	id := fmt.Sprintf("assign-%d", len(s.assignments)+1)
	assign := Assignment{
		ID:           id,
		ProgrammeID:  strings.TrimSpace(programmeID),
		Title:        strings.TrimSpace(title),
		Instructions: strings.TrimSpace(instructions),
		DueDate:      dueDate.UTC(),
		CreatedAt:    time.Now().UTC(),
	}
	s.assignments[id] = assign
	return assign, nil
}

func (s *Service) ListResourcesByProgramme(_ context.Context, programmeID string) []Resource {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var list []Resource
	for _, r := range s.resources {
		if strings.EqualFold(r.ProgrammeID, programmeID) {
			list = append(list, r)
		}
	}
	return list
}

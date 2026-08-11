package programmes

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

type Programme struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	Curriculum string    `json:"curriculum"`
	Level      string    `json:"level"`
	Subject    string    `json:"subject"`
	Format     string    `json:"format"`
	Summary    string    `json:"summary"`
	Price      float64   `json:"price"`
	Status     string    `json:"status"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	Title      string  `json:"title"`
	Curriculum string  `json:"curriculum"`
	Level      string  `json:"level"`
	Subject    string  `json:"subject"`
	Format     string  `json:"format"`
	Summary    string  `json:"summary"`
	Price      float64 `json:"price"`
	Status     string  `json:"status"`
}

type Service struct {
	mu         sync.RWMutex
	programmes []Programme
}

func NewService() *Service {
	return &Service{programmes: []Programme{
		{
			ID:         "prog-igcse-cs",
			Title:      "IGCSE Computer Science",
			Curriculum: "British Curriculum",
			Level:      "IGCSE",
			Subject:    "Computer Science",
			Format:     "Cohort",
			Summary:    "Structured online preparation for IGCSE Computer Science with live lessons and guided revision.",
			Price:      25000,
			Status:     "PUBLISHED",
			UpdatedAt:  time.Now().UTC(),
		},
		{
			ID:         "prog-waec-maths",
			Title:      "WAEC Mathematics Revision",
			Curriculum: "Nigerian Curriculum",
			Level:      "SSS3",
			Subject:    "Mathematics",
			Format:     "Private Tuition",
			Summary:    "Exam-focused revision for WAEC and school assessment preparation with parent visibility.",
			Price:      18000,
			Status:     "PUBLISHED",
			UpdatedAt:  time.Now().UTC(),
		},
	}}
}

func (s *Service) List(onlyPublished bool) []Programme {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var out []Programme
	for _, prog := range s.programmes {
		if onlyPublished && !strings.EqualFold(prog.Status, "PUBLISHED") {
			continue
		}
		out = append(out, prog)
	}
	return out
}

func (s *Service) Get(id string) (Programme, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, programme := range s.programmes {
		if programme.ID == id {
			return programme, nil
		}
	}
	return Programme{}, fmt.Errorf("programme %s not found", id)
}

func (s *Service) Create(_ context.Context, req CreateRequest) (Programme, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if strings.TrimSpace(req.Title) == "" {
		return Programme{}, errors.New("title is required")
	}

	status := strings.ToUpper(strings.TrimSpace(req.Status))
	if status == "" {
		status = "DRAFT"
	}

	prog := Programme{
		ID:         fmt.Sprintf("prog-%d", len(s.programmes)+1),
		Title:      strings.TrimSpace(req.Title),
		Curriculum: strings.TrimSpace(req.Curriculum),
		Level:      strings.TrimSpace(req.Level),
		Subject:    strings.TrimSpace(req.Subject),
		Format:     strings.TrimSpace(req.Format),
		Summary:    strings.TrimSpace(req.Summary),
		Price:      req.Price,
		Status:     status,
		UpdatedAt:  time.Now().UTC(),
	}
	s.programmes = append(s.programmes, prog)
	return prog, nil
}

// UpdateStatus implements AC-09: Admin can publish/unpublish a programme without deployment.
func (s *Service) UpdateStatus(_ context.Context, id, status, actorRole string) (Programme, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !strings.EqualFold(actorRole, "ACADEMIC_ADMIN") && !strings.EqualFold(actorRole, "SUPER_ADMIN") {
		return Programme{}, errors.New("forbidden: only academic admin can publish/unpublish programmes")
	}

	trimmedStatus := strings.ToUpper(strings.TrimSpace(status))
	if trimmedStatus != "PUBLISHED" && trimmedStatus != "UNPUBLISHED" && trimmedStatus != "DRAFT" {
		return Programme{}, errors.New("invalid status: must be PUBLISHED, UNPUBLISHED, or DRAFT")
	}

	for i := range s.programmes {
		if s.programmes[i].ID == id {
			s.programmes[i].Status = trimmedStatus
			s.programmes[i].UpdatedAt = time.Now().UTC()
			return s.programmes[i], nil
		}
	}
	return Programme{}, fmt.Errorf("programme %s not found", id)
}

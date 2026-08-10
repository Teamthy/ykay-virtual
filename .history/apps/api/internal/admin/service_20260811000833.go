package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

type ProgrammeSummary struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Curriculum      string    `json:"curriculum"`
	Status          string    `json:"status"`
	EnrollmentCount int       `json:"enrollmentCount"`
	CreatedAt       time.Time `json:"createdAt"`
}

type CreateProgrammeSummaryRequest struct {
	Title            string `json:"title"`
	Curriculum       string `json:"curriculum"`
	Status           string `json:"status"`
	EnrollmentCount  int    `json:"enrollmentCount"`
}

type CreateProgrammeSummaryResponse struct {
	Summary ProgrammeSummary `json:"summary"`
}

type Service struct {
	summaries []ProgrammeSummary
}

func NewService() *Service {
	return &Service{}
}

func (s *Service) CreateProgrammeSummary(_ context.Context, req CreateProgrammeSummaryRequest) (CreateProgrammeSummaryResponse, error) {
	if strings.TrimSpace(req.Title) == "" {
		return CreateProgrammeSummaryResponse{}, errors.New("title is required")
	}
	if strings.TrimSpace(req.Curriculum) == "" {
		return CreateProgrammeSummaryResponse{}, errors.New("curriculum is required")
	}

	summary := ProgrammeSummary{
		ID:              fmt.Sprintf("summary-%d", len(s.summaries)+1),
		Title:           strings.TrimSpace(req.Title),
		Curriculum:      strings.TrimSpace(req.Curriculum),
		Status:          strings.TrimSpace(req.Status),
		EnrollmentCount: req.EnrollmentCount,
		CreatedAt:       time.Now().UTC(),
	}
	s.summaries = append(s.summaries, summary)

	return CreateProgrammeSummaryResponse{Summary: summary}, nil
}

func (s *Service) ListProgrammeSummaries(_ context.Context) []ProgrammeSummary {
	return append([]ProgrammeSummary(nil), s.summaries...)
}

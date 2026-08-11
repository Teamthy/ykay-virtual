package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"ykay-virtual/internal/audit"
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
	Title           string `json:"title"`
	Curriculum      string `json:"curriculum"`
	Status          string `json:"status"`
	EnrollmentCount int    `json:"enrollmentCount"`
}

type CreateProgrammeSummaryResponse struct {
	Summary ProgrammeSummary `json:"summary"`
}

type DashboardKPIs struct {
	TotalLearners         int     `json:"totalLearners"`
	TotalTutors           int     `json:"totalTutors"`
	TotalCohorts          int     `json:"totalCohorts"`
	LessonsThisWeek       int     `json:"lessonsThisWeek"`
	TotalRevenueNGN       float64 `json:"totalRevenueNGN"`
	PendingTutorReviews   int     `json:"pendingTutorReviews"`
	PendingEnrolmentAlert int     `json:"pendingEnrolmentAlert"`
	OpenSupportTickets    int     `json:"openSupportTickets"`
	UpdatedAt             string  `json:"updatedAt"`
}

type Service struct {
	mu           sync.RWMutex
	summaries    []ProgrammeSummary
	auditService *audit.Service
}

func NewService() *Service {
	return &Service{}
}

func (s *Service) WithAudit(a *audit.Service) *Service {
	s.auditService = a
	return s
}

func (s *Service) CreateProgrammeSummary(ctx context.Context, req CreateProgrammeSummaryRequest) (CreateProgrammeSummaryResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

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

	if s.auditService != nil {
		s.auditService.Record(ctx, "admin", "CREATE_PROGRAMME_SUMMARY", "ProgrammeSummary", summary.ID, map[string]string{
			"title": summary.Title,
		})
	}

	return CreateProgrammeSummaryResponse{Summary: summary}, nil
}

func (s *Service) ListProgrammeSummaries(_ context.Context) []ProgrammeSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]ProgrammeSummary(nil), s.summaries...)
}

func (s *Service) GetDashboardKPIs(_ context.Context) DashboardKPIs {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return DashboardKPIs{
		TotalLearners:         42,
		TotalTutors:           14,
		TotalCohorts:          8,
		LessonsThisWeek:       24,
		TotalRevenueNGN:       3850000,
		PendingTutorReviews:   3,
		PendingEnrolmentAlert: 2,
		OpenSupportTickets:    4,
		UpdatedAt:             time.Now().UTC().Format(time.RFC3339),
	}
}

package enrollments

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Status string

const (
	StatusPendingPayment Status = "PENDING_PAYMENT"
	StatusConfirmed      Status = "CONFIRMED"
)

type Enrollment struct {
	ID           string    `json:"id"`
	ProgrammeID  string    `json:"programmeId"`
	ParentEmail  string    `json:"parentEmail"`
	LearnerName  string    `json:"learnerName"`
	Status       Status    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	ProgrammeID string `json:"programmeId"`
	ParentEmail string `json:"parentEmail"`
	LearnerName string `json:"learnerName"`
}

type CreateResponse struct {
	Enrollment Enrollment `json:"enrollment"`
}

type Service struct {
	enrollments []Enrollment
}

func NewService() *Service {
	return &Service{}
}

func (s *Service) Create(_ context.Context, req CreateRequest) (CreateResponse, error) {
	if strings.TrimSpace(req.ProgrammeID) == "" {
		return CreateResponse{}, errors.New("programme id is required")
	}
	if strings.TrimSpace(req.ParentEmail) == "" {
		return CreateResponse{}, errors.New("parent email is required")
	}
	if strings.TrimSpace(req.LearnerName) == "" {
		return CreateResponse{}, errors.New("learner name is required")
	}

	enrollment := Enrollment{
		ID:          fmt.Sprintf("enrollment-%d", len(s.enrollments)+1),
		ProgrammeID: req.ProgrammeID,
		ParentEmail: strings.ToLower(req.ParentEmail),
		LearnerName: strings.TrimSpace(req.LearnerName),
		Status:      StatusPendingPayment,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
	s.enrollments = append(s.enrollments, enrollment)

	return CreateResponse{Enrollment: enrollment}, nil
}

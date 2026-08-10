package tuitionrequests

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Status string

const (
	StatusPendingReview Status = "PENDING_REVIEW"
	StatusMatched       Status = "MATCHED"
)

type TuitionRequest struct {
	ID          string    `json:"id"`
	ProgrammeID string    `json:"programmeId"`
	ParentEmail string    `json:"parentEmail"`
	LearnerName string    `json:"learnerName"`
	Subject     string    `json:"subject"`
	Goal        string    `json:"goal"`
	Status      Status    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	ProgrammeID string `json:"programmeId"`
	ParentEmail string `json:"parentEmail"`
	LearnerName string `json:"learnerName"`
	Subject     string `json:"subject"`
	Goal        string `json:"goal"`
}

type CreateResponse struct {
	Request TuitionRequest `json:"request"`
}

type Service struct {
	requests []TuitionRequest
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
	if strings.TrimSpace(req.Subject) == "" {
		return CreateResponse{}, errors.New("subject is required")
	}

	request := TuitionRequest{
		ID:          fmt.Sprintf("tuition-%d", len(s.requests)+1),
		ProgrammeID: req.ProgrammeID,
		ParentEmail: strings.ToLower(req.ParentEmail),
		LearnerName: strings.TrimSpace(req.LearnerName),
		Subject:     strings.TrimSpace(req.Subject),
		Goal:        strings.TrimSpace(req.Goal),
		Status:      StatusPendingReview,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
	s.requests = append(s.requests, request)

	return CreateResponse{Request: request}, nil
}

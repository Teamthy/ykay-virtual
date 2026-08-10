package payments

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Status string

const (
	StatusPending Status = "PENDING"
	StatusPaid    Status = "PAID"
	StatusFailed  Status = "FAILED"
)

type Invoice struct {
	ID           string    `json:"id"`
	LearnerName  string    `json:"learnerName"`
	ProgrammeID  string    `json:"programmeId"`
	Amount       float64   `json:"amount"`
	Currency     string    `json:"currency"`
	Status       Status    `json:"status"`
	Description  string    `json:"description"`
	IssuedAt     time.Time `json:"issuedAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	LearnerName string  `json:"learnerName"`
	ProgrammeID string  `json:"programmeId"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	Description string  `json:"description"`
}

type CreateResponse struct {
	Invoice Invoice `json:"invoice"`
}

type Service struct {
	invoices []Invoice
}

func NewService() *Service {
	return &Service{}
}

func (s *Service) Create(_ context.Context, req CreateRequest) (CreateResponse, error) {
	if strings.TrimSpace(req.LearnerName) == "" {
		return CreateResponse{}, errors.New("learner name is required")
	}
	if strings.TrimSpace(req.ProgrammeID) == "" {
		return CreateResponse{}, errors.New("programme id is required")
	}
	if req.Amount <= 0 {
		return CreateResponse{}, errors.New("amount must be greater than zero")
	}
	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if currency == "" {
		currency = "NGN"
	}

	invoice := Invoice{
		ID:          fmt.Sprintf("invoice-%d", len(s.invoices)+1),
		LearnerName: strings.TrimSpace(req.LearnerName),
		ProgrammeID: strings.TrimSpace(req.ProgrammeID),
		Amount:      req.Amount,
		Currency:    currency,
		Status:      StatusPending,
		Description: strings.TrimSpace(req.Description),
		IssuedAt:    time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
	s.invoices = append(s.invoices, invoice)

	return CreateResponse{Invoice: invoice}, nil
}

func (s *Service) List(_ context.Context) []Invoice {
	return append([]Invoice(nil), s.invoices...)
}

func (s *Service) MarkPaid(_ context.Context, id string) (Invoice, error) {
	for i := range s.invoices {
		if s.invoices[i].ID == id {
			s.invoices[i].Status = StatusPaid
			s.invoices[i].UpdatedAt = time.Now().UTC()
			return s.invoices[i], nil
		}
	}
	return Invoice{}, errors.New("invoice not found")
}

package payments

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

type Status string

const (
	StatusPending Status = "PENDING"
	StatusPaid    Status = "PAID"
	StatusFailed  Status = "FAILED"
)

type Invoice struct {
	ID          string    `json:"id"`
	LearnerName string    `json:"learnerName"`
	ProgrammeID string    `json:"programmeId"`
	Amount      float64   `json:"amount"`
	Currency    string    `json:"currency"`
	Status      Status    `json:"status"`
	Description string    `json:"description"`
	IssuedAt    time.Time `json:"issuedAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type PaymentTransaction struct {
	ID               string    `json:"id"`
	Reference        string    `json:"reference"`
	Amount           float64   `json:"amount"`
	Status           Status    `json:"status"`
	Provider         string    `json:"provider"`
	ProcessedAt      time.Time `json:"processedAt"`
	EnrolmentCreated bool      `json:"enrolmentCreated"`
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

type WebhookRequest struct {
	Reference string  `json:"reference"`
	Amount    float64 `json:"amount"`
	Provider  string  `json:"provider"`
	Signature string  `json:"signature"`
}

type WebhookResponse struct {
	Transaction      PaymentTransaction `json:"transaction"`
	DuplicateIgnored bool               `json:"duplicateIgnored"`
	Message          string             `json:"message"`
}

type Service struct {
	mu           sync.RWMutex
	invoices     []Invoice
	transactions map[string]PaymentTransaction
	secretKey    string
}

func NewService() *Service {
	return &Service{
		transactions: make(map[string]PaymentTransaction),
		secretKey:    "paystack_secret_test",
	}
}

func (s *Service) WithSecretKey(key string) *Service {
	s.secretKey = key
	return s
}

func (s *Service) Create(_ context.Context, req CreateRequest) (CreateResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

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
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]Invoice(nil), s.invoices...)
}

func (s *Service) MarkPaid(_ context.Context, id string) (Invoice, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.invoices {
		if s.invoices[i].ID == id {
			s.invoices[i].Status = StatusPaid
			s.invoices[i].UpdatedAt = time.Now().UTC()
			return s.invoices[i], nil
		}
	}
	return Invoice{}, errors.New("invoice not found")
}

// ProcessWebhook implements AC-06: A verified payment webhook processed twice does not create duplicate enrolments/credits.
func (s *Service) ProcessWebhook(_ context.Context, req WebhookRequest) (WebhookResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if strings.TrimSpace(req.Reference) == "" {
		return WebhookResponse{}, errors.New("payment reference is required")
	}
	if s.secretKey != "" && req.Signature != s.secretKey {
		return WebhookResponse{}, errors.New("forbidden: invalid payment webhook signature")
	}

	ref := strings.TrimSpace(req.Reference)
	if existing, found := s.transactions[ref]; found {
		// AC-06: Already processed! Idempotent return, DuplicateIgnored=true
		return WebhookResponse{
			Transaction:      existing,
			DuplicateIgnored: true,
			Message:          "idempotent: webhook already processed without duplicating enrolments or credits",
		}, nil
	}

	provider := strings.TrimSpace(req.Provider)
	if provider == "" {
		provider = "PAYSTACK"
	}

	tx := PaymentTransaction{
		ID:               fmt.Sprintf("tx-%d", len(s.transactions)+1),
		Reference:        ref,
		Amount:           req.Amount,
		Status:           StatusPaid,
		Provider:         provider,
		ProcessedAt:      time.Now().UTC(),
		EnrolmentCreated: true,
	}
	s.transactions[ref] = tx

	return WebhookResponse{
		Transaction:      tx,
		DuplicateIgnored: false,
		Message:          "payment verified and enrolment created successfully",
	}, nil
}

func (s *Service) ListTransactions(_ context.Context) []PaymentTransaction {
	s.mu.RLock()
	defer s.mu.RUnlock()

	list := make([]PaymentTransaction, 0, len(s.transactions))
	for _, tx := range s.transactions {
		list = append(list, tx)
	}
	return list
}

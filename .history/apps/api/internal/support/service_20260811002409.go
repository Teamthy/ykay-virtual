package support

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Status string

const (
	StatusOpen   Status = "OPEN"
	StatusClosed Status = "CLOSED"
)

type Ticket struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Subject   string    `json:"subject"`
	Message   string    `json:"message"`
	Status    Status    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CreateRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Subject string `json:"subject"`
	Message string `json:"message"`
}

type CreateResponse struct {
	Ticket Ticket `json:"ticket"`
}

type Service struct {
	tickets []Ticket
}

func NewService() *Service {
	return &Service{}
}

func (s *Service) List(_ context.Context) []Ticket {
	return append([]Ticket(nil), s.tickets...)
}

func (s *Service) UpdateStatus(_ context.Context, id string, status Status) (Ticket, error) {
	for i := range s.tickets {
		if s.tickets[i].ID == id {
			s.tickets[i].Status = status
			s.tickets[i].UpdatedAt = time.Now().UTC()
			return s.tickets[i], nil
		}
	}
	return Ticket{}, errors.New("ticket not found")
}

func (s *Service) Create(_ context.Context, req CreateRequest) (CreateResponse, error) {
	if strings.TrimSpace(req.Name) == "" {
		return CreateResponse{}, errors.New("name is required")
	}
	if strings.TrimSpace(req.Email) == "" {
		return CreateResponse{}, errors.New("email is required")
	}
	if strings.TrimSpace(req.Subject) == "" {
		return CreateResponse{}, errors.New("subject is required")
	}
	if strings.TrimSpace(req.Message) == "" {
		return CreateResponse{}, errors.New("message is required")
	}

	ticket := Ticket{
		ID:        fmt.Sprintf("ticket-%d", len(s.tickets)+1),
		Name:      strings.TrimSpace(req.Name),
		Email:     strings.ToLower(req.Email),
		Subject:   strings.TrimSpace(req.Subject),
		Message:   strings.TrimSpace(req.Message),
		Status:    StatusOpen,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
	s.tickets = append(s.tickets, ticket)

	return CreateResponse{Ticket: ticket}, nil
}

package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/plusteams"
)

// PlusTeamsService — YK-Virtual Plus Teams (000069): an institution allocates a
// number of seats; each seat is a user covered by the org's subscription.
// Institution OWNER/ADMIN (or a platform admin) manages seats.
type PlusTeamsService struct {
	repo  plusteams.Repository
	users identity.UserRepository
	audit identity.AuditService
	// canManage — verifies the actor may manage the institution's Plus Teams
	// (institution OWNER/ADMIN or platform admin). Wired from main.
	canManage func(ctx context.Context, actorUserID, institutionID uuid.UUID, isAdmin bool) error
}

// WithManagerCheck wires the institution-manager authorization gate.
func (s *PlusTeamsService) WithManagerCheck(fn func(ctx context.Context, actorUserID, institutionID uuid.UUID, isAdmin bool) error) *PlusTeamsService {
	s.canManage = fn
	return s
}

func (s *PlusTeamsService) authorize(ctx context.Context, actorUserID, institutionID uuid.UUID, isAdmin bool) error {
	if s.canManage != nil {
		return s.canManage(ctx, actorUserID, institutionID, isAdmin)
	}
	return nil
}

func NewPlusTeamsService(repo plusteams.Repository, audit identity.AuditService) *PlusTeamsService {
	return &PlusTeamsService{repo: repo, audit: audit}
}

// WithUsers wires the user store so seat holders can be enriched with names.
func (s *PlusTeamsService) WithUsers(u identity.UserRepository) *PlusTeamsService {
	s.users = u
	return s
}

// SeatView — a seat enriched with the holder's name + email.
type SeatView struct {
	plusteams.Seat
	UserName  string `json:"user_name,omitempty"`
	UserEmail string `json:"user_email,omitempty"`
}

// GetAllocation returns the institution's Plus Teams seat allocation + usage.
func (s *PlusTeamsService) GetAllocation(ctx context.Context, institutionID uuid.UUID) (*plusteams.Allocation, error) {
	if s.repo == nil {
		return nil, errorsTeamsUnavailable()
	}
	a, err := s.repo.GetAllocation(ctx, institutionID)
	if err != nil {
		if err == domain.ErrNotFound {
			return &plusteams.Allocation{InstitutionID: institutionID, TotalSeats: 0, UsedSeats: 0}, nil
		}
		return nil, err
	}
	return a, nil
}

// SetSeats sets the institution's seat capacity (owner/admin or platform admin).
func (s *PlusTeamsService) SetSeats(ctx context.Context, actorUserID, institutionID uuid.UUID, isAdmin bool, totalSeats int) (*plusteams.Allocation, error) {
	if s.repo == nil {
		return nil, errorsTeamsUnavailable()
	}
	if err := s.authorize(ctx, actorUserID, institutionID, isAdmin); err != nil {
		return nil, err
	}
	if totalSeats < 0 {
		return nil, fmt.Errorf("%w: seat count cannot be negative", domain.ErrInvalidInput)
	}
	if err := s.repo.SetSeats(ctx, institutionID, totalSeats); err != nil {
		return nil, err
	}
	return s.GetAllocation(ctx, institutionID)
}

// AssignSeat adds a user to the institution's Plus Teams coverage.
func (s *PlusTeamsService) AssignSeat(ctx context.Context, actorUserID, institutionID, userID uuid.UUID, isAdmin bool) (*SeatView, error) {
	if s.repo == nil {
		return nil, errorsTeamsUnavailable()
	}
	if err := s.authorize(ctx, actorUserID, institutionID, isAdmin); err != nil {
		return nil, err
	}
	seat, err := s.repo.AssignSeat(ctx, institutionID, userID)
	if err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &actorUserID, identity.AuditCreate, "plus_teams_seat",
		&seat.ID, nil, map[string]any{"institution_id": institutionID.String(), "user_id": userID.String()}, nil, nil)
	return s.view(ctx, seat), nil
}

// ReleaseSeat removes a user from the institution's Plus Teams coverage.
func (s *PlusTeamsService) ReleaseSeat(ctx context.Context, actorUserID, institutionID, userID uuid.UUID, isAdmin bool) error {
	if s.repo == nil {
		return errorsTeamsUnavailable()
	}
	if err := s.authorize(ctx, actorUserID, institutionID, isAdmin); err != nil {
		return err
	}
	if err := s.repo.ReleaseSeat(ctx, institutionID, userID); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &actorUserID, identity.AuditDelete, "plus_teams_seat",
		nil, nil, map[string]any{"institution_id": institutionID.String(), "user_id": userID.String()}, nil, nil)
	return nil
}

// ListSeats returns the institution's seat holders (enriched).
func (s *PlusTeamsService) ListSeats(ctx context.Context, actorUserID, institutionID uuid.UUID, isAdmin bool) ([]SeatView, error) {
	if s.repo == nil {
		return []SeatView{}, nil
	}
	if err := s.authorize(ctx, actorUserID, institutionID, isAdmin); err != nil {
		return nil, err
	}
	seats, err := s.repo.ListSeats(ctx, institutionID)
	if err != nil {
		return nil, err
	}
	out := make([]SeatView, 0, len(seats))
	for i := range seats {
		out = append(out, *s.view(ctx, &seats[i]))
	}
	return out, nil
}

func (s *PlusTeamsService) view(ctx context.Context, seat *plusteams.Seat) *SeatView {
	v := &SeatView{Seat: *seat}
	if s.users != nil {
		if u, err := s.users.FindByID(ctx, seat.UserID); err == nil && u != nil {
			v.UserName = u.FirstName + " " + u.LastName
			v.UserEmail = u.Email
		}
	}
	return v
}

func errorsTeamsUnavailable() error {
	return fmt.Errorf("%w: plus teams store unavailable", domain.ErrInvalidInput)
}

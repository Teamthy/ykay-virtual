// Package teamsteams — NUVORA Plus Teams: institution seat management
// (migration 000069). An institution with a PLUS_TEAMS plan allocates seats;
// each seat is a user covered by the org's subscription.
package plusteams

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Allocation — an institution's Plus Teams seat capacity + usage.
type Allocation struct {
	InstitutionID uuid.UUID `json:"institution_id"`
	TotalSeats    int       `json:"total_seats"`
	UsedSeats     int       `json:"used_seats"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Seat — one user covered by an institution's Plus Teams plan.
type Seat struct {
	ID            uuid.UUID `json:"id"`
	InstitutionID uuid.UUID `json:"institution_id"`
	UserID        uuid.UUID `json:"user_id"`
	CreatedAt     time.Time `json:"created_at"`
}

// Repository — persistence for Plus Teams allocations + seats.
type Repository interface {
	GetAllocation(ctx context.Context, institutionID uuid.UUID) (*Allocation, error)
	SetSeats(ctx context.Context, institutionID uuid.UUID, totalSeats int) error

	AssignSeat(ctx context.Context, institutionID, userID uuid.UUID) (*Seat, error)
	ReleaseSeat(ctx context.Context, institutionID, userID uuid.UUID) error
	ListSeats(ctx context.Context, institutionID uuid.UUID) ([]Seat, error)
}

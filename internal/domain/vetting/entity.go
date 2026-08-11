package vetting

import (
	"github.com/google/uuid"
)

type VettingService interface {
	SubmitForReview(profileID uuid.UUID) error
	MoveToInterview(profileID uuid.UUID, actorID uuid.UUID) error
	Approve(profileID uuid.UUID, actorID uuid.UUID) error
	Reject(profileID uuid.UUID, actorID uuid.UUID, reason string) error
}

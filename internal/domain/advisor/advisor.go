// Package advisor — YK-Virtual Plus named Learning Advisor + personalised learning
// plan (migration 000067). A Plus family is assigned a staff advisor who owns
// the learning journey; the Plus dashboard surfaces the advisor and a learning
// plan (diagnostic-derived or advisor-authored).
package advisor

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Assignment — a Plus user's named advisor.
type Assignment struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"user_id"`         // Plus subscriber/family
	AdvisorUserID uuid.UUID  `json:"advisor_user_id"` // staff advisor
	Note          *string    `json:"note,omitempty"`
	AssignedBy    *uuid.UUID `json:"assigned_by,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// PlanStatus — lifecycle of a learning plan.
type PlanStatus string

const (
	PlanDraft     PlanStatus = "DRAFT"
	PlanActive    PlanStatus = "ACTIVE"
	PlanCompleted PlanStatus = "COMPLETED"
)

// PlanSource — where a plan came from.
type PlanSource string

const (
	SourceManual     PlanSource = "MANUAL"     // advisor-authored
	SourceDiagnostic PlanSource = "DIAGNOSTIC" // auto-generated from a diagnostic (000068)
)

// LearningPlan — a Plus user's personalised learning plan for a learner.
type LearningPlan struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	StudentProfileID uuid.UUID  `json:"student_profile_id"`
	Goals            *string    `json:"goals,omitempty"`
	FocusAreas       *string    `json:"focus_areas,omitempty"`
	Recommendations  *string    `json:"recommendations,omitempty"`
	Status           PlanStatus `json:"status"`
	Source           PlanSource `json:"source"` // MANUAL | DIAGNOSTIC (000068)
	CreatedBy        *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// Repository — persistence for advisor assignments and learning plans.
type Repository interface {
	Assign(ctx context.Context, a *Assignment) error
	GetByUser(ctx context.Context, userID uuid.UUID) (*Assignment, error)
	UpdateNote(ctx context.Context, id uuid.UUID, note *string) error

	UpsertPlan(ctx context.Context, p *LearningPlan) error
	GetPlan(ctx context.Context, userID, studentProfileID uuid.UUID) (*LearningPlan, error)
}

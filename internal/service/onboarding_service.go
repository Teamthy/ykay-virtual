package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// OnboardingService — stateful multi-page onboarding (Phase 10b):
// parents add learners (student profile + parent link), students can create
// their own profile, tutors continue into the vetting flow.

type OnboardingService struct {
	students identity.StudentProfileRepository
	links    identity.ParentStudentLinkRepository
	audit    identity.AuditService
	now      func() time.Time
}

func NewOnboardingService(students identity.StudentProfileRepository,
	links identity.ParentStudentLinkRepository, audit identity.AuditService) *OnboardingService {
	return &OnboardingService{students: students, links: links, audit: audit, now: time.Now}
}

type CreateLearnerInput struct {
	ParentUserID uuid.UUID
	FirstName    string
	LastName     string
	DateOfBirth  *time.Time
	SchoolName   *string
	CurrentLevel *string
	Relationship string // parent/guardian relationship, default "PARENT"
}

// CreateLearner — parent adds a linked learner. Enforces the guardian
// relationship (minors created/linked by parents — never self-register).
func (s *OnboardingService) CreateLearner(ctx context.Context, in CreateLearnerInput) (*identity.StudentProfile, error) {
	if strings.TrimSpace(in.FirstName) == "" || strings.TrimSpace(in.LastName) == "" {
		return nil, fmt.Errorf("%w: learner first and last name are required", domain.ErrInvalidInput)
	}
	if s.students == nil || s.links == nil {
		return nil, errors.New("learner store unavailable")
	}
	if in.Relationship == "" {
		in.Relationship = "PARENT"
	}
	learner := &identity.StudentProfile{
		FirstName:       strings.TrimSpace(in.FirstName),
		LastName:        strings.TrimSpace(in.LastName),
		DateOfBirth:     in.DateOfBirth,
		SchoolName:      in.SchoolName,
		CurrentLevel:    in.CurrentLevel,
		Timezone:        "Africa/Lagos",
		GuardianConsent: true, // parent-created learners are consent-attested
	}
	if err := s.students.Create(ctx, learner); err != nil {
		return nil, err
	}
	link := &identity.ParentStudentLink{
		ParentUserID:     in.ParentUserID,
		StudentProfileID: learner.ID,
		Relationship:     in.Relationship,
		IsPrimary:        true,
	}
	if err := s.links.Create(ctx, link); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &in.ParentUserID, identity.AuditCreate, "student_profile",
		&learner.ID, nil, map[string]any{"learner": learner.FirstName + " " + learner.LastName,
			"relationship": in.Relationship}, nil, nil)
	return learner, nil
}

// ListLearners — the parent's linked learners (object-level authz).
func (s *OnboardingService) ListLearners(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error) {
	if s.students == nil {
		return []identity.StudentProfile{}, nil
	}
	return s.students.ListByParentUserID(ctx, parentUserID)
}

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
	if strings.TrimSpace(in.FirstName) == "" {
		return nil, fmt.Errorf("%w: learner first name is required", domain.ErrInvalidInput)
	}
	if strings.TrimSpace(in.LastName) == "" {
		in.LastName = "Learner"
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

// ListLearners — linked learners for a parent, plus the caller's own student
// profile when they are a student (so settings/dashboard stay in sync).
func (s *OnboardingService) ListLearners(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error) {
	if s.students == nil {
		return []identity.StudentProfile{}, nil
	}
	list, err := s.students.ListByParentUserID(ctx, parentUserID)
	if err != nil {
		return nil, err
	}
	own, err := s.students.FindByUserID(ctx, parentUserID)
	if err == nil && own != nil {
		found := false
		for i := range list {
			if list[i].ID == own.ID {
				found = true
				break
			}
		}
		if !found {
			list = append([]identity.StudentProfile{*own}, list...)
		}
	}
	return list, nil
}

// EnsureOwnProfile — student onboarding creates/returns the profile attached
// to the signed-in user (not a child the parent books for).
func (s *OnboardingService) EnsureOwnProfile(ctx context.Context, userID uuid.UUID, firstName, lastName string, level *string, dob *time.Time) (*identity.StudentProfile, error) {
	if s.students == nil {
		return nil, errors.New("learner store unavailable")
	}
	if existing, err := s.students.FindByUserID(ctx, userID); err == nil && existing != nil {
		return existing, nil
	}
	if strings.TrimSpace(firstName) == "" {
		firstName = "Learner"
	}
	if strings.TrimSpace(lastName) == "" {
		lastName = "YK-Virtual"
	}
	uid := userID
	p := &identity.StudentProfile{
		UserID:          &uid,
		FirstName:       strings.TrimSpace(firstName),
		LastName:        strings.TrimSpace(lastName),
		DateOfBirth:     dob,
		CurrentLevel:    level,
		Timezone:        "Africa/Lagos",
		GuardianConsent: true,
	}
	if err := s.students.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

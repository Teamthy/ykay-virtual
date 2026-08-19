package service

import (
	"context"
	"fmt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/admissions"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/repository"

	"github.com/google/uuid"
)

// AdmissionsService — virtual-school admissions applications.
type AdmissionsService struct {
	uows repository.UnitOfWorkFactory
	// learnersForParent resolves the learner profiles a parent is linked to
	// (ownership gate).
	learnersForParent func(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error)
}

func NewAdmissionsService(uows repository.UnitOfWorkFactory) *AdmissionsService {
	return &AdmissionsService{uows: uows}
}

// WithOwnership wires the resolver used to verify a parent owns a learner.
func (s *AdmissionsService) WithOwnership(
	learnersForParent func(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error),
) *AdmissionsService {
	s.learnersForParent = learnersForParent
	return s
}

// ApplicationInput — fields for a new application.
type ApplicationInput struct {
	InstitutionID    *uuid.UUID
	ProgrammeID      *uuid.UUID
	CohortID         *uuid.UUID
	StudentProfileID uuid.UUID
	ApplicantName    string
	CurrentLevel     string
	PreferredTerm    string
	Notes            string
}

// Apply creates a PENDING admissions application on behalf of the parent.
func (s *AdmissionsService) Apply(ctx context.Context, parentUserID uuid.UUID, in ApplicationInput) (*admissions.Application, error) {
	if in.StudentProfileID == uuid.Nil {
		return nil, fmt.Errorf("%w: learner is required", domain.ErrInvalidInput)
	}
	// Ownership: parent must be linked to the learner (unless the learner is
	// the parent themselves — handled by the resolver returning it).
	if s.learnersForParent != nil {
		owned := false
		if learners, err := s.learnersForParent(ctx, parentUserID); err == nil {
			for _, l := range learners {
				if l.ID == in.StudentProfileID {
					owned = true
					break
				}
			}
		}
		if !owned {
			return nil, domain.ErrForbidden
		}
	}

	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	a := &admissions.Application{
		InstitutionID:    in.InstitutionID,
		ProgrammeID:      in.ProgrammeID,
		CohortID:         in.CohortID,
		ParentUserID:     parentUserID,
		StudentProfileID: in.StudentProfileID,
		ApplicantName:    in.ApplicantName,
		CurrentLevel:     strPtrOrNil(in.CurrentLevel),
		PreferredTerm:    strPtrOrNil(in.PreferredTerm),
		Notes:            strPtrOrNil(in.Notes),
		Status:           admissions.StatusPending,
	}
	if err := uow.Admissions().Create(ctx, a); err != nil {
		return nil, err
	}
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	return a, nil
}

// ListMine returns a family's applications.
func (s *AdmissionsService) ListMine(ctx context.Context, parentUserID uuid.UUID) ([]admissions.Application, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	return uow.Admissions().ListByParent(ctx, parentUserID, 50)
}

// SetStatus advances an application (admin). Validation of transitions is
// kept light; admins can review/offer/accept/reject.
func (s *AdmissionsService) SetStatus(ctx context.Context, adminID, appID uuid.UUID, status admissions.Status) (*admissions.Application, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	a, err := uow.Admissions().GetByID(ctx, appID)
	if err != nil {
		return nil, err
	}
	switch status {
	case admissions.StatusPending, admissions.StatusReviewing, admissions.StatusOffered,
		admissions.StatusAccepted, admissions.StatusRejected, admissions.StatusWithdrawn:
	default:
		return nil, fmt.Errorf("%w: invalid admissions status", domain.ErrInvalidInput)
	}
	// Once accepted or rejected, the application is final.
	if a.Status == admissions.StatusAccepted || a.Status == admissions.StatusRejected {
		return nil, fmt.Errorf("%w: application is already final", domain.ErrConflict)
	}
	if err := uow.Admissions().UpdateStatus(ctx, appID, status, &adminID); err != nil {
		return nil, err
	}
	a.Status = status
	a.ReviewedBy = &adminID
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	return a, nil
}

// ListQueue returns the admin admissions queue.
func (s *AdmissionsService) ListQueue(ctx context.Context, status string, page, pageSize int) ([]admissions.Application, int64, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer uow.Rollback()
	return uow.Admissions().ListAll(ctx, status, page, pageSize)
}

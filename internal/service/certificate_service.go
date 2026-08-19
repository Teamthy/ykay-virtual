package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/certificate"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/repository"

	"github.com/google/uuid"
)

// CertificateService — issues and serves learner completion certificates.
type CertificateService struct {
	uows repository.UnitOfWorkFactory
	// studentName resolves a student profile to a display name (optional).
	studentName func(ctx context.Context, studentProfileID uuid.UUID) (string, error)
	// programmeTitle resolves a programme id to its title (optional).
	programmeTitle func(ctx context.Context, programmeID uuid.UUID) (string, error)
	// studentByUserID returns the actor's own student profile, if any.
	studentByUserID func(ctx context.Context, userID uuid.UUID) (*identity.StudentProfile, error)
	// learnersForParent returns the learner profiles a parent user is linked to.
	learnersForParent func(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error)
	now               func() time.Time
}

func NewCertificateService(uows repository.UnitOfWorkFactory) *CertificateService {
	return &CertificateService{uows: uows, now: time.Now}
}

// WithStudentReader wires a student-name resolver.
func (s *CertificateService) WithStudentReader(fn func(ctx context.Context, id uuid.UUID) (string, error)) *CertificateService {
	s.studentName = fn
	return s
}

// WithProgrammeReader wires a programme-title resolver.
func (s *CertificateService) WithProgrammeReader(fn func(ctx context.Context, id uuid.UUID) (string, error)) *CertificateService {
	s.programmeTitle = fn
	return s
}

// WithOwnership wires the resolvers used to determine which student profiles
// an actor may view certificates for (own profile + linked learners).
func (s *CertificateService) WithOwnership(
	studentByUserID func(ctx context.Context, userID uuid.UUID) (*identity.StudentProfile, error),
	learnersForParent func(ctx context.Context, parentUserID uuid.UUID) ([]identity.StudentProfile, error),
) *CertificateService {
	s.studentByUserID = studentByUserID
	s.learnersForParent = learnersForParent
	return s
}

// Issuer is the party listed as issuing the credential.
const Issuer = "NUVORA Academy"

// IssueForCohort issues a certificate to every CONFIRMED enrollment of a
// completed cohort (idempotent: an existing certificate for a learner+cohort
// is skipped). Returns the certificates issued.
func (s *CertificateService) IssueForCohort(ctx context.Context, cohortID uuid.UUID) ([]certificate.Certificate, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	cohort, err := uow.Cohorts().GetByID(ctx, cohortID)
	if err != nil {
		return nil, err
	}
	if cohort.Status != booking.CohortCompleted {
		return nil, fmt.Errorf("%w: certificates can only be issued for a COMPLETED cohort (current %s)",
			domain.ErrConflict, cohort.Status)
	}

	enrollments, err := uow.Enrollments().ListByCohort(ctx, cohortID)
	if err != nil {
		return nil, err
	}

	var programmeTitle *string
	if s.programmeTitle != nil && cohort.ProgrammeID != uuid.Nil {
		if t, err := s.programmeTitle(ctx, cohort.ProgrammeID); err == nil && t != "" {
			programmeTitle = &t
		}
	}

	issued := []certificate.Certificate{}
	now := s.now().UTC()
	for _, e := range enrollments {
		if e.Status != booking.EnrollmentConfirmed {
			continue
		}
		existing, err := uow.Certificates().GetForStudentAndCohort(ctx, e.StudentProfileID, cohortID)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			continue // already issued
		}
		learnerName := "Learner"
		if s.studentName != nil {
			if n, err := s.studentName(ctx, e.StudentProfileID); err == nil && n != "" {
				learnerName = n
			}
		}
		num, err := newCredentialNumber(uow)
		if err != nil {
			return nil, err
		}
		c := &certificate.Certificate{
			StudentProfileID: e.StudentProfileID,
			CohortID:         &cohortID,
			ProgrammeID:      &cohort.ProgrammeID,
			LearnerName:      learnerName,
			Title:            "Completion Certificate",
			ProgrammeTitle:   programmeTitle,
			CredentialNumber: num,
			IssuedBy:         Issuer,
			IssuedAt:         now,
		}
		if err := uow.Certificates().Create(ctx, c); err != nil {
			// Unique (student, cohort) guard handles races across retries.
			if errors.Is(err, domain.ErrAlreadyExists) {
				continue
			}
			return nil, err
		}
		issued = append(issued, *c)
	}

	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}
	return issued, nil
}

// ListByStudent returns a learner's certificates.
func (s *CertificateService) ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]certificate.Certificate, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	return uow.Certificates().ListByStudent(ctx, studentProfileID, limit)
}

// studentIDsForUser resolves the student profile ids an actor may view. It
// includes the actor's own profile (when a learner) and any learner profiles
// they are linked to as a parent.
func (s *CertificateService) studentIDsForUser(ctx context.Context, actorUserID uuid.UUID) ([]uuid.UUID, error) {
	seen := map[uuid.UUID]bool{}
	var ids []uuid.UUID
	add := func(id uuid.UUID) {
		if id != uuid.Nil && !seen[id] {
			seen[id] = true
			ids = append(ids, id)
		}
	}
	if s.studentByUserID != nil {
		if p, err := s.studentByUserID(ctx, actorUserID); err == nil && p != nil {
			add(p.ID)
		}
	}
	if s.learnersForParent != nil {
		if ps, err := s.learnersForParent(ctx, actorUserID); err == nil {
			for _, p := range ps {
				add(p.ID)
			}
		}
	}
	return ids, nil
}

// ListForUser returns the certificates the actor may view (own + linked).
func (s *CertificateService) ListForUser(ctx context.Context, actorUserID uuid.UUID, limit int) ([]certificate.Certificate, error) {
	ids, err := s.studentIDsForUser(ctx, actorUserID)
	if err != nil {
		return nil, err
	}
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	var out []certificate.Certificate
	for _, id := range ids {
		certs, err := uow.Certificates().ListByStudent(ctx, id, limit)
		if err != nil {
			return nil, err
		}
		out = append(out, certs...)
	}
	return out, nil
}

// GetOwned returns one certificate only if the actor may view it.
func (s *CertificateService) GetOwned(ctx context.Context, actorUserID, id uuid.UUID) (*certificate.Certificate, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	c, err := uow.Certificates().GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	ids, err := s.studentIDsForUser(ctx, actorUserID)
	if err != nil {
		return nil, err
	}
	for _, sid := range ids {
		if sid == c.StudentProfileID {
			return c, nil
		}
	}
	return nil, domain.ErrForbidden
}

// GetByCredential verifies a certificate by its public credential number.
func (s *CertificateService) GetByCredential(ctx context.Context, number string) (*certificate.Certificate, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()
	return uow.Certificates().GetByCredential(ctx, number)
}

// newCredentialNumber generates a unique, human-verifiable credential number.
func newCredentialNumber(uow repository.UnitOfWork) (string, error) {
	for i := 0; i < 5; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
		if err != nil {
			return "", err
		}
		num := fmt.Sprintf("NUV-%06d", n.Int64())
		// Collision check (best-effort; the DB unique index enforces it).
		if _, err := uow.Certificates().GetByCredential(context.Background(), num); err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return num, nil
			}
			return "", err
		}
	}
	return "", fmt.Errorf("could not allocate a unique credential number")
}

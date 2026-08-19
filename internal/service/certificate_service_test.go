package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// TestCertificate_IssueForCompletedCohort — issuing certificates to a
// COMPLETED cohort's confirmed enrollments is idempotent.
func TestCertificate_IssueForCompletedCohort(t *testing.T) {
	store := memory.NewMemoryStore()
	svc := NewCertificateService(memory.NewMemoryUnitOfWorkFactory(store))
	svc.WithStudentReader(func(_ context.Context, id uuid.UUID) (string, error) {
		return "Ada Lovelace", nil
	})
	ctx := context.Background()

	cohortID := uuid.New()
	programmeID := uuid.New()
	// Completed cohort.
	require.NoError(t, store.Cohorts.Create(ctx, &booking.Cohort{
		ID: cohortID, ProgrammeID: programmeID, Title: "Maths Cohort", Status: booking.CohortCompleted,
	}))
	// Two confirmed enrollments + one pending (pending must NOT get a cert).
	s1, s2, s3 := uuid.New(), uuid.New(), uuid.New()
	enroll := func(s uuid.UUID, status booking.EnrollmentStatus) {
		require.NoError(t, store.Enrollments.Create(ctx, &booking.CohortEnrollment{
			CohortID: cohortID, StudentProfileID: s, Status: status,
		}))
	}
	enroll(s1, booking.EnrollmentConfirmed)
	enroll(s2, booking.EnrollmentConfirmed)
	enroll(s3, booking.EnrollmentPending)

	issued, err := svc.IssueForCohort(ctx, cohortID)
	require.NoError(t, err)
	require.Len(t, issued, 2, "only confirmed enrollments get certificates")

	// Idempotent: re-issuing does not duplicate.
	issued2, err := svc.IssueForCohort(ctx, cohortID)
	require.NoError(t, err)
	require.Len(t, issued2, 0)

	// Each has a unique credential number.
	require.NotEqual(t, issued[0].CredentialNumber, issued[1].CredentialNumber)
	require.Equal(t, Issuer, issued[0].IssuedBy)

	// Learner can list + verify.
	list, err := svc.ListByStudent(ctx, s1, 10)
	require.NoError(t, err)
	require.Len(t, list, 1)
	got, err := svc.GetByCredential(ctx, issued[0].CredentialNumber)
	require.NoError(t, err)
	require.Equal(t, "Ada Lovelace", got.LearnerName)
}

// TestCertificate_NonCompletedCohortRejected — cannot issue for a non-completed cohort.
func TestCertificate_NonCompletedCohortRejected(t *testing.T) {
	store := memory.NewMemoryStore()
	svc := NewCertificateService(memory.NewMemoryUnitOfWorkFactory(store))
	ctx := context.Background()
	cohortID := uuid.New()
	require.NoError(t, store.Cohorts.Create(ctx, &booking.Cohort{
		ID: cohortID, Title: "Live", Status: booking.CohortPublished,
	}))
	_, err := svc.IssueForCohort(ctx, cohortID)
	require.Error(t, err)
}

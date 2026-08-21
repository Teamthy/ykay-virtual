package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/learning"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newScopedLearningEnv wires the subject-scope enforcement: cohort ownership
// + onboarded-subject validation.
func newScopedLearningEnv(t *testing.T) (*LearningService, *memory.MemoryStore, uuid.UUID, uuid.UUID) {
	t.Helper()
	store := memory.NewMemoryStore()
	lm := memory.NewLearningMemory()
	svc := NewLearningService(lm, lm, lm, store.Assignments, NewAuditService(store.AuditLogs)).
		WithScope(store.Cohorts, store.TutorSubj)
	tutorID := uuid.New()

	// Tutor's cohort.
	cohort := &booking.Cohort{
		ID: uuid.New(), Title: "IGCSE Maths — Sept", Slug: "igcse-sept",
		TutorProfileID: &tutorID, Status: booking.CohortPublished, Capacity: 10,
	}
	store.Cohorts.Seed(cohort)

	// Another tutor's cohort (ownership guard).
	other := &booking.Cohort{
		ID: uuid.New(), Title: "Python — Sept", Slug: "python-sept",
		TutorProfileID: strPtrUUID(uuid.New()), Status: booking.CohortPublished, Capacity: 10,
	}
	store.Cohorts.Seed(other)

	return svc, store, tutorID, cohort.ID
}

func strPtrUUID(v uuid.UUID) *uuid.UUID { return &v }

func questionBank(n int) []AssessmentQuestionInput {
	out := make([]AssessmentQuestionInput, 0, n)
	for i := 0; i < n; i++ {
		out = append(out, AssessmentQuestionInput{
			Question: "Q", Options: []string{"A", "B"}, CorrectIndex: 0,
		})
	}
	return out
}

// TestExamSubjectScope_SingleSubjectAutoDefaults — a tutor with exactly one
// onboarded subject gets it applied automatically.
func TestExamSubjectScope_SingleSubjectAutoDefaults(t *testing.T) {
	svc, store, tutorID, cohortID := newScopedLearningEnv(t)
	ctx := context.Background()

	maths := uuid.New()
	require.NoError(t, store.TutorSubj.AddForTutor(ctx, tutorID, maths))

	a, err := svc.CreateAssessment(ctx, CreateAssessmentInput{
		TutorProfileID: tutorID, CohortID: &cohortID,
		Title: "Algebra quiz", Questions: questionBank(2),
	})
	require.NoError(t, err)
	require.NotNil(t, a.SubjectID)
	assert.Equal(t, maths, *a.SubjectID)
}

// TestExamSubjectScope_MultiSubjectRequiresChoice — a tutor teaching several
// subjects must pick which one the exam covers.
func TestExamSubjectScope_MultiSubjectRequiresChoice(t *testing.T) {
	svc, store, tutorID, cohortID := newScopedLearningEnv(t)
	ctx := context.Background()

	require.NoError(t, store.TutorSubj.AddForTutor(ctx, tutorID, uuid.New()))
	require.NoError(t, store.TutorSubj.AddForTutor(ctx, tutorID, uuid.New()))

	_, err := svc.CreateAssessment(ctx, CreateAssessmentInput{
		TutorProfileID: tutorID, CohortID: &cohortID,
		Title: "Mixed quiz", Questions: questionBank(2),
	})
	assert.ErrorIs(t, err, domain.ErrInvalidInput, "multi-subject tutors must choose")
}

// TestExamSubjectScope_OutsideScopeForbidden — a subject the tutor was NOT
// onboarded for is rejected.
func TestExamSubjectScope_OutsideScopeForbidden(t *testing.T) {
	svc, store, tutorID, cohortID := newScopedLearningEnv(t)
	ctx := context.Background()

	require.NoError(t, store.TutorSubj.AddForTutor(ctx, tutorID, uuid.New()))
	foreign := uuid.New()

	_, err := svc.CreateAssessment(ctx, CreateAssessmentInput{
		TutorProfileID: tutorID, CohortID: &cohortID, SubjectID: &foreign,
		Title: "Physics quiz", Questions: questionBank(2),
	})
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

// TestExamSubjectScope_InScopeAllowed — an onboarded subject passes and is
// stored on the exam.
func TestExamSubjectScope_InScopeAllowed(t *testing.T) {
	svc, store, tutorID, cohortID := newScopedLearningEnv(t)
	ctx := context.Background()

	maths := uuid.New()
	physics := uuid.New()
	require.NoError(t, store.TutorSubj.AddForTutor(ctx, tutorID, maths))
	require.NoError(t, store.TutorSubj.AddForTutor(ctx, tutorID, physics))

	a, err := svc.CreateAssessment(ctx, CreateAssessmentInput{
		TutorProfileID: tutorID, CohortID: &cohortID, SubjectID: &physics,
		Title: "Physics quiz", Questions: questionBank(2),
	})
	require.NoError(t, err)
	require.NotNil(t, a.SubjectID)
	assert.Equal(t, physics, *a.SubjectID)
}

// TestExamSubjectScope_NoOnboardedSubjects — a tutor without any teaching
// scope cannot author exams at all.
func TestExamSubjectScope_NoOnboardedSubjects(t *testing.T) {
	svc, _, tutorID, cohortID := newScopedLearningEnv(t)
	ctx := context.Background()

	_, err := svc.CreateAssessment(ctx, CreateAssessmentInput{
		TutorProfileID: tutorID, CohortID: &cohortID,
		Title: "Quiz", Questions: questionBank(1),
	})
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

// TestExamCohortOwnership_OnlyTheCohortTutorAuthors — exams on a cohort can
// only be created by its assigned tutor.
func TestExamCohortOwnership_OnlyTheCohortTutorAuthors(t *testing.T) {
	svc, store, tutorID, _ := newScopedLearningEnv(t)
	ctx := context.Background()

	require.NoError(t, store.TutorSubj.AddForTutor(ctx, tutorID, uuid.New()))

	// Find the OTHER tutor's cohort.
	cohorts, _, err := store.Cohorts.ListAll(ctx, booking.CohortListParams{PageSize: 100})
	require.NoError(t, err)
	var otherCohort *booking.Cohort
	for i := range cohorts {
		if cohorts[i].TutorProfileID != nil && *cohorts[i].TutorProfileID != tutorID {
			c := cohorts[i]
			otherCohort = &c
		}
	}
	require.NotNil(t, otherCohort)

	_, err = svc.CreateAssessment(ctx, CreateAssessmentInput{
		TutorProfileID: tutorID, CohortID: &otherCohort.ID,
		Title: "Intruder quiz", Questions: questionBank(1),
	})
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

// TestExamHub_ListForStudent — a student sees every published exam across
// their confirmed cohorts, and nothing else.
func TestExamHub_ListForStudent(t *testing.T) {
	store := memory.NewMemoryStore()
	lm := memory.NewLearningMemory()
	svc := NewLearningService(lm, lm, lm, store.Assignments, NewAuditService(store.AuditLogs))

	// Student confirmed in cohort A but NOT in cohort B.
	student := uuid.New()
	cohortA := &booking.Cohort{ID: uuid.New(), Title: "A", TutorProfileID: strPtrUUID(uuid.New()), Status: booking.CohortPublished, Capacity: 10}
	cohortB := &booking.Cohort{ID: uuid.New(), Title: "B", TutorProfileID: strPtrUUID(uuid.New()), Status: booking.CohortPublished, Capacity: 10}
	store.Cohorts.Seed(cohortA)
	store.Cohorts.Seed(cohortB)

	require.NoError(t, store.Enrollments.Create(context.Background(), &booking.CohortEnrollment{
		ID: uuid.New(), CohortID: cohortA.ID, StudentProfileID: student,
		ParentUserID: uuid.New(), Status: booking.EnrollmentConfirmed,
	}))
	lm.WithEnrollmentLister(func(_ context.Context, sid uuid.UUID) ([]uuid.UUID, error) {
		if sid == student {
			return []uuid.UUID{cohortA.ID}, nil
		}
		return nil, nil
	})

	require.NoError(t, lm.CreateAssessment(context.Background(), &learning.LearnerAssessment{
		ID: uuid.New(), CohortID: &cohortA.ID, TutorProfileID: uuid.New(),
		Title: "A exam", Status: learning.AssessmentPublished,
	}))
	require.NoError(t, lm.CreateAssessment(context.Background(), &learning.LearnerAssessment{
		ID: uuid.New(), CohortID: &cohortB.ID, TutorProfileID: uuid.New(),
		Title: "B exam", Status: learning.AssessmentPublished,
	}))

	list, err := svc.ListAssessmentsForStudent(context.Background(), student)
	require.NoError(t, err)
	require.Len(t, list, 1)
	assert.Equal(t, "A exam", list[0].Title)
}

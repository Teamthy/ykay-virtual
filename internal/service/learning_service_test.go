package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/learning"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newLearningEnv(t *testing.T) (*LearningService, *memory.LearningMemory, *memory.MemoryStore) {
	t.Helper()
	store := memory.NewMemoryStore()
	lm := memory.NewLearningMemory()
	svc := NewLearningService(lm, lm, lm, store.Assignments, NewAuditService(store.AuditLogs))
	return svc, lm, store
}

func TestLearning_CreateAssessment_ValidationAndQuestions(t *testing.T) {
	svc, _, _ := newLearningEnv(t)
	ctx := context.Background()

	// Empty title
	_, err := svc.CreateAssessment(ctx, CreateAssessmentInput{TutorProfileID: uuid.New(), Title: "", Questions: []AssessmentQuestionInput{
		{Question: "Q", Options: []string{"A", "B"}, CorrectIndex: 0},
	}})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// No questions
	_, err = svc.CreateAssessment(ctx, CreateAssessmentInput{TutorProfileID: uuid.New(), Title: "Quiz"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// Bad correct index
	_, err = svc.CreateAssessment(ctx, CreateAssessmentInput{TutorProfileID: uuid.New(), Title: "Quiz", Questions: []AssessmentQuestionInput{
		{Question: "Q", Options: []string{"A", "B"}, CorrectIndex: 5},
	}})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// Valid
	a, err := svc.CreateAssessment(ctx, CreateAssessmentInput{
		TutorProfileID: uuid.New(), Title: "Week 3 Quiz",
		Questions: []AssessmentQuestionInput{
			{Question: "2+2?", Options: []string{"3", "4", "5"}, CorrectIndex: 1, Explanation: strPtr("2+2=4")},
			{Question: "Capital of Nigeria?", Options: []string{"Lagos", "Abuja", "Kano"}, CorrectIndex: 1},
		},
	})
	require.NoError(t, err)
	assert.Equal(t, learning.AssessmentPublished, a.Status)

	questions, err := svc.assessments.GetQuestions(ctx, a.ID)
	require.NoError(t, err)
	assert.Len(t, questions, 2)
	assert.Equal(t, 1, questions[0].CorrectIndex)
}

func TestLearning_Assessment_TakeAndAutoGrade(t *testing.T) {
	svc, _, _ := newLearningEnv(t)
	ctx := context.Background()
	student := uuid.New()

	a, err := svc.CreateAssessment(ctx, CreateAssessmentInput{
		TutorProfileID: uuid.New(), Title: "Maths Check",
		Questions: []AssessmentQuestionInput{
			{Question: "2+2?", Options: []string{"3", "4", "5"}, CorrectIndex: 1},
			{Question: "3*3?", Options: []string{"6", "9", "12"}, CorrectIndex: 1},
		},
	})
	require.NoError(t, err)

	start, err := svc.StartAssessment(ctx, student, a.ID)
	require.NoError(t, err)
	assert.Len(t, start.Questions, 2)
	// Answer 1 correct, 1 wrong → score 1/2 = 50% ≥ 0.5 threshold → passed
	result, err := svc.SubmitAssessment(ctx, student, start.Attempt.ID, []AssessmentAnswer{
		{QuestionID: start.Questions[0].ID, ChosenIndex: 1},
		{QuestionID: start.Questions[1].ID, ChosenIndex: 0},
	})
	require.NoError(t, err)
	assert.Equal(t, 1, result.Correct)
	assert.Equal(t, 2, result.Total)
	assert.True(t, result.Passed)

	// Third student, both wrong → 0/2 → not passed.
	s3 := uuid.New()
	start3, err := svc.StartAssessment(ctx, s3, a.ID)
	require.NoError(t, err)
	res3, err := svc.SubmitAssessment(ctx, s3, start3.Attempt.ID, []AssessmentAnswer{
		{QuestionID: start3.Questions[0].ID, ChosenIndex: 0},
		{QuestionID: start3.Questions[1].ID, ChosenIndex: 0},
	})
	require.NoError(t, err)
	assert.Equal(t, 0, res3.Correct)
	assert.False(t, res3.Passed)

	// Resubmit rejected (completed).
	_, err = svc.SubmitAssessment(ctx, student, start.Attempt.ID, []AssessmentAnswer{
		{QuestionID: start.Questions[0].ID, ChosenIndex: 1},
		{QuestionID: start.Questions[1].ID, ChosenIndex: 1},
	})
	assert.ErrorIs(t, err, domain.ErrConflict)

	// Second student gets their own attempt.
	other := uuid.New()
	start2, err := svc.StartAssessment(ctx, other, a.ID)
	require.NoError(t, err)
	assert.NotEqual(t, start.Attempt.ID, start2.Attempt.ID)
}

func TestLearning_Assessment_SingleAttemptPerStudent(t *testing.T) {
	svc, _, _ := newLearningEnv(t)
	ctx := context.Background()
	student := uuid.New()

	a, err := svc.CreateAssessment(ctx, CreateAssessmentInput{
		TutorProfileID: uuid.New(), Title: "Quiz",
		Questions: []AssessmentQuestionInput{{Question: "Q?", Options: []string{"A", "B"}, CorrectIndex: 0}},
	})
	require.NoError(t, err)

	_, err = svc.StartAssessment(ctx, student, a.ID)
	require.NoError(t, err)
	// Starting again returns the existing attempt (no duplicate).
	start, err := svc.StartAssessment(ctx, student, a.ID)
	require.NoError(t, err)
	assert.Equal(t, learning.AttemptInProgress, start.Attempt.Status)
}

func TestLearning_Assessment_CrossQuestionRejected(t *testing.T) {
	svc, _, _ := newLearningEnv(t)
	ctx := context.Background()
	student := uuid.New()

	a, err := svc.CreateAssessment(ctx, CreateAssessmentInput{
		TutorProfileID: uuid.New(), Title: "Quiz",
		Questions: []AssessmentQuestionInput{{Question: "Q?", Options: []string{"A", "B"}, CorrectIndex: 0}},
	})
	require.NoError(t, err)
	start, err := svc.StartAssessment(ctx, student, a.ID)
	require.NoError(t, err)

	// Answer with a question from a different assessment → rejected.
	other, err := svc.CreateAssessment(ctx, CreateAssessmentInput{
		TutorProfileID: uuid.New(), Title: "Other",
		Questions: []AssessmentQuestionInput{{Question: "X?", Options: []string{"A", "B"}, CorrectIndex: 1}},
	})
	require.NoError(t, err)
	otherQ, _ := svc.assessments.GetQuestions(ctx, other.ID)

	_, err = svc.SubmitAssessment(ctx, student, start.Attempt.ID, []AssessmentAnswer{
		{QuestionID: otherQ[0].ID, ChosenIndex: 1},
	})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestLearning_Grading_AndProgressReports(t *testing.T) {
	svc, lm, _ := newLearningEnv(t)
	ctx := context.Background()
	student := uuid.New()

	// Seed a submission and grade it.
	assignmentID := uuid.New()
	lm.SeedSubmission(learning.GradedSubmission{AssignmentID: assignmentID, StudentProfileID: student, Content: strPtr("My essay")})
	graded, err := svc.ListSubmissionsByAssignment(ctx, assignmentID)
	require.NoError(t, err)
	require.Len(t, graded, 1)
	subID := graded[0].ID

	require.NoError(t, svc.GradeSubmission(ctx, uuid.New(), subID, f64Ptr(85), strPtr("Excellent work!")))
	graded, err = svc.ListSubmissionsByAssignment(ctx, assignmentID)
	require.NoError(t, err)
	require.Len(t, graded, 1)
	assert.Equal(t, 85.0, *graded[0].Score)
	assert.Equal(t, "Excellent work!", *graded[0].Feedback)
	assert.NotNil(t, graded[0].GradedAt)

	// Invalid score rejected.
	err = svc.GradeSubmission(ctx, uuid.New(), subID, f64Ptr(150), nil)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// Progress report.
	report, err := svc.CreateProgressReport(ctx, CreateReportInput{
		TutorUserID: uuid.New(), StudentProfileID: student, TutorProfileID: uuid.New(),
		PeriodStart: time.Now().AddDate(0, -1, 0), PeriodEnd: time.Now(),
		Strengths: strPtr("Algebra"), Weaknesses: strPtr("Geometry"), Recommendations: strPtr("Practice 20 min daily"),
		OverallRating: intPtr(4),
	})
	require.NoError(t, err)
	assert.NotEmpty(t, report.ID)

	reports, err := svc.ListProgressByStudent(ctx, student)
	require.NoError(t, err)
	assert.Len(t, reports, 1)

	// Invalid period rejected.
	_, err = svc.CreateProgressReport(ctx, CreateReportInput{
		TutorUserID: uuid.New(), StudentProfileID: student, TutorProfileID: uuid.New(),
		PeriodStart: time.Now(), PeriodEnd: time.Now().AddDate(0, -1, 0),
	})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

// SubmitAssessmentForStudent resolves the student's attempt from the assessment
// ID — the HTTP surface addresses the assessment, not the attempt UUID.
func TestLearning_SubmitByAssessmentID(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	svc := NewLearningService(
		store.Learning, store.Learning, store.Learning, store.Assignments,
		NewAuditService(store.AuditLogs))

	tutor := uuid.New()
	a, err := svc.CreateAssessment(ctx, CreateAssessmentInput{
		AuthorUserID: uuid.New(), TutorProfileID: tutor, Title: "T",
		Questions: []AssessmentQuestionInput{
			{Question: "Q1", Options: []string{"A", "B"}, CorrectIndex: 1},
			{Question: "Q2", Options: []string{"C", "D"}, CorrectIndex: 0},
		},
	})
	require.NoError(t, err)

	student := uuid.New()
	start, err := svc.StartAssessment(ctx, student, a.ID)
	require.NoError(t, err)
	require.Len(t, start.Questions, 2)

	res, err := svc.SubmitAssessmentForStudent(ctx, student, a.ID, []AssessmentAnswer{
		{QuestionID: start.Questions[0].ID, ChosenIndex: 1},
		{QuestionID: start.Questions[1].ID, ChosenIndex: 1},
	})
	require.NoError(t, err)
	assert.Equal(t, 1, res.Correct)
	assert.Equal(t, 2, res.Total)
	assert.True(t, res.Passed)

	// Submitting again is a conflict (single attempt).
	_, err = svc.SubmitAssessmentForStudent(ctx, student, a.ID, []AssessmentAnswer{{QuestionID: uuid.New(), ChosenIndex: 0}})
	assert.ErrorIs(t, err, domain.ErrConflict)

	// Student who never started: not found.
	_, err = svc.SubmitAssessmentForStudent(ctx, uuid.New(), a.ID, []AssessmentAnswer{{QuestionID: uuid.New(), ChosenIndex: 0}})
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

// Memory-mode analytics derive live numbers from the shared store (dev mode).
func TestAnalytics_FunnelCohortRevenueFromMemory(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	svc := NewAnalyticsService(store.Analytics)
	if store.Analytics == nil {
		// guard: NewMemoryStore must expose the analytics store
		t.Fatal("store.Analytics is nil")
	}

	// 2 users, 1 student profile, 1 confirmed enrollment.
	now := time.Now()
	u1 := uuid.New()
	u2 := uuid.New()
	_ = store.Users.Create(ctx, &identity.User{ID: u1, Email: "p1@test.com", Status: identity.UserStatusActive, EmailVerifiedAt: &now, CreatedAt: now})
	_ = store.Users.Create(ctx, &identity.User{ID: u2, Email: "p2@test.com", Status: identity.UserStatusActive, CreatedAt: now})
	sp := uuid.New()
	_ = store.Students.Create(ctx, &identity.StudentProfile{ID: sp, UserID: &u1, FirstName: "Ada", CreatedAt: now})

	prog := uuid.New()
	cohort := uuid.New()
	_ = store.Cohorts.Create(ctx, &booking.Cohort{ID: cohort, ProgrammeID: prog, Title: "SS1 Maths", Capacity: 10, EnrolledCount: 4})
	_ = store.Enrollments.Create(ctx, &booking.CohortEnrollment{ID: uuid.New(), CohortID: cohort, StudentProfileID: sp, Status: booking.EnrollmentConfirmed})

	// Paid order with a COHORT item → revenue by programme.
	orderID := uuid.New()
	_ = store.Orders.Create(ctx, &payment.Order{ID: orderID, Status: payment.OrderPaid, TotalAmount: 75000, Currency: "NGN", CreatedAt: now})
	_ = store.Orders.CreateItem(ctx, &payment.OrderItem{ID: uuid.New(), OrderID: orderID, ItemType: "COHORT", ReferenceID: cohort, Quantity: 1, UnitPrice: 75000, TotalPrice: 75000})

	funnel, err := svc.Funnel(ctx)
	require.NoError(t, err)
	assert.Equal(t, int64(2), funnel.RegisteredUsers)
	assert.Equal(t, int64(1), funnel.LearnersCreated)
	assert.Equal(t, int64(1), funnel.OrdersCreated)
	assert.Equal(t, int64(1), funnel.PaidOrders)
	assert.Equal(t, int64(1), funnel.EnrollmentsConfirmed)
	assert.InDelta(t, 50.0, funnel.ConversionRate, 0.001)

	cohorts, err := svc.CohortAnalytics(ctx, 10)
	require.NoError(t, err)
	require.Len(t, cohorts, 1)
	assert.Equal(t, 10, cohorts[0].Capacity)
	assert.Equal(t, 4, cohorts[0].Enrolled)
	assert.InDelta(t, 0.4, cohorts[0].FillRate, 0.001)

	revenue, err := svc.RevenueByProgramme(ctx, 10)
	require.NoError(t, err)
	require.Len(t, revenue, 1)
	assert.Equal(t, prog, revenue[0].ProgrammeID)
	assert.InDelta(t, 75000.0, revenue[0].Revenue, 0.001)
	assert.Equal(t, int64(1), revenue[0].Orders)
}

// Expired attempts: the worker cron marks stale IN_PROGRESS attempts EXPIRED,
// and submit afterwards is a conflict.
func TestLearning_ExpireStaleAttempts(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	svc := NewLearningService(
		store.Learning, store.Learning, store.Learning, store.Assignments,
		NewAuditService(store.AuditLogs))

	a, err := svc.CreateAssessment(ctx, CreateAssessmentInput{
		AuthorUserID: uuid.New(), TutorProfileID: uuid.New(), Title: "T",
		Questions: []AssessmentQuestionInput{{Question: "Q", Options: []string{"A", "B"}, CorrectIndex: 0}},
	})
	require.NoError(t, err)

	student := uuid.New()
	start, err := svc.StartAssessment(ctx, student, a.ID)
	require.NoError(t, err)

	// The attempt window is 30 minutes; a future "now" makes the cron's
	// "expires_at < before" predicate catch it (no store mutation needed —
	// GetAttempt returns a copy).
	n, err := store.Learning.ExpireStaleAttempts(ctx, time.Now().UTC().Add(31*time.Minute))
	require.NoError(t, err)
	assert.Equal(t, int64(1), n)

	// Submit after expiry → conflict.
	_, err = svc.SubmitAssessment(ctx, student, start.Attempt.ID, []AssessmentAnswer{
		{QuestionID: start.Questions[0].ID, ChosenIndex: 0},
	})
	assert.ErrorIs(t, err, domain.ErrConflict)
}

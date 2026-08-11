package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"
	"ykay-virtual/internal/repository/memory"
	"ykay-virtual/internal/storage"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Harness ---

type vettingEnv struct {
	store       *memory.MemoryStore
	svc         *VettingService
	actor       uuid.UUID
	admin       uuid.UUID
	subject     uuid.UUID
	profile     uuid.UUID
	invalidator *fakeInvalidator
}

type fakeInvalidator struct{ calls int }

func (f *fakeInvalidator) InvalidateSearch(_ context.Context) error {
	f.calls++
	return nil
}

func newVettingEnv(t *testing.T) *vettingEnv {
	t.Helper()
	store := memory.NewMemoryStore()
	audit := NewAuditService(store.AuditLogs)
	actor := uuid.New()
	admin := uuid.New()
	subject := uuid.New()

	inv := &fakeInvalidator{}
	svc := NewVettingService(
		memory.NewMemoryUnitOfWorkFactory(store),
		storage.NewLocalStorage(),
		audit,
		SubjectReaderAdapter{}, // nil repo → accepts any subject id
		inv,
	)
	svc.clock = func() time.Time { return fixedTime }

	// Create the tutor profile via the service (also tests CreateProfile).
	profile, err := svc.CreateProfile(context.Background(), actor, CreateProfileInput{
		DisplayName:     "Test Tutor",
		Bio:             strPtr("Experienced teacher"),
		YearsExperience: 5,
		HourlyRateMin:   f64Ptr(5000),
		HourlyRateMax:   f64Ptr(10000),
		Currency:        "NGN",
		Timezone:        "Africa/Lagos",
		AcceptsOnline:   true,
		AcceptsInPerson: true,
	})
	require.NoError(t, err)

	// Teaching scope + 5 questions + a document for the happy path.
	require.NoError(t, svc.AddSubject(context.Background(), actor, profile.ID, subject))
	seedQuestions(t, store, subject, 5)
	_, err = svc.RequestDocumentUpload(context.Background(), actor, profile.ID,
		vetting.DocGovtID, "id-card.jpg", "image/jpeg", intPtr(2048))
	require.NoError(t, err)

	return &vettingEnv{
		store: store, svc: svc, actor: actor, admin: admin,
		subject: subject, profile: profile.ID, invalidator: inv,
	}
}

func seedQuestions(t *testing.T, store *memory.MemoryStore, subjectID uuid.UUID, n int) {
	t.Helper()
	for i := 0; i < n; i++ {
		store.Vetting.SeedQuestion(vetting.AssessmentQuestion{
			SubjectID:    subjectID,
			Question:     "Q" + string(rune('A'+i)),
			Options:      []string{"A. x", "B. y", "C. z", "D. w"},
			CorrectIndex: 1,
			Difficulty:   vetting.DiffEasy,
			IsActive:     true,
		})
	}
}

func f64Ptr(f float64) *float64 { return &f }

// --- Profile creation ---

func TestCreateProfile_Success(t *testing.T) {
	env := newVettingEnv(t)
	p, err := env.svc.GetMyProfile(context.Background(), env.actor)
	require.NoError(t, err)
	assert.Equal(t, tutor.TutorStatusDraft, p.Status)
	assert.Contains(t, p.Slug, "test-tutor")
	assert.Equal(t, "Test Tutor", p.DisplayName)
	assert.Equal(t, 5, p.YearsExperience)
}

func TestCreateProfile_DuplicateConflict(t *testing.T) {
	env := newVettingEnv(t)
	_, err := env.svc.CreateProfile(context.Background(), env.actor, CreateProfileInput{
		DisplayName: "Another", YearsExperience: 2,
	})
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestCreateProfile_Validation(t *testing.T) {
	env := newVettingEnv(t)
	_, err := env.svc.CreateProfile(context.Background(), uuid.New(), CreateProfileInput{})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

// --- Submission ---

func TestSubmitForReview_HappyPath(t *testing.T) {
	env := newVettingEnv(t)
	err := env.svc.SubmitForReview(context.Background(), env.actor, env.profile)
	require.NoError(t, err)

	p, err := env.store.Vetting.GetProfileByID(context.Background(), env.profile)
	require.NoError(t, err)
	assert.Equal(t, tutor.TutorStatusSubmitted, p.Status)

	events, _ := env.store.Vetting.ListEvents(context.Background(), env.profile, 10)
	assert.NotEmpty(t, events)
}

func TestSubmitForReview_RequiresBio(t *testing.T) {
	store := memory.NewMemoryStore()
	audit := NewAuditService(store.AuditLogs)
	actor := uuid.New()
	svc := NewVettingService(memory.NewMemoryUnitOfWorkFactory(store), storage.NewLocalStorage(),
		audit, SubjectReaderAdapter{}, &fakeInvalidator{})
	p, err := svc.CreateProfile(context.Background(), actor, CreateProfileInput{
		DisplayName: "No Bio", YearsExperience: 3, HourlyRateMin: f64Ptr(4000),
	})
	require.NoError(t, err)

	err = svc.SubmitForReview(context.Background(), actor, p.ID)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestSubmitForReview_RequiresSubjectAndDocument(t *testing.T) {
	store := memory.NewMemoryStore()
	audit := NewAuditService(store.AuditLogs)
	actor := uuid.New()
	svc := NewVettingService(memory.NewMemoryUnitOfWorkFactory(store), storage.NewLocalStorage(),
		audit, SubjectReaderAdapter{}, &fakeInvalidator{})
	p, err := svc.CreateProfile(context.Background(), actor, CreateProfileInput{
		DisplayName: "Incomplete", Bio: strPtr("bio"), YearsExperience: 3,
		HourlyRateMin: f64Ptr(4000),
	})
	require.NoError(t, err)

	err = svc.SubmitForReview(context.Background(), actor, p.ID)
	assert.ErrorIs(t, err, domain.ErrInvalidInput) // no subjects

	require.NoError(t, svc.AddSubject(context.Background(), actor, p.ID, uuid.New()))
	err = svc.SubmitForReview(context.Background(), actor, p.ID)
	assert.ErrorIs(t, err, domain.ErrInvalidInput) // no documents
}

func TestSubmitForReview_NonOwnerForbidden(t *testing.T) {
	env := newVettingEnv(t)
	err := env.svc.SubmitForReview(context.Background(), uuid.New(), env.profile)
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

// --- Admin workflow ---

func TestFullWorkflow_ToApproval(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()

	require.NoError(t, env.svc.SubmitForReview(ctx, env.actor, env.profile))
	require.NoError(t, env.svc.StartReview(ctx, env.admin, env.profile))
	require.NoError(t, env.svc.MoveToInterview(ctx, env.admin, env.profile))

	// Verification requires an approved GOVT_ID.
	err := env.svc.MoveToVerification(ctx, env.admin, env.profile)
	assert.ErrorIs(t, err, domain.ErrConflict)

	// Approve the ID document.
	docs, err := env.store.Vetting.ListDocuments(ctx, env.profile)
	require.NoError(t, err)
	require.NotEmpty(t, docs)
	require.NoError(t, env.svc.ReviewDocument(ctx, env.admin, docs[0].ID, true, ""))

	require.NoError(t, env.svc.MoveToVerification(ctx, env.admin, env.profile))

	// Approval still requires a passed assessment.
	err = env.svc.Approve(ctx, env.admin, env.profile)
	assert.ErrorIs(t, err, domain.ErrConflict)

	// Pass the assessment (5 questions, answer all correctly).
	attempt, err := env.svc.StartAssessment(ctx, env.actor, env.profile, env.subject)
	require.NoError(t, err)
	require.Len(t, attempt.Questions, 5)
	var answers []AssessmentAnswerInput
	for _, q := range attempt.Questions {
		answers = append(answers, AssessmentAnswerInput{QuestionID: q.ID, ChosenIndex: 1}) // correct index
	}
	res, err := env.svc.SubmitAssessment(ctx, env.actor, attempt.Attempt.ID, answers)
	require.NoError(t, err)
	assert.True(t, res.Passed)
	assert.Equal(t, 5, res.Correct)

	require.NoError(t, env.svc.Approve(ctx, env.admin, env.profile))

	p, err := env.store.Vetting.GetProfileByID(ctx, env.profile)
	require.NoError(t, err)
	assert.Equal(t, tutor.TutorStatusApproved, p.Status)
	assert.True(t, p.IsPublic)
	assert.NotNil(t, p.ApprovedAt)
	assert.Greater(t, p.RankingScore, 0.0)

	// Search cache invalidated on approval.
	assert.Equal(t, 1, env.invalidator.calls)
}

func TestApprove_WithoutCompetency_Conflict(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()
	require.NoError(t, env.svc.SubmitForReview(ctx, env.actor, env.profile))
	require.NoError(t, env.svc.StartReview(ctx, env.admin, env.profile))
	require.NoError(t, env.svc.MoveToInterview(ctx, env.admin, env.profile))
	docs, _ := env.store.Vetting.ListDocuments(ctx, env.profile)
	require.NoError(t, env.svc.ReviewDocument(ctx, env.admin, docs[0].ID, true, ""))
	require.NoError(t, env.svc.MoveToVerification(ctx, env.admin, env.profile))

	err := env.svc.Approve(ctx, env.admin, env.profile)
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestReject_RequiresReason(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()
	require.NoError(t, env.svc.SubmitForReview(ctx, env.actor, env.profile))
	require.NoError(t, env.svc.StartReview(ctx, env.admin, env.profile)) // SUBMITTED → UNDER_REVIEW

	err := env.svc.Reject(ctx, env.admin, env.profile, "")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	require.NoError(t, env.svc.Reject(ctx, env.admin, env.profile, "credentials could not be verified"))
	p, _ := env.store.Vetting.GetProfileByID(ctx, env.profile)
	assert.Equal(t, tutor.TutorStatusRejected, p.Status)
}

func TestHoldAndResume(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()
	require.NoError(t, env.svc.SubmitForReview(ctx, env.actor, env.profile))
	require.NoError(t, env.svc.Hold(ctx, env.admin, env.profile, "waiting for guarantor"))

	p, _ := env.store.Vetting.GetProfileByID(ctx, env.profile)
	assert.Equal(t, tutor.TutorStatusHold, p.Status)

	require.NoError(t, env.svc.StartReview(ctx, env.admin, env.profile)) // HOLD → UNDER_REVIEW allowed
	p, _ = env.store.Vetting.GetProfileByID(ctx, env.profile)
	assert.Equal(t, tutor.TutorStatusUnderReview, p.Status)
}

func TestSuspend_HidesProfileAndInvalidatesCache(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()
	// Drive straight to approval via service transitions.
	require.NoError(t, env.svc.SubmitForReview(ctx, env.actor, env.profile))
	require.NoError(t, env.svc.StartReview(ctx, env.admin, env.profile))
	require.NoError(t, env.svc.MoveToInterview(ctx, env.admin, env.profile))
	docs, _ := env.store.Vetting.ListDocuments(ctx, env.profile)
	require.NoError(t, env.svc.ReviewDocument(ctx, env.admin, docs[0].ID, true, ""))
	require.NoError(t, env.svc.MoveToVerification(ctx, env.admin, env.profile))
	attempt, err := env.svc.StartAssessment(ctx, env.actor, env.profile, env.subject)
	require.NoError(t, err)
	var answers []AssessmentAnswerInput
	for _, q := range attempt.Questions {
		answers = append(answers, AssessmentAnswerInput{QuestionID: q.ID, ChosenIndex: 1})
	}
	_, err = env.svc.SubmitAssessment(ctx, env.actor, attempt.Attempt.ID, answers)
	require.NoError(t, err)
	require.NoError(t, env.svc.Approve(ctx, env.admin, env.profile))

	before := env.invalidator.calls
	require.NoError(t, env.svc.Suspend(ctx, env.admin, env.profile, "reported misconduct"))
	p, _ := env.store.Vetting.GetProfileByID(ctx, env.profile)
	assert.Equal(t, tutor.TutorStatusSuspended, p.Status)
	assert.False(t, p.IsPublic)
	assert.Equal(t, before+1, env.invalidator.calls)
}

// --- Documents ---

func TestDocumentReview_RejectRequiresReason(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()
	docs, _ := env.store.Vetting.ListDocuments(ctx, env.profile)
	require.NotEmpty(t, docs)

	err := env.svc.ReviewDocument(ctx, env.admin, docs[0].ID, false, "")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	require.NoError(t, env.svc.ReviewDocument(ctx, env.admin, docs[0].ID, false, "blurry image"))
	d, _ := env.store.Vetting.GetDocument(ctx, docs[0].ID)
	assert.Equal(t, vetting.DocStatusRejected, d.Status)
	assert.NotNil(t, d.RejectionReason)

	// Double review rejected.
	err = env.svc.ReviewDocument(ctx, env.admin, docs[0].ID, true, "")
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestDocumentSignedURL_Authz(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()
	docs, _ := env.store.Vetting.ListDocuments(ctx, env.profile)
	require.NotEmpty(t, docs)

	// Owner can get a signed URL.
	url, err := env.svc.GetDocumentSignedURL(ctx, env.actor, docs[0].ID, false)
	require.NoError(t, err)
	assert.Contains(t, url, "/objects/private/")

	// Stranger forbidden.
	_, err = env.svc.GetDocumentSignedURL(ctx, uuid.New(), docs[0].ID, false)
	assert.ErrorIs(t, err, domain.ErrForbidden)

	// Admin allowed.
	url2, err := env.svc.GetDocumentSignedURL(ctx, uuid.New(), docs[0].ID, true)
	require.NoError(t, err)
	assert.Contains(t, url2, "/objects/private/")
}

// --- Assessment engine ---

func TestAssessment_ScoringAndRetakeGuard(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()

	attempt, err := env.svc.StartAssessment(ctx, env.actor, env.profile, env.subject)
	require.NoError(t, err)
	assert.False(t, attempt.Attempt.ExpiresAt.IsZero())

	// 3/5 correct → 0.6 → FAILED.
	var answers []AssessmentAnswerInput
	for i, q := range attempt.Questions {
		idx := 2 // wrong
		if i < 3 {
			idx = 1 // correct
		}
		answers = append(answers, AssessmentAnswerInput{QuestionID: q.ID, ChosenIndex: idx})
	}
	res, err := env.svc.SubmitAssessment(ctx, env.actor, attempt.Attempt.ID, answers)
	require.NoError(t, err)
	assert.False(t, res.Passed)
	assert.Equal(t, 3, res.Correct)
	assert.Nil(t, res.ExpiresAt)

	// Resubmission of a COMPLETED attempt rejected.
	_, err = env.svc.SubmitAssessment(ctx, env.actor, attempt.Attempt.ID, answers)
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestAssessment_ExpiredAttempt(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()

	// Create attempt then move the clock past expiry.
	attempt, err := env.svc.StartAssessment(ctx, env.actor, env.profile, env.subject)
	require.NoError(t, err)
	env.svc.clock = func() time.Time { return fixedTime.Add(2 * time.Hour) }

	var answers []AssessmentAnswerInput
	for _, q := range attempt.Questions {
		answers = append(answers, AssessmentAnswerInput{QuestionID: q.ID, ChosenIndex: 1})
	}
	_, err = env.svc.SubmitAssessment(ctx, env.actor, attempt.Attempt.ID, answers)
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestAssessment_CrossSubjectAnswerRejected(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()
	otherSubject := uuid.New()
	seedQuestions(t, env.store, otherSubject, 5)

	attempt, err := env.svc.StartAssessment(ctx, env.actor, env.profile, env.subject)
	require.NoError(t, err)

	// Answer with a question from a different subject → rejected.
	otherQ, _ := env.store.Vetting.ListQuestionsForSubject(ctx, otherSubject, 1)
	require.NotEmpty(t, otherQ)
	_, err = env.svc.SubmitAssessment(ctx, env.actor, attempt.Attempt.ID, []AssessmentAnswerInput{
		{QuestionID: otherQ[0].ID, ChosenIndex: 1},
	})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestAssessment_SubjectNotInScopeForbidden(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()
	_, err := env.svc.StartAssessment(ctx, env.actor, env.profile, uuid.New())
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

func TestAssessment_InsufficientQuestionBank(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()
	sparseSubject := uuid.New()
	seedQuestions(t, env.store, sparseSubject, 2) // fewer than 5 required
	require.NoError(t, env.svc.AddSubject(ctx, env.actor, env.profile, sparseSubject))

	_, err := env.svc.StartAssessment(ctx, env.actor, env.profile, sparseSubject)
	assert.ErrorIs(t, err, domain.ErrConflict)
}

// --- Admin queue ---

func TestListQueue_FilterAndPaginate(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()
	require.NoError(t, env.svc.SubmitForReview(ctx, env.actor, env.profile))

	list, total, err := env.svc.ListQueue(ctx, "SUBMITTED", 1, 20)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, list, 1)
	assert.Equal(t, env.profile, list[0].ID)

	list, total, err = env.svc.ListQueue(ctx, "APPROVED", 1, 20)
	require.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.Empty(t, list)
}

func TestProfileDetail_IncludesTimeline(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()
	require.NoError(t, env.svc.SubmitForReview(ctx, env.actor, env.profile))
	require.NoError(t, env.svc.StartReview(ctx, env.admin, env.profile))

	detail, err := env.svc.GetProfileDetail(ctx, env.profile)
	require.NoError(t, err)
	assert.Equal(t, env.profile, detail.Profile.ID)
	assert.NotEmpty(t, detail.Documents)
	assert.NotEmpty(t, detail.Subjects)
	assert.NotEmpty(t, detail.Events)
}

func TestRecomputeAllRankings(t *testing.T) {
	env := newVettingEnv(t)
	ctx := context.Background()
	// Manually approve the profile (skip assessment) via repo for ranking cron test.
	require.NoError(t, env.store.Vetting.MarkApproved(ctx, env.profile, env.admin, 10))

	n, err := env.svc.RecomputeAllRankings(ctx)
	require.NoError(t, err)
	assert.Equal(t, 1, n)

	p, _ := env.store.Vetting.GetProfileByID(ctx, env.profile)
	assert.Greater(t, p.RankingScore, 0.0)
}

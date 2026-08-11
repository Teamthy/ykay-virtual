package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/referral"
	"ykay-virtual/internal/domain/review"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type growthEnv struct {
	store     *memory.MemoryStore
	reviews   *ReviewService
	referrals *ReferralService
	tutor     uuid.UUID
	parent    uuid.UUID
	admin     uuid.UUID
}

func newGrowthEnv(t *testing.T) *growthEnv {
	t.Helper()
	store := memory.NewMemoryStore()
	audit := NewAuditService(store.AuditLogs)

	tutorID := uuid.New()
	store.Tutors.Seed(tutor.TutorSearchResult{
		Profile: tutor.TutorProfile{
			ID: tutorID, Slug: "review-tutor", DisplayName: "Review Tutor",
			Status: tutor.TutorStatusApproved, IsPublic: true,
		},
	})

	return &growthEnv{
		store:     store,
		reviews:   NewReviewService(store.Reviews, store.Tutors, audit),
		referrals: NewReferralService(store.Referrals, store.Wallets, audit),
		tutor:     tutorID,
		parent:    uuid.New(),
		admin:     uuid.New(),
	}
}

// --- Reviews ---

func TestReview_Create_RequiresConsent(t *testing.T) {
	env := newGrowthEnv(t)
	ctx := context.Background()

	_, err := env.reviews.Create(ctx, CreateReviewInput{
		ReviewerUserID: env.parent, TutorProfileID: env.tutor, Rating: 5,
		Comment: strPtr("Great tutor!"), ConsentGiven: false,
	})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestReview_Create_And_Moderate_Publishes(t *testing.T) {
	env := newGrowthEnv(t)
	ctx := context.Background()

	rv, err := env.reviews.Create(ctx, CreateReviewInput{
		ReviewerUserID: env.parent, TutorProfileID: env.tutor, Rating: 5,
		Title: strPtr("Excellent"), Comment: strPtr("Very clear explanations."), ConsentGiven: true,
	})
	require.NoError(t, err)
	assert.Equal(t, review.ReviewPending, rv.Status)

	// Not visible publicly before moderation.
	pub, err := env.reviews.ListPublishedByTutor(ctx, env.tutor, 10)
	require.NoError(t, err)
	assert.Empty(t, pub)

	// Moderate → publish (admin, consent present).
	require.NoError(t, env.reviews.Moderate(ctx, env.admin, rv.ID, review.ReviewPublished))
	pub, err = env.reviews.ListPublishedByTutor(ctx, env.tutor, 10)
	require.NoError(t, err)
	assert.Len(t, pub, 1)
	assert.Equal(t, 5, pub[0].Rating)
}

func TestReview_Duplicate_Conflict(t *testing.T) {
	env := newGrowthEnv(t)
	ctx := context.Background()
	_, err := env.reviews.Create(ctx, CreateReviewInput{
		ReviewerUserID: env.parent, TutorProfileID: env.tutor, Rating: 4, ConsentGiven: true,
	})
	require.NoError(t, err)
	_, err = env.reviews.Create(ctx, CreateReviewInput{
		ReviewerUserID: env.parent, TutorProfileID: env.tutor, Rating: 3, ConsentGiven: true,
	})
	assert.ErrorIs(t, err, domain.ErrConflict)
}

func TestReview_Moderate_WithoutConsent_Conflict(t *testing.T) {
	// Force a review without consent into the store, then try publishing.
	store := memory.NewMemoryStore()
	reviews := memory.NewReviewMemory()
	rv := &review.Review{ReviewerUserID: uuid.New(), TutorProfileID: uuid.New(), Rating: 5, Status: review.ReviewPending, ConsentGiven: false}
	reviews.Seed(rv)
	svc := NewReviewService(reviews, store.Tutors, NewAuditService(store.AuditLogs))

	err := svc.Moderate(context.Background(), uuid.New(), rv.ID, review.ReviewPublished)
	assert.ErrorIs(t, err, domain.ErrConflict)

	require.NoError(t, svc.Moderate(context.Background(), uuid.New(), rv.ID, review.ReviewHidden))
}

// --- Referrals ---

func TestReferral_FullRewardLoop(t *testing.T) {
	env := newGrowthEnv(t)
	ctx := context.Background()

	// Referrer gets a code.
	rc, err := env.referrals.GetOrCreateCode(ctx, env.parent)
	require.NoError(t, err)
	assert.Len(t, rc.Code, 8)

	// Same user → same code (idempotent).
	rc2, err := env.referrals.GetOrCreateCode(ctx, env.parent)
	require.NoError(t, err)
	assert.Equal(t, rc.Code, rc2.Code)

	// New user applies the code.
	friend := uuid.New()
	ref, err := env.referrals.Apply(ctx, friend, rc.Code)
	require.NoError(t, err)
	assert.Equal(t, "PENDING", ref.Status)
	assert.Equal(t, env.parent, ref.ReferrerUserID)
	assert.Equal(t, ReferralRewardAmount, ref.RewardAmount)

	// Can't use own code.
	_, err = env.referrals.Apply(ctx, env.parent, rc.Code)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// Duplicate referral for same user → conflict.
	_, err = env.referrals.Apply(ctx, friend, rc.Code)
	assert.ErrorIs(t, err, domain.ErrConflict)

	// First paid order qualifies + rewards the referrer's wallet.
	require.NoError(t, env.referrals.QualifyOnOrderPaid(ctx, friend, uuid.New()))
	w, err := env.store.Wallets.GetByUserID(ctx, env.parent)
	require.NoError(t, err)
	assert.Equal(t, ReferralRewardAmount, w.Balance)

	// Idempotent: a second paid order does NOT double-reward.
	require.NoError(t, env.referrals.QualifyOnOrderPaid(ctx, friend, uuid.New()))
	w2, _ := env.store.Wallets.GetByUserID(ctx, env.parent)
	assert.Equal(t, ReferralRewardAmount, w2.Balance)

	// Referral marked REWARDED.
	ref2, _ := env.store.Referrals.GetByReferredUser(ctx, friend)
	assert.Equal(t, "REWARDED", ref2.Status)

	// Referrer's list shows it.
	mine, err := env.referrals.ListMine(ctx, env.parent, 20)
	require.NoError(t, err)
	assert.Len(t, mine, 1)
	assert.Equal(t, "REWARDED", mine[0].Status)
}

func TestReferral_InvalidCode(t *testing.T) {
	env := newGrowthEnv(t)
	ctx := context.Background()
	_, err := env.referrals.Apply(ctx, uuid.New(), "NOPE1234")
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestReferral_NonReferredUser_NoOp(t *testing.T) {
	env := newGrowthEnv(t)
	ctx := context.Background()
	// No referral exists for this user → qualify is a silent no-op.
	require.NoError(t, env.referrals.QualifyOnOrderPaid(ctx, uuid.New(), uuid.New()))
}

func TestReferral_UniqueCodes(t *testing.T) {
	env := newGrowthEnv(t)
	ctx := context.Background()
	codes := map[string]bool{}
	for i := 0; i < 20; i++ {
		rc, err := env.referrals.GetOrCreateCode(ctx, uuid.New())
		require.NoError(t, err)
		assert.False(t, codes[rc.Code], "duplicate code generated")
		codes[rc.Code] = true
	}
}

// --- Institutions ---

func TestInstitution_Create_B2B(t *testing.T) {
	store := memory.NewMemoryStore()
	svc := NewInstitutionService(store.Institutions, NewAuditService(store.AuditLogs))
	ctx := context.Background()

	email := "hello@lagosprep.edu.ng"
	inst, err := svc.Create(ctx, CreateInstitutionInput{
		Name: "Lagos Prep School", Type: "SCHOOL", Email: &email,
		Description: strPtr("A leading secondary school in Lagos."),
		OwnerUserID: &uuid.UUID{},
	})
	require.NoError(t, err)
	assert.Equal(t, "lagos-prep-school", inst.Slug)
	assert.True(t, inst.IsActive)

	_, err = svc.Create(ctx, CreateInstitutionInput{Name: "Lagos Prep School"})
	assert.ErrorIs(t, err, domain.ErrAlreadyExists)

	_, err = svc.Create(ctx, CreateInstitutionInput{})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

var _ = referral.Referral{}

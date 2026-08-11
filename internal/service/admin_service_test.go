package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/content"
	"ykay-virtual/internal/domain/institution"
	"ykay-virtual/internal/domain/referral"
	"ykay-virtual/internal/domain/review"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newAdminEnv(t *testing.T) (*AdminService, *memory.AdminBlogMemory) {
	t.Helper()
	store := memory.NewMemoryStore()
	blog := memory.NewAdminBlogMemory()
	svc := NewAdminService(
		memory.NewStatsMemory(), blog,
		memory.NewInstitutionMemory(), memory.NewReferralMemory(), memory.NewReviewMemory(),
		NewAuditService(store.AuditLogs),
	)
	return svc, blog
}

func TestAdmin_CreatePost_PublishesAndTags(t *testing.T) {
	svc, _ := newAdminEnv(t)
	ctx := context.Background()
	admin := uuid.New()

	post, err := svc.CreatePost(ctx, admin, content.BlogDraft{
		Title:      "IGCSE Maths Guide 2027",
		Content:    "Full guide body...",
		Status:     content.StatusPublished,
		SubjectIDs: []uuid.UUID{uuid.New()},
		ExamIDs:    []uuid.UUID{uuid.New()},
	})
	require.NoError(t, err)
	assert.Equal(t, "igcse-maths-guide-2027", post.Slug)
	assert.Equal(t, content.StatusPublished, post.Status)
	require.NotNil(t, post.PublishedAt)

	res, err := svc.ListPosts(ctx, content.BlogListAllParams{Page: 1, PageSize: 20})
	require.NoError(t, err)
	assert.Equal(t, int64(1), res.Total)
	assert.Equal(t, "IGCSE Maths Guide 2027", res.Posts[0].Title)
}

func TestAdmin_CreatePost_ValidationAndSlugConflict(t *testing.T) {
	svc, _ := newAdminEnv(t)
	ctx := context.Background()
	admin := uuid.New()

	_, err := svc.CreatePost(ctx, admin, content.BlogDraft{Content: "no title"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	_, err = svc.CreatePost(ctx, admin, content.BlogDraft{Title: "T", Content: "body"})
	require.NoError(t, err)

	_, err = svc.CreatePost(ctx, admin, content.BlogDraft{Title: "T", Content: "body"})
	assert.ErrorIs(t, err, domain.ErrAlreadyExists)
}

func TestAdmin_SetPostStatus(t *testing.T) {
	svc, _ := newAdminEnv(t)
	ctx := context.Background()
	admin := uuid.New()

	post, err := svc.CreatePost(ctx, admin, content.BlogDraft{Title: "Draft post", Content: "body"})
	require.NoError(t, err)
	assert.Equal(t, content.StatusDraft, post.Status)

	require.NoError(t, svc.SetPostStatus(ctx, admin, post.ID, content.StatusPublished))
	updated, err := svc.GetPostByIDForTest(ctx, post.ID)
	require.NoError(t, err)
	assert.Equal(t, content.StatusPublished, updated.Status)

	err = svc.SetPostStatus(ctx, admin, post.ID, "BOGUS")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestAdmin_ReviewModeration_RequiresConsent(t *testing.T) {
	store := memory.NewMemoryStore()
	reviews := memory.NewReviewMemory()
	reviewRow := &review.Review{
		ReviewerUserID: uuid.New(), TutorProfileID: uuid.New(),
		Rating: 5, Status: review.ReviewPending, ConsentGiven: false,
	}
	reviews.Seed(reviewRow)

	svc := NewAdminService(memory.NewStatsMemory(), memory.NewAdminBlogMemory(),
		memory.NewInstitutionMemory(), memory.NewReferralMemory(), reviews,
		NewAuditService(store.AuditLogs))

	// No consent → cannot publish.
	err := svc.ModerateReview(context.Background(), uuid.New(), reviewRow.ID, review.ReviewPublished)
	assert.ErrorIs(t, err, domain.ErrConflict)

	// Hide works without consent.
	require.NoError(t, svc.ModerateReview(context.Background(), uuid.New(), reviewRow.ID, review.ReviewHidden))

	// Consent given → publish works + is_public set.
	reviewRow.ConsentGiven = true
	require.NoError(t, svc.ModerateReview(context.Background(), uuid.New(), reviewRow.ID, review.ReviewPublished))
	rv, _ := reviews.GetByID(context.Background(), reviewRow.ID)
	assert.Equal(t, review.ReviewPublished, rv.Status)
	assert.True(t, rv.IsPublic)
}

func TestAdmin_Lists(t *testing.T) {
	store := memory.NewMemoryStore()
	institutions := memory.NewInstitutionMemory()
	institutions.Seed(&institution.Institution{Name: "Lagos Prep School", Type: institution.TypeSchool, IsActive: true})
	referrals := memory.NewReferralMemory()
	referrals.Seed(referral.Referral{ReferrerUserID: uuid.New(), ReferredUserID: uuid.New(), ReferralCodeID: uuid.New(), Status: "PENDING"})

	svc := NewAdminService(memory.NewStatsMemory(), memory.NewAdminBlogMemory(),
		institutions, referrals, memory.NewReviewMemory(), NewAuditService(store.AuditLogs))
	ctx := context.Background()

	insts, total, err := svc.ListInstitutions(ctx, institution.InstitutionListParams{Page: 1, PageSize: 20})
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Equal(t, "Lagos Prep School", insts[0].Name)

	refs, rTotal, err := svc.ListReferrals(ctx, referral.ReferralListParams{Page: 1, PageSize: 20})
	require.NoError(t, err)
	assert.Equal(t, int64(1), rTotal)
	assert.Equal(t, "PENDING", refs[0].Status)

	overview, err := svc.Overview(ctx)
	require.NoError(t, err)
	assert.NotNil(t, overview)
}

func TestAdmin_UpdatePost(t *testing.T) {
	svc, _ := newAdminEnv(t)
	ctx := context.Background()
	admin := uuid.New()

	post, err := svc.CreatePost(ctx, admin, content.BlogDraft{Title: "Original", Content: "body"})
	require.NoError(t, err)

	seo := "New SEO title"
	updated, err := svc.UpdatePost(ctx, admin, post.ID, content.BlogDraft{SeoTitle: &seo})
	require.NoError(t, err)
	assert.Equal(t, "New SEO title", *updated.SeoTitle)
	assert.Equal(t, "Original", updated.Title)

	_, err = svc.UpdatePost(ctx, admin, uuid.New(), content.BlogDraft{})
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

// GetPostByIDForTest — convenience accessor for the memory blog store.
func (s *AdminService) GetPostByIDForTest(ctx context.Context, id uuid.UUID) (*content.BlogPost, error) {
	return s.blog.GetByID(ctx, id)
}

var _ = time.Now

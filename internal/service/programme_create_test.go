package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newProgrammeEnv wires AdminService with the programme lifecycle store.
func newProgrammeEnv(t *testing.T) *AdminService {
	t.Helper()
	store := memory.NewMemoryStore()
	svc := NewAdminService(
		memory.NewStatsMemory(), memory.NewAdminBlogMemory(),
		memory.NewInstitutionMemory(), memory.NewReferralMemory(), memory.NewReviewMemory(),
		NewAuditService(store.AuditLogs),
	).WithContentSignoff(store.Testimonials, memory.NewProgrammeLifecycleMemory(store.Programmes))
	return svc
}

func TestCreateProgrammeAdmin_DefaultsAndSlug(t *testing.T) {
	svc := newProgrammeEnv(t)
	ctx := context.Background()
	admin := uuid.New()

	p, err := svc.CreateProgrammeAdmin(ctx, admin, CreateProgrammeInput{
		Title: "IGCSE Mathematics Mastery",
	})
	require.NoError(t, err)
	assert.Equal(t, "igcse-mathematics-mastery", p.Slug)
	assert.Equal(t, academics.ProgrammeDraft, p.Status)
	assert.Equal(t, academics.FormatCohort, p.Format)
	assert.Equal(t, "NGN", p.Currency)
}

func TestCreateProgrammeAdmin_SlugConflict(t *testing.T) {
	svc := newProgrammeEnv(t)
	ctx := context.Background()
	admin := uuid.New()

	_, err := svc.CreateProgrammeAdmin(ctx, admin, CreateProgrammeInput{Title: "GCSE Maths", Slug: "gcse-maths"})
	require.NoError(t, err)
	_, err = svc.CreateProgrammeAdmin(ctx, admin, CreateProgrammeInput{Title: "GCSE Maths again", Slug: "gcse-maths"})
	assert.ErrorIs(t, err, domain.ErrAlreadyExists)
}

func TestCreateProgrammeAdmin_Validation(t *testing.T) {
	svc := newProgrammeEnv(t)
	ctx := context.Background()
	admin := uuid.New()

	_, err := svc.CreateProgrammeAdmin(ctx, admin, CreateProgrammeInput{Title: "  "})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	lo, hi := 5000.0, 2000.0
	_, err = svc.CreateProgrammeAdmin(ctx, admin, CreateProgrammeInput{
		Title: "Pricing test", PriceMin: &lo, PriceMax: &hi,
	})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestCreateProgrammeAdmin_PublishFlow(t *testing.T) {
	svc := newProgrammeEnv(t)
	ctx := context.Background()
	admin := uuid.New()

	p, err := svc.CreateProgrammeAdmin(ctx, admin, CreateProgrammeInput{Title: "UTME Marathon Bootcamp"})
	require.NoError(t, err)

	require.NoError(t, svc.SetProgrammeStatusAdmin(ctx, admin, p.ID, string(academics.ProgrammePublished)))

	life, err := memoryLifecycleGet(t, svc, p.ID)
	require.NoError(t, err)
	assert.Equal(t, academics.ProgrammePublished, life.Status)
	assert.NotNil(t, life.PublishedAt)
	assert.NotNil(t, life.ReviewDueAt)
}

func memoryLifecycleGet(t *testing.T, svc *AdminService, id uuid.UUID) (*academics.ProgrammeLifecycle, error) {
	t.Helper()
	return svc.programmes.GetLifecycle(context.Background(), id)
}

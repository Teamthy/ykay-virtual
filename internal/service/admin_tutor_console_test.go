package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTutorConsoleEnv(t *testing.T) (*AdminService, *memory.MemoryStore) {
	t.Helper()
	store := memory.NewMemoryStore()
	store.Roles.Seed()
	store.Subjects.Seed(academics.Subject{ID: uuid.New(), Name: "Mathematics", Slug: "mathematics", IsActive: true})
	svc := NewAdminService(
		memory.NewStatsMemory(), memory.NewAdminBlogMemory(),
		memory.NewInstitutionMemory(), memory.NewReferralMemory(), memory.NewReviewMemory(),
		NewAuditService(store.AuditLogs),
	).WithUsers(store.Users, store.Roles).
		WithVetting(store.Vetting).
		WithTutorConsole(store.Subjects, store.TutorSubj)
	return svc, store
}

func TestUpsertTutorAdmin_CreateApproved(t *testing.T) {
	svc, store := newTutorConsoleEnv(t)
	ctx := context.Background()
	admin := uuid.New()

	profile, err := svc.UpsertTutorAdmin(ctx, admin, AdminUpsertTutorInput{
		Email: "newtutor@test.com", Password: "Str0ngPass!",
		DisplayName: "Adaeze Okonkwo", YearsExperience: 5,
		Approve: true, SubjectSlugs: []string{"mathematics"},
	})
	require.NoError(t, err)
	assert.Equal(t, tutor.TutorStatusApproved, profile.Status)
	assert.True(t, profile.IsPublic)
	assert.Contains(t, profile.Slug, "adaeze-okonkwo")

	// Account exists with the TUTOR role and can log in (hash is bcrypt).
	u, err := store.Users.FindByEmail(ctx, "newtutor@test.com")
	require.NoError(t, err)
	assert.Equal(t, "ACTIVE", string(u.Status))
	roles, err := store.Roles.RolesForUser(ctx, u.ID)
	require.NoError(t, err)
	hasTutor := false
	for _, r := range roles {
		if r.Name == "TUTOR" {
			hasTutor = true
		}
	}
	assert.True(t, hasTutor, "tutor role must be granted")

	// Teaching scope attached (memory stores the subject id; the PG repo
	// resolves the display name).
	subs, err := store.TutorSubj.ListByTutor(ctx, profile.ID)
	require.NoError(t, err)
	require.Len(t, subs, 1)
	assert.NotEqual(t, uuid.Nil, subs[0].SubjectID)
}

func TestUpsertTutorAdmin_ValidationAndIdempotency(t *testing.T) {
	svc, _ := newTutorConsoleEnv(t)
	ctx := context.Background()
	admin := uuid.New()

	// New account without password rejected.
	_, err := svc.UpsertTutorAdmin(ctx, admin, AdminUpsertTutorInput{Email: "x@test.com", DisplayName: "X"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// Bad email rejected.
	_, err = svc.UpsertTutorAdmin(ctx, admin, AdminUpsertTutorInput{Email: "not-an-email", DisplayName: "X", Password: "Str0ngPass!"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	// Create, then idempotent edit with a new password.
	_, err = svc.UpsertTutorAdmin(ctx, admin, AdminUpsertTutorInput{
		Email: "t2@test.com", Password: "FirstPass1", DisplayName: "First Name",
	})
	require.NoError(t, err)

	second, err := svc.UpsertTutorAdmin(ctx, admin, AdminUpsertTutorInput{
		Email: "t2@test.com", Password: "NewPass99", DisplayName: "Updated Name",
		YearsExperience: 7,
	})
	require.NoError(t, err)
	assert.Equal(t, "Updated Name", second.DisplayName)
	assert.Equal(t, 7, second.YearsExperience)
}

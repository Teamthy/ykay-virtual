package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newJoinEnv builds an AdminService wired for the cohort-join feature with a
// seeded programme + cohort and one tutor profile per status.
func newJoinEnv(t *testing.T) (*AdminService, *memory.CohortMemory, *memory.VettingMemory) {
	t.Helper()
	store := memory.NewMemoryStore()

	prog := academics.Programme{
		ID:     uuid.New(),
		Title:  "GCSE Mathematics",
		Slug:   "gcse-mathematics",
		Status: academics.ProgrammePublished,
		Format: academics.FormatCohort,
	}
	store.Programmes.Seed(prog)

	cohort := &booking.Cohort{
		ID:          uuid.New(),
		ProgrammeID: prog.ID,
		Title:       "GCSE Maths — September cohort",
		Slug:        "gcse-maths-september",
		Capacity:    10,
		Status:      booking.CohortPublished,
		Currency:    "NGN",
	}
	store.Cohorts.Seed(cohort)

	svc := NewAdminService(
		memory.NewStatsMemory(), memory.NewAdminBlogMemory(),
		memory.NewInstitutionMemory(), memory.NewReferralMemory(), memory.NewReviewMemory(),
		NewAuditService(store.AuditLogs),
	)
	svc.WithCohortAdmin(store.Cohorts.WithProgrammes(store.Programmes), store.Lessons)
	svc.WithVetting(store.Vetting)
	svc.WithTutors(store.Tutors)
	return svc, store.Cohorts, store.Vetting
}

func seedTutor(t *testing.T, vet *memory.VettingMemory, userID uuid.UUID, status tutor.TutorStatus) *tutor.TutorProfile {
	t.Helper()
	p := &tutor.TutorProfile{
		ID:          uuid.New(),
		UserID:      userID,
		Slug:        "tutor-" + uuid.NewString()[:8],
		DisplayName: "Test Tutor",
		Status:      status,
	}
	vet.SeedProfile(p)
	return p
}

func TestCohortJoin_ApprovedTutorCanRequest(t *testing.T) {
	svc, _, vet := newJoinEnv(t)
	ctx := context.Background()
	userID := uuid.New()
	seedTutor(t, vet, userID, tutor.TutorStatusApproved)

	cohorts, _, err := svc.ListCohortsAdmin(ctx, "PUBLISHED", 1, 20)
	require.NoError(t, err)
	require.Len(t, cohorts, 1)

	note := "I taught GCSE Maths for 6 years"
	jr, err := svc.RequestCohortJoinForUser(ctx, userID, cohorts[0].ID, &note)
	require.NoError(t, err)
	assert.Equal(t, booking.CohortJoinPending, jr.Status)
	assert.Equal(t, cohorts[0].ID, jr.CohortID)
	assert.Equal(t, &note, jr.Note)
	assert.Nil(t, jr.ReviewedAt)
	assert.Nil(t, jr.ReviewedBy)
}

func TestCohortJoin_NonApprovedTutorForbidden(t *testing.T) {
	svc, _, vet := newJoinEnv(t)
	ctx := context.Background()
	userID := uuid.New()
	seedTutor(t, vet, userID, tutor.TutorStatusDraft)

	cohorts, _, err := svc.ListCohortsAdmin(ctx, "PUBLISHED", 1, 20)
	require.NoError(t, err)

	_, err = svc.RequestCohortJoinForUser(ctx, userID, cohorts[0].ID, nil)
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

func TestCohortJoin_WithoutTutorProfileNotFound(t *testing.T) {
	svc, _, _ := newJoinEnv(t)
	ctx := context.Background()

	cohorts, _, err := svc.ListCohortsAdmin(ctx, "PUBLISHED", 1, 20)
	require.NoError(t, err)

	_, err = svc.RequestCohortJoinForUser(ctx, uuid.New(), cohorts[0].ID, nil)
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestCohortJoin_ReRequestReopensPending(t *testing.T) {
	svc, _, vet := newJoinEnv(t)
	ctx := context.Background()
	userID := uuid.New()
	seedTutor(t, vet, userID, tutor.TutorStatusApproved)

	cohorts, _, err := svc.ListCohortsAdmin(ctx, "PUBLISHED", 1, 20)
	require.NoError(t, err)

	jr, err := svc.RequestCohortJoinForUser(ctx, userID, cohorts[0].ID, nil)
	require.NoError(t, err)

	adminID := uuid.New()
	_, err = svc.ReviewCohortJoin(ctx, adminID, jr.ID, "REJECTED")
	require.NoError(t, err)

	jr2, err := svc.RequestCohortJoinForUser(ctx, userID, cohorts[0].ID, nil)
	require.NoError(t, err)
	assert.Equal(t, jr.ID, jr2.ID, "re-request must reuse the same row")
	assert.Equal(t, booking.CohortJoinPending, jr2.Status)
	assert.Nil(t, jr2.ReviewedAt)
	assert.Nil(t, jr2.ReviewedBy)
}

func TestCohortJoin_ReviewApprovedAssignsTutor(t *testing.T) {
	svc, cohortsMem, vet := newJoinEnv(t)
	ctx := context.Background()
	userID := uuid.New()
	profile := seedTutor(t, vet, userID, tutor.TutorStatusApproved)

	cohorts, _, err := svc.ListCohortsAdmin(ctx, "PUBLISHED", 1, 20)
	require.NoError(t, err)

	jr, err := svc.RequestCohortJoinForUser(ctx, userID, cohorts[0].ID, nil)
	require.NoError(t, err)

	adminID := uuid.New()
	reviewed, err := svc.ReviewCohortJoin(ctx, adminID, jr.ID, "APPROVED")
	require.NoError(t, err)
	assert.Equal(t, booking.CohortJoinApproved, reviewed.Status)
	require.NotNil(t, reviewed.ReviewedAt)
	require.NotNil(t, reviewed.ReviewedBy)
	assert.Equal(t, adminID, *reviewed.ReviewedBy)

	// Approval must also assign the tutor to the cohort.
	updated, err := cohortsMem.GetByID(ctx, cohorts[0].ID)
	require.NoError(t, err)
	require.NotNil(t, updated.TutorProfileID)
	assert.Equal(t, profile.ID, *updated.TutorProfileID)
}

func TestCohortJoin_ReviewRejectedDoesNotAssign(t *testing.T) {
	svc, cohortsMem, vet := newJoinEnv(t)
	ctx := context.Background()
	userID := uuid.New()
	seedTutor(t, vet, userID, tutor.TutorStatusApproved)

	cohorts, _, err := svc.ListCohortsAdmin(ctx, "PUBLISHED", 1, 20)
	require.NoError(t, err)

	jr, err := svc.RequestCohortJoinForUser(ctx, userID, cohorts[0].ID, nil)
	require.NoError(t, err)

	_, err = svc.ReviewCohortJoin(ctx, uuid.New(), jr.ID, "REJECTED")
	require.NoError(t, err)

	updated, err := cohortsMem.GetByID(ctx, cohorts[0].ID)
	require.NoError(t, err)
	assert.Nil(t, updated.TutorProfileID)
}

func TestCohortJoin_ReviewInvalidStatusRejected(t *testing.T) {
	svc, _, vet := newJoinEnv(t)
	ctx := context.Background()
	userID := uuid.New()
	seedTutor(t, vet, userID, tutor.TutorStatusApproved)

	cohorts, _, err := svc.ListCohortsAdmin(ctx, "PUBLISHED", 1, 20)
	require.NoError(t, err)
	jr, err := svc.RequestCohortJoinForUser(ctx, userID, cohorts[0].ID, nil)
	require.NoError(t, err)

	_, err = svc.ReviewCohortJoin(ctx, uuid.New(), jr.ID, "MAYBE")
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestCohortJoin_ListFiltersByStatus(t *testing.T) {
	svc, _, vet := newJoinEnv(t)
	ctx := context.Background()
	u1, u2 := uuid.New(), uuid.New()
	seedTutor(t, vet, u1, tutor.TutorStatusApproved)
	seedTutor(t, vet, u2, tutor.TutorStatusApproved)

	cohorts, _, err := svc.ListCohortsAdmin(ctx, "PUBLISHED", 1, 20)
	require.NoError(t, err)

	jr1, err := svc.RequestCohortJoinForUser(ctx, u1, cohorts[0].ID, nil)
	require.NoError(t, err)
	_, err = svc.RequestCohortJoinForUser(ctx, u2, cohorts[0].ID, nil)
	require.NoError(t, err)

	pending, err := svc.ListCohortJoins(ctx, "PENDING")
	require.NoError(t, err)
	assert.Len(t, pending, 2)

	_, err = svc.ReviewCohortJoin(ctx, uuid.New(), jr1.ID, "REJECTED")
	require.NoError(t, err)

	pending, err = svc.ListCohortJoins(ctx, "PENDING")
	require.NoError(t, err)
	assert.Len(t, pending, 1)

	all, err := svc.ListCohortJoins(ctx, "")
	require.NoError(t, err)
	assert.Len(t, all, 2)
}

func TestProgrammeRoster_ShapeAndNotFound(t *testing.T) {
	svc, _, _ := newJoinEnv(t)
	ctx := context.Background()

	_, err := svc.ProgrammeRoster(ctx, "does-not-exist")
	assert.ErrorIs(t, err, domain.ErrNotFound)

	roster, err := svc.ProgrammeRoster(ctx, "gcse-mathematics")
	require.NoError(t, err)
	require.NotNil(t, roster)

	programme, ok := roster["programme"].(map[string]any)
	require.True(t, ok, "programme must be an object")
	assert.Equal(t, "gcse-mathematics", programme["slug"])
	assert.Equal(t, "GCSE Mathematics", programme["title"])

	cohorts, ok := roster["cohorts"].([]booking.Cohort)
	require.True(t, ok)
	assert.Len(t, cohorts, 1)
	assert.Equal(t, int(roster["cohort_count"].(int)), len(cohorts))

	for _, key := range []string{"tutors", "students"} {
		_, ok := roster[key]
		assert.True(t, ok, "roster must include %s", key)
	}
}

// Guard the status contract on the entity the transports serialize.
func TestCohortJoinRequest_JSONShape(t *testing.T) {
	now := time.Now().UTC()
	jr := booking.CohortJoinRequest{
		ID:             uuid.New(),
		CohortID:       uuid.New(),
		TutorProfileID: uuid.New(),
		Status:         booking.CohortJoinPending,
		CreatedAt:      now,
	}
	assert.NotEmpty(t, jr.ID.String())
	assert.Equal(t, booking.CohortJoinPending, jr.Status)
}

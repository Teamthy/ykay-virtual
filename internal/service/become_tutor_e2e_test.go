package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/domain/vetting"
	"ykay-virtual/internal/repository/memory"
	"ykay-virtual/internal/storage"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestBecomeTutor_E2E walks the REAL tutor journey end to end, exactly as the
// /become-tutor/* pages and the admin console drive it:
//
//	apply (profile DRAFT) → subjects → competency assessment (pass) →
//	submit → admin review chain (REVIEWING → INTERVIEW → VERIFICATION →
//	APPROVED) → public visibility → tutor requests to join a cohort →
//	admin approves the join → programme roster shows the tutor.
//
// This is the "become a tutor" acceptance test: a regression in ANY step of
// this chain fails CI.
func TestBecomeTutor_E2E(t *testing.T) {
	t.Setenv("YKAY_STORAGE_SECRET", "nuvora-test-secret")
	ctx := context.Background()
	store := memory.NewMemoryStore()
	audit := NewAuditService(store.AuditLogs)
	uows := memory.NewMemoryUnitOfWorkFactory(store)

	tutorUser := uuid.New()
	adminID := uuid.New()

	vetSvc := NewVettingService(
		uows,
		storage.NewLocalStorage(),
		audit,
		SubjectReaderAdapter{}, // accepts any subject id
		&fakeInvalidator{},
	)

	// ── 1. Apply: create the vetting profile (DRAFT) ──────────────────────
	profile, err := vetSvc.CreateProfile(ctx, tutorUser, CreateProfileInput{
		DisplayName:     "Adaeze Okonkwo",
		Bio:             strPtr("6 years teaching IGCSE and WAEC mathematics."),
		YearsExperience: 6,
		HourlyRateMin:   f64Ptr(8000),
		HourlyRateMax:   f64Ptr(12000),
		Currency:        "NGN",
		Timezone:        "Africa/Lagos",
		AcceptsOnline:   true,
		AcceptsInPerson: true,
	})
	require.NoError(t, err)
	assert.Equal(t, tutor.TutorStatusDraft, profile.Status)
	assert.Contains(t, profile.Slug, "adaeze-okonkwo")

	// ── 2. Subjects: pick teaching scope ──────────────────────────────────
	subjectID := uuid.New()
	require.NoError(t, vetSvc.AddSubject(ctx, tutorUser, profile.ID, subjectID))
	subjects, err := vetSvc.ListMySubjects(ctx, tutorUser, profile.ID)
	require.NoError(t, err)
	require.Len(t, subjects, 1)

	// ── 3. Documents: request an upload slot (goes with the journey) ──────
	doc, err := vetSvc.RequestDocumentUpload(ctx, tutorUser, profile.ID,
		vetting.DocGovtID, "national-id.jpg", "image/jpeg", intPtr(2048))
	require.NoError(t, err)
	require.NoError(t, vetSvc.storage.Upload(ctx, storage.BucketPrivate,
		doc.Document.FileKey, []byte("fake-jpeg"), "image/jpeg"))

	// ── 4. Assessment: start + pass the competency test ───────────────────
	seedQuestions(t, store, subjectID, 5)
	attempt, err := vetSvc.StartAssessment(ctx, tutorUser, profile.ID, subjectID)
	require.NoError(t, err)
	require.Len(t, attempt.Questions, 5)

	// The attempt payload deliberately hides the correct index (the client
	// must not receive the answer key). Resolve answers against the seeded
	// question bank, as a tutor answering honestly would.
	answers := make([]AssessmentAnswerInput, 0, len(attempt.Questions))
	for _, q := range attempt.Questions {
		answers = append(answers, AssessmentAnswerInput{
			QuestionID:  q.ID,
			ChosenIndex: 1, // seedQuestions marks option 1 correct
		})
	}
	result, err := vetSvc.SubmitAssessment(ctx, tutorUser, attempt.Attempt.ID, answers)
	require.NoError(t, err)
	assert.True(t, result.Passed, "competency assessment must pass")
	assert.Equal(t, 5, result.Correct)

	// ── 5. Submit for review ──────────────────────────────────────────────
	require.NoError(t, vetSvc.SubmitForReview(ctx, tutorUser, profile.ID))
	p, err := store.Vetting.GetProfileByID(ctx, profile.ID)
	require.NoError(t, err)
	assert.Equal(t, tutor.TutorStatusSubmitted, p.Status)

	// ── 6. Admin review chain (incl. document evidence) ───────────────────
	require.NoError(t, vetSvc.StartReview(ctx, adminID, profile.ID))
	require.NoError(t, vetSvc.MoveToInterview(ctx, adminID, profile.ID))
	// Identity check: the admin must approve the government ID first.
	require.NoError(t, vetSvc.ReviewDocument(ctx, adminID, doc.Document.ID, true, ""))
	require.NoError(t, vetSvc.MoveToVerification(ctx, adminID, profile.ID))
	require.NoError(t, vetSvc.Approve(ctx, adminID, profile.ID))

	approved, err := store.Vetting.GetProfileByID(ctx, profile.ID)
	require.NoError(t, err)
	assert.Equal(t, tutor.TutorStatusApproved, approved.Status, "vetting chain must land on APPROVED")

	// ── 7. Public visibility (marketplace listing) ────────────────────────
	require.NoError(t, vetSvc.SetPublic(ctx, adminID, profile.ID, true))
	publicProfile, err := store.Vetting.GetProfileByID(ctx, profile.ID)
	require.NoError(t, err)
	assert.True(t, publicProfile.IsPublic)

	// ── 8. Cohort join request → admin approval → roster ──────────────────
	prog := academics.Programme{
		ID: uuid.New(), Title: "IGCSE Mathematics", Slug: "igcse-mathematics",
		Status: academics.ProgrammePublished, Format: academics.FormatCohort,
	}
	store.Programmes.Seed(prog)
	cohort := &booking.Cohort{
		ID: uuid.New(), ProgrammeID: prog.ID, Title: "IGCSE Maths — Sept",
		Slug: "igcse-maths-sept", Capacity: 10, Status: booking.CohortPublished, Currency: "NGN",
	}
	store.Cohorts.Seed(cohort)

	adminSvc := NewAdminService(
		memory.NewStatsMemory(), memory.NewAdminBlogMemory(),
		memory.NewInstitutionMemory(), memory.NewReferralMemory(), memory.NewReviewMemory(),
		audit,
	)
	// Mirror what the production search index does when a profile is approved:
	// the tutor becomes discoverable in the tutor store.
	store.Tutors.Seed(tutor.TutorSearchResult{Profile: *profile})
	cohortMem := store.Cohorts.WithProgrammes(store.Programmes).
		WithTutorLookup(func(c context.Context, id uuid.UUID) (*tutor.TutorProfile, error) {
			// Resolve the profile through the vetting store (source of truth).
			return store.Vetting.GetProfileByID(c, id)
		})
	adminSvc.WithCohortAdmin(cohortMem, store.Lessons).
		WithVetting(store.Vetting).WithTutors(store.Tutors)

	note := "I would love to lead this cohort."
	jr, err := adminSvc.RequestCohortJoinForUser(ctx, tutorUser, cohort.ID, &note)
	require.NoError(t, err)
	assert.Equal(t, booking.CohortJoinPending, jr.Status)

	reviewed, err := adminSvc.ReviewCohortJoin(ctx, adminID, jr.ID, booking.CohortJoinApproved)
	require.NoError(t, err)
	assert.Equal(t, booking.CohortJoinApproved, reviewed.Status)

	updatedCohort, err := store.Cohorts.GetByID(ctx, cohort.ID)
	require.NoError(t, err)
	require.NotNil(t, updatedCohort.TutorProfileID)
	assert.Equal(t, profile.ID, *updatedCohort.TutorProfileID)

	// Roster must surface the tutor on the programme.
	roster, err := adminSvc.ProgrammeRoster(ctx, prog.Slug)
	require.NoError(t, err)
	tutors, ok := roster["tutors"].([]map[string]any)
	require.True(t, ok)
	require.Len(t, tutors, 1)
	assert.Equal(t, "Adaeze Okonkwo", tutors[0]["display_name"])
	assert.Equal(t, int(1), roster["cohort_count"])

	// ── 9. Vetting audit trail recorded every step ────────────────────────
	events, err := store.Vetting.ListEvents(ctx, profile.ID, 50)
	require.NoError(t, err)
	assert.NotEmpty(t, events, "the journey must leave a vetting event trail")

	// Negative guard: a SUSPENDED tutor must not be able to request a cohort
	// (APPROVED → SUSPENDED is the real-world stop transition).
	require.NoError(t, vetSvc.Suspend(ctx, adminID, profile.ID, "safeguarding review"))
	suspended, err := store.Vetting.GetProfileByID(ctx, profile.ID)
	require.NoError(t, err)
	assert.Equal(t, tutor.TutorStatusSuspended, suspended.Status)
	_, err = adminSvc.RequestCohortJoinForUser(ctx, tutorUser, cohort.ID, nil)
	assert.ErrorIs(t, err, domain.ErrForbidden, "suspended tutor must not join cohorts")
}

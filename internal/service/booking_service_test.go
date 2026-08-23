package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/academics"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/domain/tutor"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Test harness ---

type testEnv struct {
	store   *memory.MemoryStore
	booking *BookingService
	pay     *PaymentService
	parent  uuid.UUID
	student uuid.UUID
	tutor   uuid.UUID
	cohort  uuid.UUID
	subject uuid.UUID
}

func newTestEnv(t *testing.T) *testEnv {
	t.Helper()
	store := memory.NewMemoryStore()
	audit := NewAuditService(store.AuditLogs)

	parent := uuid.New()
	student := uuid.New()
	tutorID := uuid.New()
	subjectID := uuid.New()

	canTeach := map[string]bool{tutorID.String() + "|" + subjectID.String(): true}

	// Link student → parent through the store's own link memory (the same
	// reader the production wiring uses).
	require.NoError(t, store.StudentLinks.Create(context.Background(), &identity.ParentStudentLink{
		ParentUserID: parent, StudentProfileID: student, Relationship: "PARENT", IsPrimary: true,
	}))

	bookingSvc := NewBookingService(
		memory.NewMemoryUnitOfWorkFactory(store),
		store.StudentLinks,
		memory.NewTutorSubjectMemory(canTeach),
		audit,
	)
	paySvc := NewPaymentService(
		memory.NewMemoryUnitOfWorkFactory(store),
		testProviders(),
		audit,
		store.Escrow,
	)
	paySvc.Clock = func() time.Time { return fixedTime }

	cohort := &booking.Cohort{
		ID: uuid.New(), ProgrammeID: uuid.New(), Title: "IGCSE Computer Science Jan 2027",
		Slug: "igcse-cs-jan-2027", TutorProfileID: &tutorID,
		Capacity: 20, EnrolledCount: 0,
		StartDate: fixedTime, EndDate: fixedTime.AddDate(0, 3, 0),
		Timezone: "Africa/Lagos", LocationMode: "ONLINE",
		Fee: 75000, Currency: "NGN", Status: booking.CohortPublished,
	}
	store.Cohorts.Seed(cohort)

	return &testEnv{
		store: store, booking: bookingSvc, pay: paySvc,
		parent: parent, student: student, tutor: tutorID, cohort: cohort.ID, subject: subjectID,
	}
}

var fixedTime = time.Date(2026, 8, 11, 12, 0, 0, 0, time.UTC)

// --- Booking: cohort ---

func TestCreateCohortBooking_Success(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	res, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: env.student,
		IdempotencyKey: "key-1",
	})
	require.NoError(t, err)
	assert.False(t, res.Replayed)
	assert.NotNil(t, res.EnrollmentID)
	assert.Equal(t, payment.OrderPending, res.Order.Status)
	assert.Equal(t, 75000.0, res.Order.TotalAmount)
	assert.Equal(t, "NGN", res.Order.Currency)
	assert.NotEmpty(t, res.Order.OrderNumber)
	require.Len(t, res.Items, 1)
	assert.Equal(t, "COHORT", res.Items[0].ItemType)

	// Cohort capacity incremented
	c, _ := env.store.Cohorts.GetByID(ctx, env.cohort)
	assert.Equal(t, 1, c.EnrolledCount)

	// Enrollment PENDING, linked to order
	enr, err := env.store.Enrollments.GetByCohortAndStudent(ctx, env.cohort, env.student)
	require.NoError(t, err)
	assert.Equal(t, booking.EnrollmentPending, enr.Status)
	require.NotNil(t, enr.OrderID)
	assert.Equal(t, res.Order.ID, *enr.OrderID)

	// Wallet ensured
	w, err := env.store.Wallets.GetByUserID(ctx, env.parent)
	require.NoError(t, err)
	assert.Equal(t, 0.0, w.Balance)

	// Audit trail written
	logs, err := env.store.AuditLogs.ListByTarget(ctx, "order", res.Order.ID, 10)
	require.NoError(t, err)
	assert.Len(t, logs, 1)
}

func TestCreateCohortBooking_IdempotencyReplay(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	in := CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: env.student,
		IdempotencyKey: "key-replay",
	}
	first, err := env.booking.CreateCohortBooking(ctx, in)
	require.NoError(t, err)

	// Duplicate submission with the same key → replayed, no new rows.
	second, err := env.booking.CreateCohortBooking(ctx, in)
	require.NoError(t, err)
	assert.True(t, second.Replayed)
	assert.Equal(t, first.Order.ID, second.Order.ID)
	assert.Equal(t, first.Order.OrderNumber, second.Order.OrderNumber)

	c, _ := env.store.Cohorts.GetByID(ctx, env.cohort)
	assert.Equal(t, 1, c.EnrolledCount, "capacity must not double-count on replay")
}

func TestCreateCohortBooking_CapacityFull(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	fullID := uuid.New()
	env.store.Cohorts.Seed(&booking.Cohort{
		ID: fullID, ProgrammeID: uuid.New(), Title: "Full cohort", Slug: "full-cohort",
		Capacity: 1, EnrolledCount: 1, StartDate: fixedTime, EndDate: fixedTime.Add(time.Hour),
		Timezone: "UTC", LocationMode: "ONLINE", Fee: 100, Currency: "NGN",
		Status: booking.CohortPublished,
	})
	_, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: fullID, ParentUserID: env.parent, StudentID: env.student,
	})
	assert.ErrorIs(t, err, domain.ErrCapacityFull)
}

func TestCreateCohortBooking_NotPublished(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	draftID := uuid.New()
	env.store.Cohorts.Seed(&booking.Cohort{
		ID: draftID, ProgrammeID: uuid.New(), Title: "Draft", Slug: "draft-cohort",
		Capacity: 10, StartDate: fixedTime, EndDate: fixedTime.Add(time.Hour),
		Timezone: "UTC", LocationMode: "ONLINE", Fee: 100, Currency: "NGN",
		Status: booking.CohortDraft,
	})
	_, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: draftID, ParentUserID: env.parent, StudentID: env.student,
	})
	assert.ErrorIs(t, err, domain.ErrCapacityFull)
}

func TestCreateCohortBooking_ForbiddenWhenStudentNotLinked(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	_, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: uuid.New(), // not linked
	})
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

func TestCreateCohortBooking_DuplicateEnrollmentConflict(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	_, err := env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: env.student,
	})
	require.NoError(t, err)

	_, err = env.booking.CreateCohortBooking(ctx, CreateCohortBookingInput{
		CohortID: env.cohort, ParentUserID: env.parent, StudentID: env.student,
		IdempotencyKey: "different-key",
	})
	assert.ErrorIs(t, err, domain.ErrConflict)
}

// --- Booking: private package ---

func TestCreatePrivateBooking_Success(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()

	res, err := env.booking.CreatePrivateBooking(ctx, CreatePrivateBookingInput{
		ParentUserID: env.parent, StudentID: env.student,
		TutorProfileID: env.tutor, SubjectID: env.subject,
		TotalSessions: 10, SessionDuration: 60, PricePerSession: 8000,
		Currency: "NGN",
	})
	require.NoError(t, err)
	require.NotNil(t, res.PackageID)
	assert.Equal(t, 80000.0, res.Order.TotalAmount)

	pkg, err := env.store.PrivatePkgs.GetByID(ctx, *res.PackageID)
	require.NoError(t, err)
	assert.Equal(t, 10, pkg.TotalSessions)
	// YK-004: a package must start PENDING_PAYMENT, NOT active, before payment.
	assert.Equal(t, booking.PrivatePackagePendingPayment, pkg.Status)
	assert.Equal(t, 10, pkg.RemainingSessions())

	req, err := env.store.PrivateReqs.GetByID(ctx, pkg.RequestID)
	require.NoError(t, err)
	// Self-serve booking: the learner picked the tutor, so the request is
	// born MATCHED (it must never sit in the admin "awaiting match" queue).
	assert.Equal(t, booking.PrivateMatched, req.Status)
}

func TestCreatePrivateBooking_Validation(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	base := CreatePrivateBookingInput{
		ParentUserID: env.parent, StudentID: env.student,
		TutorProfileID: env.tutor, SubjectID: env.subject,
		TotalSessions: 10, SessionDuration: 60, PricePerSession: 8000,
	}

	bad := base
	bad.TotalSessions = 0
	_, err := env.booking.CreatePrivateBooking(ctx, bad)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	bad = base
	bad.SessionDuration = 5
	_, err = env.booking.CreatePrivateBooking(ctx, bad)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	bad = base
	bad.PricePerSession = 0
	_, err = env.booking.CreatePrivateBooking(ctx, bad)
	require.NoError(t, err, "client price is ignored; published tutor rate is used")
}

func TestCreatePrivateBooking_IgnoresClientPrice(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	res, err := env.booking.CreatePrivateBooking(ctx, CreatePrivateBookingInput{
		ParentUserID: env.parent, StudentID: env.student,
		TutorProfileID: env.tutor, SubjectID: env.subject,
		TotalSessions: 10, SessionDuration: 60, PricePerSession: 1, Currency: "NGN",
	})
	require.NoError(t, err)
	assert.Equal(t, 80000.0, res.Order.TotalAmount, "must use published 8000/session, not client 1")
}

func TestCreatePrivateBooking_ForbiddenWhenTutorCannotTeach(t *testing.T) {
	env := newTestEnv(t)
	ctx := context.Background()
	// Subject not in the canTeach map → tutor forbidden
	_, err := env.booking.CreatePrivateBooking(ctx, CreatePrivateBookingInput{
		ParentUserID: env.parent, StudentID: env.student,
		TutorProfileID: env.tutor, SubjectID: uuid.New(),
		TotalSessions: 4, SessionDuration: 60, PricePerSession: 5000,
	})
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

// --- Catalogue services (Phase 2 foundation) ---

func TestSubjectService_List_Cache(t *testing.T) {
	ctx := context.Background()
	c := newMemCache()
	repo := memory.NewSubjectMemory([]academics.Subject{
		{ID: uuid.New(), Name: "Mathematics", Slug: "mathematics", Category: "Academic", IsActive: true},
		{ID: uuid.New(), Name: "English", Slug: "english", Category: "Academic", IsActive: true},
		{ID: uuid.New(), Name: "Yoruba", Slug: "yoruba", Category: "Languages", IsActive: false},
	})
	svc := NewSubjectService(repo, c)

	subjects, total, err := svc.List(ctx, academics.SubjectListParams{Page: 1, PageSize: 20})
	require.NoError(t, err)
	assert.Equal(t, int64(2), total)
	assert.Len(t, subjects, 2)

	// Second call served from cache (repo is memory but cache hit path).
	subjects2, _, err := svc.List(ctx, academics.SubjectListParams{Page: 1, PageSize: 20})
	require.NoError(t, err)
	assert.Equal(t, subjects, subjects2)
}

func TestTutorService_Search_CachesResult(t *testing.T) {
	ctx := context.Background()
	c := newMemCache()
	seed := []tutor.TutorSearchResult{
		{Profile: tutor.TutorProfile{
			ID: uuid.New(), Slug: "chinasa", DisplayName: "Chinasa",
			Status: tutor.TutorStatusApproved, IsPublic: true,
			RatingAvg: 4.87, RatingCount: 28, RankingScore: 98.5,
			AcceptsOnline: true, AcceptsInPerson: true,
		}, Subjects: []string{"Mathematics"}, SubjectSlugs: []string{"mathematics"}},
	}
	repo := memory.NewTutorMemory(seed)
	svc := NewTutorService(repo, c)

	params := tutor.TutorSearchParams{SubjectSlug: "mathematics", Page: 1, PageSize: 20}
	res, total, err := svc.Search(ctx, params)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, res, 1)

	// Cache hit: result served without touching the repo again.
	res2, total2, err := svc.Search(ctx, params)
	require.NoError(t, err)
	assert.Equal(t, total, total2)
	assert.Equal(t, res[0].Profile.ID, res2[0].Profile.ID)
	assert.Len(t, res2, 1)
}

func TestTutorService_Search_MockModeWhenRepoNil(t *testing.T) {
	ctx := context.Background()
	svc := NewTutorService(nil, newMemCache())

	res, total, err := svc.Search(ctx, tutor.TutorSearchParams{SubjectSlug: "mathematics", Page: 1, PageSize: 20})
	require.NoError(t, err)
	assert.Equal(t, int64(2), total)
	assert.Len(t, res, 2)
	assert.Equal(t, "chinasa", res[0].Profile.Slug)

	// GetBySlug falls back to mock too
	tut, err := svc.GetBySlug(ctx, "oluwatobi")
	require.NoError(t, err)
	assert.Equal(t, "Oluwatobi", tut.DisplayName)

	_, err = svc.GetBySlug(ctx, "nobody")
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestProgrammeService_List_PublishedOnly(t *testing.T) {
	ctx := context.Background()
	repo := memory.NewProgrammeMemory([]academics.Programme{
		{ID: uuid.New(), Title: "UTME Prep 2027", Slug: "utme-2027", Format: academics.FormatCohort, Status: academics.ProgrammePublished, IsFeatured: true},
		{ID: uuid.New(), Title: "Draft programme", Slug: "draft", Format: academics.FormatCohort, Status: academics.ProgrammeDraft},
	})
	svc := NewProgrammeService(repo, newMemCache())

	list, total, err := svc.List(ctx, academics.ProgrammeListParams{Page: 1, PageSize: 20})
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, list, 1)
	assert.Equal(t, "UTME Prep 2027", list[0].Title)
}

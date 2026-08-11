package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPortal_Availability_CRUD(t *testing.T) {
	store := memory.NewMemoryStore()
	svc := NewPortalService(store.Availability, store.Assignments, store.Submissions,
		store.Attendance, store.Enrollments, store.Lessons, store.Orders, store.Payments)
	ctx := context.Background()
	tutorID := uuid.New()

	a, err := svc.UpsertAvailability(ctx, AvailabilityInput{
		TutorProfileID: tutorID, DayOfWeek: 1, StartTime: "16:00", EndTime: "17:00", IsRecurring: true,
	})
	require.NoError(t, err)
	assert.Equal(t, "16:00", a.StartTime)

	// Idempotent upsert (same slot) — no duplicate.
	a2, err := svc.UpsertAvailability(ctx, AvailabilityInput{
		TutorProfileID: tutorID, DayOfWeek: 1, StartTime: "16:00", EndTime: "17:00", IsRecurring: true,
	})
	require.NoError(t, err)
	assert.Equal(t, a.ID, a2.ID)

	list, err := svc.ListAvailability(ctx, tutorID)
	require.NoError(t, err)
	assert.Len(t, list, 1)

	// Validation
	_, err = svc.UpsertAvailability(ctx, AvailabilityInput{TutorProfileID: tutorID, DayOfWeek: 9, StartTime: "16:00", EndTime: "17:00"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	require.NoError(t, svc.DeleteAvailability(ctx, tutorID, a.ID))
	list, _ = svc.ListAvailability(ctx, tutorID)
	assert.Empty(t, list)
}

func TestPortal_AvailabilityExceptions(t *testing.T) {
	store := memory.NewMemoryStore()
	svc := NewPortalService(store.Availability, store.Assignments, store.Submissions,
		store.Attendance, store.Enrollments, store.Lessons, store.Orders, store.Payments)
	ctx := context.Background()
	tutorID := uuid.New()

	e, err := svc.UpsertAvailabilityException(ctx, ExceptionInput{
		TutorProfileID: tutorID, ExceptionDate: "2026-08-20", IsAvailable: false, Reason: strPtr("Travelling"),
	})
	require.NoError(t, err)
	assert.Equal(t, time.Date(2026, 8, 20, 0, 0, 0, 0, time.UTC), e.ExceptionDate)

	_, err = svc.UpsertAvailabilityException(ctx, ExceptionInput{TutorProfileID: tutorID, ExceptionDate: "not-a-date"})
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	exceptions, err := svc.ListAvailabilityExceptions(ctx, tutorID)
	require.NoError(t, err)
	assert.Len(t, exceptions, 1)

	require.NoError(t, svc.DeleteAvailabilityException(ctx, tutorID, e.ID))
}

func TestPortal_SubmitAssignment_RequiresContent(t *testing.T) {
	store := memory.NewMemoryStore()
	svc := NewPortalService(store.Availability, store.Assignments, store.Submissions,
		store.Attendance, store.Enrollments, store.Lessons, store.Orders, store.Payments)
	ctx := context.Background()

	_, err := svc.SubmitAssignment(ctx, uuid.New(), uuid.New(), nil, nil)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)

	sub, err := svc.SubmitAssignment(ctx, uuid.New(), uuid.New(), strPtr("My answer"), nil)
	require.NoError(t, err)
	assert.NotEmpty(t, sub.ID)
}

func TestPortal_AttendanceSummary(t *testing.T) {
	store := memory.NewMemoryStore()
	lessons := memory.NewLessonMemory()
	student := uuid.New()
	tutorID := uuid.New()
	l1 := &booking.Lesson{ID: uuid.New(), TutorProfileID: tutorID, Title: "S1", StartAt: time.Now(), EndAt: time.Now().Add(time.Hour), Status: booking.LessonScheduled}
	l2 := &booking.Lesson{ID: uuid.New(), TutorProfileID: tutorID, Title: "S2", StartAt: time.Now(), EndAt: time.Now().Add(time.Hour), Status: booking.LessonScheduled}
	lessons.Seed(l1, student)
	lessons.Seed(l2, student)

	att := memory.NewAttendanceMemory()
	require.NoError(t, att.Upsert(context.Background(), l1.ID, student, "PRESENT", uuid.New(), nil))
	require.NoError(t, att.Upsert(context.Background(), l2.ID, student, "LATE", uuid.New(), nil))

	svc := NewPortalService(store.Availability, store.Assignments, store.Submissions,
		att, store.Enrollments, lessons, store.Orders, store.Payments)
	summary, err := svc.AttendanceSummary(context.Background(), student)
	require.NoError(t, err)
	assert.Equal(t, 2, summary.Total)
	assert.Equal(t, 1, summary.Present)
	assert.Equal(t, 1, summary.Late)
	assert.Equal(t, 100.0, summary.Rate)
}

func TestPortal_Receipt_Authz(t *testing.T) {
	store := memory.NewMemoryStore()
	parent := uuid.New()
	order := &payment.Order{ParentUserID: parent, Status: payment.OrderPaid, TotalAmount: 50000, Currency: "NGN"}
	require.NoError(t, store.Orders.Create(context.Background(), order))
	require.NoError(t, store.Orders.CreateItem(context.Background(), &payment.OrderItem{
		OrderID: order.ID, ItemType: "COHORT", ReferenceID: uuid.New(), Quantity: 1, UnitPrice: 50000, TotalPrice: 50000,
	}))

	svc := NewPortalService(store.Availability, store.Assignments, store.Submissions,
		store.Attendance, store.Enrollments, store.Lessons, store.Orders, store.Payments)
	ctx := context.Background()

	// Owner can read the receipt.
	receipt, err := svc.GetOrderReceipt(ctx, parent, order.ID)
	require.NoError(t, err)
	assert.Equal(t, 1, len(receipt.Items))
	assert.Equal(t, payment.OrderPaid, receipt.Order.Status)

	// Other user forbidden.
	_, err = svc.GetOrderReceipt(ctx, uuid.New(), order.ID)
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

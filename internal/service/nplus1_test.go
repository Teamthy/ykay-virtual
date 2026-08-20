package service

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/certificate"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// countingOrderRepo wraps OrderMemory and counts ListItems vs batch calls so
// we can prove ParentOrdersView is O(1) queries, not O(orders).
type countingOrderRepo struct {
	inner          *memory.OrderMemory
	listItems      atomic.Int32
	listItemsByIDs atomic.Int32
	listByParent   atomic.Int32
}

func (c *countingOrderRepo) Create(ctx context.Context, o *payment.Order) error {
	return c.inner.Create(ctx, o)
}
func (c *countingOrderRepo) CreateItem(ctx context.Context, item *payment.OrderItem) error {
	return c.inner.CreateItem(ctx, item)
}
func (c *countingOrderRepo) GetByID(ctx context.Context, id uuid.UUID) (*payment.Order, error) {
	return c.inner.GetByID(ctx, id)
}
func (c *countingOrderRepo) GetByIDempotencyKey(ctx context.Context, key string) (*payment.Order, error) {
	return c.inner.GetByIDempotencyKey(ctx, key)
}
func (c *countingOrderRepo) GetByNumber(ctx context.Context, number string) (*payment.Order, error) {
	return c.inner.GetByNumber(ctx, number)
}
func (c *countingOrderRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status payment.OrderStatus) error {
	return c.inner.UpdateStatus(ctx, id, status)
}
func (c *countingOrderRepo) Update(ctx context.Context, o *payment.Order) error {
	return c.inner.Update(ctx, o)
}
func (c *countingOrderRepo) ListItems(ctx context.Context, orderID uuid.UUID) ([]payment.OrderItem, error) {
	c.listItems.Add(1)
	return c.inner.ListItems(ctx, orderID)
}
func (c *countingOrderRepo) ListItemsByOrderIDs(ctx context.Context, orderIDs []uuid.UUID) (map[uuid.UUID][]payment.OrderItem, error) {
	c.listItemsByIDs.Add(1)
	return c.inner.ListItemsByOrderIDs(ctx, orderIDs)
}
func (c *countingOrderRepo) ListByParentUserID(ctx context.Context, parentUserID uuid.UUID, limit, offset int) ([]payment.Order, int64, error) {
	c.listByParent.Add(1)
	return c.inner.ListByParentUserID(ctx, parentUserID, limit, offset)
}
func (c *countingOrderRepo) ListAll(ctx context.Context, limit, offset int) ([]payment.Order, int64, error) {
	return c.inner.ListAll(ctx, limit, offset)
}

type countingAttendance struct {
	inner     *memory.AttendanceMemory
	byLesson  atomic.Int32
	byStudent atomic.Int32
}

func (c *countingAttendance) Upsert(ctx context.Context, lessonID, studentProfileID uuid.UUID, status string, markedBy uuid.UUID, note *string) error {
	return c.inner.Upsert(ctx, lessonID, studentProfileID, status, markedBy, note)
}
func (c *countingAttendance) ListByLesson(ctx context.Context, lessonID uuid.UUID) ([]booking.Attendance, error) {
	c.byLesson.Add(1)
	return c.inner.ListByLesson(ctx, lessonID)
}
func (c *countingAttendance) ListByStudent(ctx context.Context, studentProfileID uuid.UUID) ([]booking.Attendance, error) {
	c.byStudent.Add(1)
	return c.inner.ListByStudent(ctx, studentProfileID)
}

// TestParentOrdersView_NoNPlus1 — 20 orders must load items in one batch
// query, never one ListItems per order (that would stall production).
func TestParentOrdersView_NoNPlus1(t *testing.T) {
	orders := memory.NewOrderMemory()
	counter := &countingOrderRepo{inner: orders}
	svc := NewDashboardService(counter, nil, nil, nil)
	ctx := context.Background()
	parent := uuid.New()
	cohortID := uuid.New()

	for i := 0; i < 20; i++ {
		o := &payment.Order{ParentUserID: parent, Status: payment.OrderPending, TotalAmount: 1000, Currency: "NGN"}
		require.NoError(t, orders.Create(ctx, o))
		require.NoError(t, orders.CreateItem(ctx, &payment.OrderItem{
			OrderID: o.ID, ItemType: "COHORT", ReferenceID: cohortID, Quantity: 1, UnitPrice: 1000, TotalPrice: 1000,
		}))
	}

	views, total, err := svc.ParentOrdersView(ctx, parent, 1, 50)
	require.NoError(t, err)
	require.Equal(t, int64(20), total)
	require.Len(t, views, 20)
	require.NotNil(t, views[0].CheckoutCohortID)
	require.Equal(t, cohortID.String(), *views[0].CheckoutCohortID)

	require.Equal(t, int32(1), counter.listByParent.Load(), "list orders once")
	require.Equal(t, int32(1), counter.listItemsByIDs.Load(), "batch-load items once")
	require.Equal(t, int32(0), counter.listItems.Load(), "must not ListItems per order")
}

// TestAttendanceSummary_NoNPlus1 — 40 lessons must not issue 40 ListByLesson
// queries.
func TestAttendanceSummary_NoNPlus1(t *testing.T) {
	lessons := memory.NewLessonMemory()
	att := memory.NewAttendanceMemory()
	counter := &countingAttendance{inner: att}
	student := uuid.New()
	tutorID := uuid.New()
	ctx := context.Background()

	for i := 0; i < 40; i++ {
		l := &booking.Lesson{
			ID: uuid.New(), TutorProfileID: tutorID, Title: "L",
			StartAt: time.Now(), EndAt: time.Now().Add(time.Hour), Status: booking.LessonScheduled,
		}
		lessons.Seed(l, student)
		status := "PRESENT"
		if i%4 == 1 {
			status = "LATE"
		}
		require.NoError(t, att.Upsert(ctx, l.ID, student, status, tutorID, nil))
	}

	store := memory.NewMemoryStore()
	svc := NewPortalService(store.Availability, store.Assignments, store.Submissions,
		counter, store.Enrollments, lessons, store.Orders, store.Payments)
	summary, err := svc.AttendanceSummary(ctx, student)
	require.NoError(t, err)
	require.Equal(t, 40, summary.Total)
	require.Equal(t, 30, summary.Present)
	require.Equal(t, 10, summary.Late)
	require.Equal(t, int32(1), counter.byStudent.Load(), "one ListByStudent")
	require.Equal(t, int32(0), counter.byLesson.Load(), "must not ListByLesson per lesson")
}

// TestListForUser_NoNPlus1 — certificates for several linked learners load
// via ListByStudents (one query), not one ListByStudent per child.
func TestListForUser_NoNPlus1(t *testing.T) {
	store := memory.NewMemoryStore()
	parent := uuid.New()
	s1, s2, s3 := uuid.New(), uuid.New(), uuid.New()
	ctx := context.Background()
	now := time.Now().UTC()
	for i, sid := range []uuid.UUID{s1, s2, s3} {
		require.NoError(t, store.Certificates.Create(ctx, &certificate.Certificate{
			StudentProfileID: sid, LearnerName: "L", Title: "Completion",
			CredentialNumber: "NUV-N1-" + sid.String()[:8], IssuedBy: Issuer, IssuedAt: now.Add(time.Duration(i) * time.Minute),
		}))
	}

	svc := NewCertificateService(memory.NewMemoryUnitOfWorkFactory(store))
	svc.WithOwnership(
		func(_ context.Context, _ uuid.UUID) (*identity.StudentProfile, error) {
			return &identity.StudentProfile{ID: s1}, nil
		},
		func(_ context.Context, _ uuid.UUID) ([]identity.StudentProfile, error) {
			return []identity.StudentProfile{{ID: s2}, {ID: s3}}, nil
		},
	)
	list, err := svc.ListForUser(ctx, parent, 10)
	require.NoError(t, err)
	require.Len(t, list, 3, "own + two linked learners, loaded via ListByStudents")
}

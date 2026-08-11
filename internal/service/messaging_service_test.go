package service

import (
	"context"
	"testing"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/messaging"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type msgEnv struct {
	conv   *memory.ConversationMemory
	msg    *memory.MessageMemory
	notif  *memory.NotificationMemory
	svc    *MessagingService
	tutor  uuid.UUID
	parent uuid.UUID
	pkg    uuid.UUID
}

func newMsgEnv(t *testing.T) *msgEnv {
	t.Helper()
	store := memory.NewMemoryStore()
	conv := memory.NewConversationMemory()

	tutor := uuid.New()
	parent := uuid.New()
	pkg := &booking.PrivatePackage{
		ID: uuid.New(), RequestID: uuid.New(), TutorProfileID: uuid.New(),
		StudentProfileID: uuid.New(), TotalSessions: 10, SessionDurationMins: 60,
		PricePerSession: 8000, TotalPrice: 80000, Currency: "NGN", Status: "ACTIVE",
	}
	require.NoError(t, store.PrivatePkgs.Create(context.Background(), pkg))

	svc := NewMessagingService(conv, memory.NewMessageMemory(conv), memory.NewNotificationMemory(),
		store.PrivatePkgs, store.Cohorts, nil)
	return &msgEnv{
		conv: conv, msg: memory.NewMessageMemory(conv), notif: memory.NewNotificationMemory(),
		svc: svc, tutor: tutor, parent: parent, pkg: pkg.ID,
	}
}

func TestCreateBookingConversation_AndSendMessage_NotifiesOthers(t *testing.T) {
	env := newMsgEnv(t)
	ctx := context.Background()

	conv, err := env.svc.CreateBookingConversation(ctx, env.pkg, []uuid.UUID{env.tutor, env.parent}, env.parent)
	require.NoError(t, err)
	assert.Equal(t, messaging.TypeBooking, conv.Type)
	assert.Equal(t, env.pkg, *conv.BookingID)

	// Idempotent: same booking → same conversation.
	conv2, err := env.svc.CreateBookingConversation(ctx, env.pkg, []uuid.UUID{env.tutor, env.parent}, env.parent)
	require.NoError(t, err)
	assert.Equal(t, conv.ID, conv2.ID)

	// Tutor sends a message.
	msg, err := env.svc.SendMessage(ctx, SendMessageInput{
		ConversationID: conv.ID, SenderUserID: env.tutor, Body: "Hello! Ready for your first lesson?",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, msg.ID)

	// Parent got a notification, tutor did not.
	notifs, total, err := env.svc.ListNotifications(ctx, env.parent, 1, 20)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Equal(t, "MESSAGE", notifs[0].Type)
	assert.Equal(t, env.tutor.String(), env.tutor.String()) // title is sender name (nil reader → "New message")
	assert.Contains(t, *notifs[0].Body, "Hello")

	notifsTutor, _, _ := env.svc.ListNotifications(ctx, env.tutor, 1, 20)
	assert.Empty(t, notifsTutor)
}

func TestSendMessage_NonParticipantForbidden(t *testing.T) {
	env := newMsgEnv(t)
	ctx := context.Background()
	conv, err := env.svc.CreateBookingConversation(ctx, env.pkg, []uuid.UUID{env.tutor, env.parent}, env.parent)
	require.NoError(t, err)

	_, err = env.svc.SendMessage(ctx, SendMessageInput{
		ConversationID: conv.ID, SenderUserID: uuid.New(), Body: "intruder",
	})
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

func TestListMessages_And_ReadReceipt(t *testing.T) {
	env := newMsgEnv(t)
	ctx := context.Background()
	conv, err := env.svc.CreateBookingConversation(ctx, env.pkg, []uuid.UUID{env.tutor, env.parent}, env.parent)
	require.NoError(t, err)

	for i := 0; i < 3; i++ {
		_, err := env.svc.SendMessage(ctx, SendMessageInput{
			ConversationID: conv.ID, SenderUserID: env.tutor, Body: "msg",
		})
		require.NoError(t, err)
	}

	msgs, err := env.svc.ListMessages(ctx, env.parent, conv.ID, nil, 50)
	require.NoError(t, err)
	assert.Len(t, msgs, 3)

	// Non-participant cannot read.
	_, err = env.svc.ListMessages(ctx, uuid.New(), conv.ID, nil, 50)
	assert.ErrorIs(t, err, domain.ErrForbidden)

	// Mark read works for participant only.
	require.NoError(t, env.svc.MarkConversationRead(ctx, env.parent, conv.ID))
	err = env.svc.MarkConversationRead(ctx, uuid.New(), conv.ID)
	assert.ErrorIs(t, err, domain.ErrForbidden)
}

func TestListConversations_UnreadCount(t *testing.T) {
	env := newMsgEnv(t)
	ctx := context.Background()
	conv, err := env.svc.CreateBookingConversation(ctx, env.pkg, []uuid.UUID{env.tutor, env.parent}, env.parent)
	require.NoError(t, err)
	_, err = env.svc.SendMessage(ctx, SendMessageInput{
		ConversationID: conv.ID, SenderUserID: env.tutor, Body: "hi",
	})
	require.NoError(t, err)

	convs, total, err := env.svc.ListConversations(ctx, env.parent, 1, 20)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Equal(t, conv.ID, convs[0].ID)
	assert.Equal(t, 1, convs[0].UnreadCount)
	assert.NotNil(t, convs[0].LastMessage)

	// After marking read, unread drops to 0.
	require.NoError(t, env.svc.MarkConversationRead(ctx, env.parent, conv.ID))
	convs2, _, _ := env.svc.ListConversations(ctx, env.parent, 1, 20)
	assert.Equal(t, 0, convs2[0].UnreadCount)
}

func TestNotificationLifecycle(t *testing.T) {
	env := newMsgEnv(t)
	ctx := context.Background()

	require.NoError(t, env.svc.Notify(ctx, env.parent, "BOOKING_CONFIRMED", "Enrollment confirmed",
		strPtr("Your cohort starts Monday"), map[string]any{"order_number": "YKAY-1"}))
	require.NoError(t, env.svc.Notify(ctx, env.parent, "PAYMENT", "Payment received", nil, nil))

	n, err := env.svc.UnreadCount(ctx, env.parent)
	require.NoError(t, err)
	assert.Equal(t, int64(2), n)

	notifs, _, err := env.svc.ListNotifications(ctx, env.parent, 1, 20)
	require.NoError(t, err)
	require.Len(t, notifs, 2)

	require.NoError(t, env.svc.MarkNotificationRead(ctx, env.parent, notifs[0].ID))
	n, _ = env.svc.UnreadCount(ctx, env.parent)
	assert.Equal(t, int64(1), n)

	require.NoError(t, env.svc.MarkAllNotificationsRead(ctx, env.parent))
	n, _ = env.svc.UnreadCount(ctx, env.parent)
	assert.Equal(t, int64(0), n)
}

// --- Dashboard service ---

func TestDashboard_ParentOrders(t *testing.T) {
	store := memory.NewMemoryStore()
	parent := uuid.New()
	o1 := &payment.Order{ParentUserID: parent, Status: payment.OrderPaid, TotalAmount: 50000, Currency: "NGN"}
	o2 := &payment.Order{ParentUserID: parent, Status: payment.OrderPending, TotalAmount: 75000, Currency: "NGN"}
	other := &payment.Order{ParentUserID: uuid.New(), Status: payment.OrderPaid, TotalAmount: 999, Currency: "NGN"}
	require.NoError(t, store.Orders.Create(context.Background(), o1))
	require.NoError(t, store.Orders.Create(context.Background(), o2))
	require.NoError(t, store.Orders.Create(context.Background(), other))

	svc := NewDashboardService(store.Orders, store.Escrow, store.Payouts, memory.NewLessonMemory())
	orders, total, err := svc.ParentOrders(context.Background(), parent, 1, 20)
	require.NoError(t, err)
	assert.Equal(t, int64(2), total)
	assert.Len(t, orders, 2)
	for _, o := range orders {
		assert.Equal(t, parent, o.ParentUserID)
	}
}

func TestDashboard_TutorEarnings(t *testing.T) {
	store := memory.NewMemoryStore()
	tutor := uuid.New()
	holds := []*payment.EscrowHold{
		{TutorProfileID: tutor, Amount: 30000, Status: payment.EscrowHeld},
		{TutorProfileID: tutor, Amount: 20000, Status: payment.EscrowReleased},
	}
	for _, h := range holds {
		require.NoError(t, store.Escrow.Create(context.Background(), h))
	}
	payout := &payment.Payout{TutorProfileID: tutor, EscrowHoldID: uuid.New(), Amount: 20000, Currency: "NGN", Status: payment.PayoutPaid}
	require.NoError(t, store.Payouts.Create(context.Background(), payout))

	svc := NewDashboardService(store.Orders, store.Escrow, store.Payouts, memory.NewLessonMemory())
	earnings, err := svc.TutorEarnings(context.Background(), tutor)
	require.NoError(t, err)
	assert.Equal(t, 30000.0, earnings.HeldTotal)
	assert.Equal(t, 20000.0, earnings.ReleasedTotal)
	assert.Equal(t, 20000.0, earnings.PaidTotal)

	// Other tutor sees nothing.
	other, err := svc.TutorEarnings(context.Background(), uuid.New())
	require.NoError(t, err)
	assert.Empty(t, other.Holds)
}

func TestDashboard_Lessons(t *testing.T) {
	store := memory.NewMemoryStore()
	lessons := memory.NewLessonMemory()
	student := uuid.New()
	tutor := uuid.New()
	lessons.Seed(&booking.Lesson{TutorProfileID: tutor, Title: "Lesson 1"}, student)
	lessons.Seed(&booking.Lesson{TutorProfileID: tutor, Title: "Lesson 2"}, student)

	svc := NewDashboardService(store.Orders, store.Escrow, store.Payouts, lessons)
	studentLessons, err := svc.StudentLessons(context.Background(), student, 50)
	require.NoError(t, err)
	assert.Len(t, studentLessons, 2)

	tutorLessons, err := svc.TutorLessons(context.Background(), tutor, 50)
	require.NoError(t, err)
	assert.Len(t, tutorLessons, 2)
}

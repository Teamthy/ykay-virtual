package notifications

import (
	"context"
	"testing"
)

func TestSendNotificationAndList(t *testing.T) {
	s := NewService()
	ctx := context.Background()

	notif, err := s.Send(ctx, SendRequest{
		UserID:    "user-1",
		Recipient: "parent@ykay.ng",
		Kind:      "LESSON_RESCHEDULED",
		Channel:   ChannelEmail,
		Message:   "Your lesson for IGCSE Computer Science has been rescheduled.",
	})
	if err != nil {
		t.Fatalf("expected notification send to succeed: %v", err)
	}
	if notif.ID != "notif-1" || notif.Status != "DELIVERED" {
		t.Fatalf("unexpected notification state: %+v", notif)
	}

	list := s.ListByUser(ctx, "user-1")
	if len(list) != 1 {
		t.Fatalf("expected 1 notification for user-1, got %d", len(list))
	}
}

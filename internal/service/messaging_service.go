package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/messaging"

	"github.com/google/uuid"
)

// MessagingService — booking-scoped conversations + notifications.
//
// Invariants (per AGENTS.md / PRD):
//   - Conversations are created ONLY from a booking (private package) or a
//     cohort — no ad-hoc direct messaging between strangers.
//   - Only participants can read/send in a conversation (service-layer authz).
//   - Sending a message notifies all other participants (notification rows;
//     Redis pub/sub fan-out lands with the realtime layer — Phase 5b).

type MessagingService struct {
	conversations messaging.ConversationRepository
	messages      messaging.MessageRepository
	notifications messaging.NotificationRepository
	packages      booking.PrivatePackageRepository
	cohorts       booking.CohortRepository
	studentNames  displayNameReader
}

// displayNameReader resolves user display names for notification bodies.
type displayNameReader interface {
	DisplayName(ctx context.Context, userID uuid.UUID) (string, error)
}

func NewMessagingService(
	conversations messaging.ConversationRepository,
	messages messaging.MessageRepository,
	notifications messaging.NotificationRepository,
	packages booking.PrivatePackageRepository,
	cohorts booking.CohortRepository,
	names displayNameReader,
) *MessagingService {
	return &MessagingService{
		conversations: conversations,
		messages:      messages,
		notifications: notifications,
		packages:      packages,
		cohorts:       cohorts,
		studentNames:  names,
	}
}

// EnsureBookingConversation — returns (or creates) the conversation for a
// private package. Participants: the tutor, the parent who booked, and the
// student's parent-user (same as parent in our model).
// CreateBookingConversation — creates the booking-scoped conversation with
// explicit participants (tutor user, parent user, plus any extra users).
func (s *MessagingService) CreateBookingConversation(ctx context.Context, packageID uuid.UUID,
	participantUserIDs []uuid.UUID, createdBy uuid.UUID) (*messaging.Conversation, error) {

	if existing, err := s.conversations.GetByBooking(ctx, messaging.TypeBooking, packageID); err == nil {
		return existing, nil
	} else if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}
	if len(participantUserIDs) == 0 {
		return nil, fmt.Errorf("%w: at least one participant required", domain.ErrInvalidInput)
	}
	if _, err := s.packages.GetByID(ctx, packageID); err != nil {
		return nil, err
	}

	conv := &messaging.Conversation{
		Type:      messaging.TypeBooking,
		BookingID: &packageID,
		CreatedBy: &createdBy,
	}
	if err := s.conversations.Create(ctx, conv); err != nil {
		return nil, err
	}
	for _, uid := range participantUserIDs {
		if err := s.conversations.AddParticipant(ctx, &messaging.Participant{
			ConversationID: conv.ID,
			UserID:         uid,
			LastReadAt:     nil,
		}); err != nil {
			return nil, err
		}
	}
	return conv, nil
}

// CreateCohortConversation — cohort-wide Q&A thread (students + tutor).
func (s *MessagingService) CreateCohortConversation(ctx context.Context, cohortID uuid.UUID,
	participantUserIDs []uuid.UUID, createdBy uuid.UUID) (*messaging.Conversation, error) {

	if existing, err := s.conversations.GetByBooking(ctx, messaging.TypeCohort, cohortID); err == nil {
		return existing, nil
	} else if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}
	if _, err := s.cohorts.GetByID(ctx, cohortID); err != nil {
		return nil, err
	}
	conv := &messaging.Conversation{
		Type:      messaging.TypeCohort,
		CohortID:  &cohortID,
		CreatedBy: &createdBy,
	}
	if err := s.conversations.Create(ctx, conv); err != nil {
		return nil, err
	}
	for _, uid := range participantUserIDs {
		if err := s.conversations.AddParticipant(ctx, &messaging.Participant{
			ConversationID: conv.ID,
			UserID:         uid,
		}); err != nil {
			return nil, err
		}
	}
	return conv, nil
}

// ListConversations — the actor's conversations, newest first.
func (s *MessagingService) ListConversations(ctx context.Context, userID uuid.UUID, page, pageSize int) ([]messaging.ConversationWithMeta, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.conversations.ListByParticipant(ctx, userID, pageSize, (page-1)*pageSize)
}

type SendMessageInput struct {
	ConversationID uuid.UUID
	SenderUserID   uuid.UUID
	Type           messaging.MessageType
	Body           string
}

// SendMessage — participant-only. Touches the conversation and notifies all
// other participants.
func (s *MessagingService) SendMessage(ctx context.Context, in SendMessageInput) (*messaging.Message, error) {
	if len(in.Body) == 0 {
		return nil, fmt.Errorf("%w: message body is required", domain.ErrInvalidInput)
	}
	if len(in.Body) > 4000 {
		return nil, fmt.Errorf("%w: message too long (max 4000)", domain.ErrInvalidInput)
	}
	if in.Type == "" {
		in.Type = messaging.MsgText
	}

	conv, err := s.conversations.GetByID(ctx, in.ConversationID)
	if err != nil {
		return nil, err
	}
	if conv.IsClosed {
		return nil, fmt.Errorf("%w: conversation is closed", domain.ErrConflict)
	}
	isParticipant, err := s.conversations.IsParticipant(ctx, in.ConversationID, in.SenderUserID)
	if err != nil {
		return nil, err
	}
	if !isParticipant {
		return nil, fmt.Errorf("%w: only conversation participants can send messages", domain.ErrForbidden)
	}

	msg := &messaging.Message{
		ConversationID: in.ConversationID,
		SenderUserID:   in.SenderUserID,
		Type:           in.Type,
		Body:           in.Body,
	}
	if err := s.messages.Create(ctx, msg); err != nil {
		return nil, err
	}
	if err := s.conversations.Touch(ctx, in.ConversationID); err != nil {
		return nil, err
	}

	// Notify the other participants.
	participants, err := s.conversations.ListParticipants(ctx, in.ConversationID)
	if err != nil {
		return nil, err
	}
	for _, p := range participants {
		if p.UserID == in.SenderUserID {
			continue
		}
		data, _ := json.Marshal(map[string]any{
			"conversation_id": in.ConversationID.String(),
			"message_id":      msg.ID.String(),
		})
		title := "New message"
		if s.studentNames != nil {
			if name, err := s.studentNames.DisplayName(ctx, in.SenderUserID); err == nil && name != "" {
				title = name
			}
		}
		body := in.Body
		if len(body) > 120 {
			body = body[:120] + "…"
		}
		_ = s.notifications.Create(ctx, &messaging.Notification{
			UserID: p.UserID,
			Type:   "MESSAGE",
			Title:  title,
			Body:   &body,
			Data:   strPtr(string(data)),
		})
	}
	return msg, nil
}

// ListMessages — participant-only, newest-first with cursor pagination.
func (s *MessagingService) ListMessages(ctx context.Context, userID, conversationID uuid.UUID, before *uuid.UUID, limit int) ([]messaging.Message, error) {
	isParticipant, err := s.conversations.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return nil, err
	}
	if !isParticipant {
		return nil, fmt.Errorf("%w: not a conversation participant", domain.ErrForbidden)
	}
	return s.messages.ListByConversation(ctx, conversationID, before, limit)
}

// MarkConversationRead — sets last_read_at = now for the actor.
func (s *MessagingService) MarkConversationRead(ctx context.Context, userID, conversationID uuid.UUID) error {
	isParticipant, err := s.conversations.IsParticipant(ctx, conversationID, userID)
	if err != nil {
		return err
	}
	if !isParticipant {
		return domain.ErrForbidden
	}
	return s.conversations.UpdateLastRead(ctx, conversationID, userID, nowPtr())
}

// --- Notifications ---

func (s *MessagingService) ListNotifications(ctx context.Context, userID uuid.UUID, page, pageSize int) ([]messaging.Notification, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 30
	}
	return s.notifications.ListByUser(ctx, userID, pageSize, (page-1)*pageSize)
}

func (s *MessagingService) UnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	return s.notifications.UnreadCount(ctx, userID)
}

func (s *MessagingService) MarkNotificationRead(ctx context.Context, userID, notificationID uuid.UUID) error {
	return s.notifications.MarkRead(ctx, notificationID, userID)
}

func (s *MessagingService) MarkAllNotificationsRead(ctx context.Context, userID uuid.UUID) error {
	return s.notifications.MarkAllRead(ctx, userID)
}

// Notify — generic notification creator (booking events, vetting, payouts).
func (s *MessagingService) Notify(ctx context.Context, userID uuid.UUID, notifType, title string, body *string, data any) error {
	var dataJSON *string
	if data != nil {
		if b, err := json.Marshal(data); err == nil {
			dataJSON = strPtr(string(b))
		}
	}
	return s.notifications.Create(ctx, &messaging.Notification{
		UserID: userID,
		Type:   notifType,
		Title:  title,
		Body:   body,
		Data:   dataJSON,
	})
}

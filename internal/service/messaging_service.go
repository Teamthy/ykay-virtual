package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/messaging"
	"ykay-virtual/internal/domain/tutor"

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
	vettingReader vettingRepoReader
	enrollments   booking.CohortEnrollmentRepository
	students      identity.StudentProfileRepository
	users         identity.UserRepository
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

// ── Conversation contacts + scoped conversation start ─────────────────────

// ContactRow — someone the actor can start a conversation with (enrolled
// learner for tutors; tutor for parents/students).
type ContactRow struct {
	UserID      uuid.UUID  `json:"user_id"`
	Name        string     `json:"name"`
	Role        string     `json:"role"` // TUTOR | PARENT | STUDENT
	CohortID    *uuid.UUID `json:"cohort_id,omitempty"`
	CohortTitle *string    `json:"cohort_title,omitempty"`
}

// WithContactDeps wires the read models needed to resolve contacts and to
// authorise cohort conversations.
func (s *MessagingService) WithContactDeps(
	vetting vettingRepoReader,
	enrollments booking.CohortEnrollmentRepository,
	students identity.StudentProfileRepository,
	users identity.UserRepository,
) *MessagingService {
	s.vettingReader = vetting
	s.enrollments = enrollments
	s.students = students
	s.users = users
	return s
}

type vettingRepoReader interface {
	GetProfileByUserID(ctx context.Context, userID uuid.UUID) (*tutor.TutorProfile, error)
	GetProfileByID(ctx context.Context, profileID uuid.UUID) (*tutor.TutorProfile, error)
}

// Contacts — who the actor can message:
//   - TUTOR: learners (parents + self-enrolled students) confirmed in their
//     cohorts.
//   - PARENT/STUDENT: the tutor of each cohort they are confirmed in.
func (s *MessagingService) Contacts(ctx context.Context, actorUserID uuid.UUID) ([]ContactRow, error) {
	out := []ContactRow{}
	if s.vettingReader == nil || s.enrollments == nil || s.cohorts == nil {
		return out, nil
	}

	// Tutor view.
	if profile, err := s.vettingReader.GetProfileByUserID(ctx, actorUserID); err == nil && profile != nil {
		cohorts, err := s.cohorts.ListByTutor(ctx, profile.ID, 50)
		if err != nil {
			return nil, err
		}
		seen := map[uuid.UUID]bool{}
		for _, c := range cohorts {
			enrolls, err := s.enrollments.ListByCohort(ctx, c.ID)
			if err != nil {
				return nil, err
			}
			for _, e := range enrolls {
				if e.Status != booking.EnrollmentConfirmed {
					continue
				}
				for _, uid := range s.enrollmentActorUsers(ctx, e) {
					if uid == uuid.Nil || uid == actorUserID || seen[uid] {
						continue
					}
					seen[uid] = true
					name, role := s.contactIdentity(ctx, uid, e.StudentProfileID, "PARENT")
					out = append(out, ContactRow{
						UserID: uid, Name: name, Role: role,
						CohortID: &c.ID, CohortTitle: &c.Title,
					})
				}
			}
		}
		return out, nil
	}

	// Parent/student view: tutor of every confirmed enrollment.
	enrolls, err := s.enrollments.ListByParent(ctx, actorUserID, 50)
	if err != nil {
		return nil, err
	}
	seen := map[uuid.UUID]bool{}
	for _, e := range enrolls {
		if e.Status != booking.EnrollmentConfirmed {
			continue
		}
		c, err := s.cohorts.GetByID(ctx, e.CohortID)
		if err != nil || c.TutorProfileID == nil {
			continue
		}
		tp, err := s.vettingReader.GetProfileByID(ctx, *c.TutorProfileID)
		if err != nil || tp == nil || tp.UserID == actorUserID || seen[tp.UserID] {
			continue
		}
		seen[tp.UserID] = true
		out = append(out, ContactRow{
			UserID: tp.UserID, Name: tp.DisplayName, Role: "TUTOR",
			CohortID: &c.ID, CohortTitle: &c.Title,
		})
	}
	return out, nil
}

// StartCohortConversation — opens (or returns) the cohort Q&A conversation,
// deriving participants server-side (tutor + confirmed learners' actors).
// Only the cohort's tutor or a confirmed participant may start it.
func (s *MessagingService) StartCohortConversation(ctx context.Context, actorUserID, cohortID uuid.UUID) (*messaging.Conversation, error) {
	if s.cohorts == nil || s.enrollments == nil || s.vettingReader == nil {
		return nil, errors.New("messaging scopes not configured")
	}
	if existing, err := s.conversations.GetByBooking(ctx, messaging.TypeCohort, cohortID); err == nil {
		return existing, nil
	} else if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	cohort, err := s.cohorts.GetByID(ctx, cohortID)
	if err != nil {
		return nil, err
	}
	enrolls, err := s.enrollments.ListByCohort(ctx, cohortID)
	if err != nil {
		return nil, err
	}

	authorized := false
	participants := map[uuid.UUID]bool{}
	if cohort.TutorProfileID != nil {
		if tp, terr := s.vettingReader.GetProfileByID(ctx, *cohort.TutorProfileID); terr == nil && tp != nil {
			participants[tp.UserID] = true
			if tp.UserID == actorUserID {
				authorized = true
			}
		}
	}
	for _, e := range enrolls {
		if e.Status != booking.EnrollmentConfirmed {
			continue
		}
		for _, uid := range s.enrollmentActorUsers(ctx, e) {
			if uid == uuid.Nil {
				continue
			}
			participants[uid] = true
			if uid == actorUserID {
				authorized = true
			}
		}
	}
	if !authorized {
		return nil, fmt.Errorf("%w: only the cohort tutor or a confirmed participant can start this conversation", domain.ErrForbidden)
	}

	userIDs := make([]uuid.UUID, 0, len(participants))
	for uid := range participants {
		userIDs = append(userIDs, uid)
	}
	return s.CreateCohortConversation(ctx, cohortID, userIDs, actorUserID)
}

// enrollmentActorUsers — the user accounts that may chat about an enrollment:
// the parent and (when the learner has their own account) the learner.
func (s *MessagingService) enrollmentActorUsers(ctx context.Context, e booking.CohortEnrollment) []uuid.UUID {
	ids := []uuid.UUID{e.ParentUserID}
	if s.students != nil {
		if sp, err := s.students.FindByID(ctx, e.StudentProfileID); err == nil && sp != nil && sp.UserID != nil && *sp.UserID != uuid.Nil && *sp.UserID != e.ParentUserID {
			ids = append(ids, *sp.UserID)
		}
	}
	return ids
}

// contactIdentity — display name + role for a contact row.
func (s *MessagingService) contactIdentity(ctx context.Context, userID, studentProfileID uuid.UUID, fallbackRole string) (string, string) {
	name, role := "", fallbackRole
	if s.users != nil {
		if u, err := s.users.FindByID(ctx, userID); err == nil && u != nil {
			name = strings.TrimSpace(u.FirstName + " " + u.LastName)
			if name == "" {
				name = u.Email
			}
		}
	}
	// A self-enrolled learner chatting with the tutor shows the learner's
	// profile identity.
	if role == "PARENT" && s.students != nil && studentProfileID != uuid.Nil {
		if sp, err := s.students.FindByID(ctx, studentProfileID); err == nil && sp != nil && sp.UserID != nil && *sp.UserID == userID {
			name = strings.TrimSpace(sp.FirstName + " " + sp.LastName)
			role = "STUDENT"
		}
	}
	if name == "" {
		name = "Participant"
	}
	return name, role
}

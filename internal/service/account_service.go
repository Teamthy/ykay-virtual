package service

import (
	"context"
	"fmt"
	"strings"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/chat"
	"ykay-virtual/internal/domain/identity"

	"github.com/google/uuid"
)

// AccountService — self-service account management (phase 37 / /account):
// profile editing, data export, account deletion. Ownership is enforced by
// userID from the session; nothing here trusts client input for identity.

type AccountService struct {
	users    identity.UserRepository
	roles    identity.RoleRepository
	sessions identity.SessionRepository
	devices  identity.DeviceRepository
	students identity.StudentProfileRepository
	links    identity.ParentStudentLinkRepository
	chat     chat.ThreadRepository
	audit    *AuditService
}

func NewAccountService(
	users identity.UserRepository,
	roles identity.RoleRepository,
	sessions identity.SessionRepository,
	devices identity.DeviceRepository,
	students identity.StudentProfileRepository,
	links identity.ParentStudentLinkRepository,
	chatRepo chat.ThreadRepository,
	audit *AuditService,
) *AccountService {
	return &AccountService{
		users: users, roles: roles, sessions: sessions, devices: devices,
		students: students, links: links, chat: chatRepo, audit: audit,
	}
}

// UpdateProfileInput — editable profile fields.
type UpdateProfileInput struct {
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Phone     string  `json:"phone"`
	Timezone  string  `json:"timezone"`
	AvatarURL *string `json:"avatar_url,omitempty"`
}

// UpdateProfile — validates + persists the editable profile.
func (s *AccountService) UpdateProfile(ctx context.Context, userID uuid.UUID, in UpdateProfileInput) (*identity.User, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	user.FirstName = strings.TrimSpace(in.FirstName)
	user.LastName = strings.TrimSpace(in.LastName)
	if tz := strings.TrimSpace(in.Timezone); tz != "" {
		user.Timezone = tz
	}
	if phone := strings.TrimSpace(in.Phone); phone != "" {
		user.Phone = &phone
	} else if in.Phone == "" {
		user.Phone = nil // explicitly cleared
	}
	// avatar_url must be empty or a safe https:// URL (it is rendered in an
	// <img src>; rejecting other schemes blocks javascript:/data: XSS).
	if in.AvatarURL != nil {
		av := strings.TrimSpace(*in.AvatarURL)
		if av == "" {
			user.AvatarURL = nil
		} else if !strings.HasPrefix(av, "https://") {
			return nil, fmt.Errorf("%w: avatar_url must be an https URL", domain.ErrInvalidInput)
		} else {
			user.AvatarURL = &av
		}
	}
	if err := s.users.Update(ctx, user); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &userID, identity.AuditUpdate, "user",
		nil, nil, map[string]any{"event": "profile_updated"}, nil, nil)
	return user, nil
}

// ExportData — assembles everything the user owns for the GDPR-style export.
type ExportData struct {
	User         identity.User             `json:"user"`
	Roles        []string                  `json:"roles"`
	Learners     []identity.StudentProfile `json:"learners"`
	Devices      []identity.Device         `json:"devices"`
	ChatThreads  []chat.Thread             `json:"chat_threads"`
	ChatMessages map[string][]chat.Message `json:"chat_messages"`
}

func (s *AccountService) ExportData(ctx context.Context, userID uuid.UUID) (*ExportData, error) {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := &ExportData{User: *user}
	if roles, err := s.roles.RolesForUser(ctx, userID); err == nil {
		for _, r := range roles {
			out.Roles = append(out.Roles, r.Name)
		}
	}
	if learners, err := s.students.ListByParentUserID(ctx, userID); err == nil {
		out.Learners = learners
	}
	if devices, err := s.devices.ListByUser(ctx, userID); err == nil {
		out.Devices = devices
	}
	if s.chat != nil {
		if threads, err := s.chat.ListThreadsByUser(ctx, userID); err == nil {
			out.ChatThreads = threads
			out.ChatMessages = map[string][]chat.Message{}
			for _, t := range threads {
				if msgs, err := s.chat.ListMessages(ctx, t.ID); err == nil {
					out.ChatMessages[t.ID.String()] = msgs
				}
			}
		}
	}
	_ = s.audit.LogStateChange(ctx, &userID, identity.AuditUpdate, "user",
		nil, nil, map[string]any{"event": "data_export"}, nil, nil)
	return out, nil
}

// DeleteAccount — soft-deletes the user, revokes every session and removes
// push devices. Learners remain linked for the parent's records but the
// account can no longer sign in; a hard purge is a documented follow-up.
func (s *AccountService) DeleteAccount(ctx context.Context, userID uuid.UUID) error {
	user, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	user.Status = identity.UserStatusDeleted
	if err := s.users.Update(ctx, user); err != nil {
		return err
	}
	if err := s.sessions.RevokeAllForUser(ctx, userID); err != nil {
		return fmt.Errorf("revoke sessions: %w", err)
	}
	if devices, err := s.devices.ListByUser(ctx, userID); err == nil {
		for _, d := range devices {
			_ = s.devices.DeleteByToken(ctx, d.Token)
		}
	}
	_ = s.audit.LogStateChange(ctx, &userID, identity.AuditUpdate, "user",
		nil, nil, map[string]any{"event": "account_deleted"}, nil, nil)
	return nil
}

var _ = domain.ErrNotFound

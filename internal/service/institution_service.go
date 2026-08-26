package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/institution"
)

// InstitutionStudentView — a linked student enriched with the learner's name
// and level so the console can render a roster without a second round-trip.
type InstitutionStudentView struct {
	institution.InstitutionStudent
	StudentName  string  `json:"student_name"`
	StudentLevel *string `json:"student_level,omitempty"`
}

// InstitutionUpdateInput — partial profile update (nil = leave unchanged).
type InstitutionUpdateInput struct {
	Name        *string
	Type        *institution.InstitutionType
	Email       *string
	Phone       *string
	Website     *string
	LogoURL     *string
	Description *string
}

// requireMembership returns the actor's membership of an institution.
func (s *InstitutionService) requireMembership(ctx context.Context, userID, institutionID uuid.UUID) (*institution.Membership, error) {
	if s.institutions == nil {
		return nil, errorsInstitutionUnavailable()
	}
	m, err := s.institutions.GetMembership(ctx, institutionID, userID)
	if err != nil {
		if err == domain.ErrNotFound {
			return nil, domain.ErrForbidden
		}
		return nil, err
	}
	return m, nil
}

// requireManager — the actor must be OWNER or ADMIN of the institution.
func (s *InstitutionService) requireManager(ctx context.Context, userID, institutionID uuid.UUID) error {
	m, err := s.requireMembership(ctx, userID, institutionID)
	if err != nil {
		return err
	}
	if !m.CanManage() {
		return fmt.Errorf("%w: only the institution owner or an admin can manage this institution", domain.ErrForbidden)
	}
	return nil
}

func errorsInstitutionUnavailable() error {
	return fmt.Errorf("%w: institution store unavailable", domain.ErrInvalidInput)
}

// GetBySlug — public institution profile.
func (s *InstitutionService) GetBySlug(ctx context.Context, slug string) (*institution.Institution, error) {
	if s.institutions == nil {
		return nil, errorsInstitutionUnavailable()
	}
	return s.institutions.GetBySlug(ctx, strings.TrimSpace(slug))
}

// GetByID — scoped to a managing user; admins (actorIsAdmin) may read any.
func (s *InstitutionService) GetByID(ctx context.Context, userID, institutionID uuid.UUID, actorIsAdmin bool) (*institution.Institution, error) {
	if s.institutions == nil {
		return nil, errorsInstitutionUnavailable()
	}
	if !actorIsAdmin {
		if _, err := s.requireMembership(ctx, userID, institutionID); err != nil {
			return nil, err
		}
	}
	return s.institutions.GetByID(ctx, institutionID)
}

// ListMine — the institutions the user belongs to, with their role and the
// institution object (self-serve console home).
func (s *InstitutionService) ListMine(ctx context.Context, userID uuid.UUID) ([]institution.MembershipView, error) {
	if s.institutions == nil {
		return []institution.MembershipView{}, nil
	}
	memberships, err := s.institutions.ListMembershipsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	views := make([]institution.MembershipView, 0, len(memberships))
	for _, m := range memberships {
		inst, err := s.institutions.GetByID(ctx, m.InstitutionID)
		if err != nil {
			continue
		}
		views = append(views, institution.MembershipView{Membership: m, Institution: inst})
	}
	return views, nil
}

// Update — an OWNER/ADMIN (or a platform admin) edits the institution profile.
func (s *InstitutionService) Update(ctx context.Context, userID, institutionID uuid.UUID, actorIsAdmin bool, in InstitutionUpdateInput) (*institution.Institution, error) {
	if s.institutions == nil {
		return nil, errorsInstitutionUnavailable()
	}
	if !actorIsAdmin {
		if err := s.requireManager(ctx, userID, institutionID); err != nil {
			return nil, err
		}
	}
	current, err := s.institutions.GetByID(ctx, institutionID)
	if err != nil {
		return nil, err
	}
	if in.Name != nil {
		current.Name = strings.TrimSpace(*in.Name)
		if current.Name == "" {
			return nil, fmt.Errorf("%w: institution name is required", domain.ErrInvalidInput)
		}
	}
	if in.Type != nil {
		current.Type = *in.Type
	}
	if in.Email != nil {
		current.Email = nil
		if v := strings.TrimSpace(*in.Email); v != "" {
			if !validEmail(v) {
				return nil, fmt.Errorf("%w: invalid email", domain.ErrInvalidInput)
			}
			current.Email = &v
		}
	}
	if in.Phone != nil {
		current.Phone = nil
		if v := strings.TrimSpace(*in.Phone); v != "" {
			current.Phone = &v
		}
	}
	if in.Website != nil {
		current.Website = nil
		if v := strings.TrimSpace(*in.Website); v != "" {
			current.Website = &v
		}
	}
	if in.LogoURL != nil {
		current.LogoURL = nil
		if v := strings.TrimSpace(*in.LogoURL); v != "" {
			current.LogoURL = &v
		}
	}
	if in.Description != nil {
		current.Description = nil
		if v := strings.TrimSpace(*in.Description); v != "" {
			current.Description = &v
		}
	}
	if err := s.institutions.Update(ctx, current); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &userID, identity.AuditUpdate, "institution",
		&institutionID, nil, map[string]any{"action": "update_profile", "name": current.Name}, nil, nil)
	return current, nil
}

// SetActive — platform admin activates/deactivates an institution.
func (s *InstitutionService) SetActive(ctx context.Context, institutionID uuid.UUID, active bool) (*institution.Institution, error) {
	if s.institutions == nil {
		return nil, errorsInstitutionUnavailable()
	}
	if err := s.institutions.SetActive(ctx, institutionID, active); err != nil {
		return nil, err
	}
	return s.institutions.GetByID(ctx, institutionID)
}

// SetVerified — platform admin verifies (or un-verifies) an institution.
func (s *InstitutionService) SetVerified(ctx context.Context, institutionID uuid.UUID, verified bool) (*institution.Institution, error) {
	if s.institutions == nil {
		return nil, errorsInstitutionUnavailable()
	}
	var at *time.Time
	if verified {
		t := s.now().UTC()
		at = &t
	}
	if err := s.institutions.SetVerified(ctx, institutionID, at); err != nil {
		return nil, err
	}
	return s.institutions.GetByID(ctx, institutionID)
}

// ListMemberships — OWNER/ADMIN lists the institution's members.
func (s *InstitutionService) ListMemberships(ctx context.Context, userID, institutionID uuid.UUID) ([]institution.Membership, error) {
	if err := s.requireManager(ctx, userID, institutionID); err != nil {
		return nil, err
	}
	return s.institutions.ListMemberships(ctx, institutionID)
}

// InviteMember — OWNER/ADMIN adds a user as a member with a role.
func (s *InstitutionService) InviteMember(ctx context.Context, actorUserID, institutionID, inviteeUserID uuid.UUID, role institution.MembershipRole) (*institution.Membership, error) {
	if err := s.requireManager(ctx, actorUserID, institutionID); err != nil {
		return nil, err
	}
	if !validRole(role) {
		return nil, fmt.Errorf("%w: invalid membership role", domain.ErrInvalidInput)
	}
	if inviteeUserID == uuid.Nil {
		return nil, fmt.Errorf("%w: a user id is required", domain.ErrInvalidInput)
	}
	// Only the OWNER may grant the OWNER role.
	if role == institution.RoleOwner {
		m, err := s.institutions.GetMembership(ctx, institutionID, actorUserID)
		if err != nil || !m.IsOwner() {
			return nil, fmt.Errorf("%w: only the institution owner can assign the owner role", domain.ErrForbidden)
		}
	}
	m := &institution.Membership{
		InstitutionID: institutionID,
		UserID:        inviteeUserID,
		Role:          role,
		InvitedBy:     &actorUserID,
	}
	if err := s.institutions.AddMembership(ctx, m); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &actorUserID, identity.AuditCreate, "institution_membership",
		&m.ID, nil, map[string]any{"institution_id": institutionID.String(), "user_id": inviteeUserID.String(), "role": role}, nil, nil)
	return m, nil
}

// SetMemberRole — OWNER/ADMIN changes a member's role.
func (s *InstitutionService) SetMemberRole(ctx context.Context, actorUserID, institutionID, targetUserID uuid.UUID, role institution.MembershipRole) error {
	if err := s.requireManager(ctx, actorUserID, institutionID); err != nil {
		return err
	}
	if !validRole(role) {
		return fmt.Errorf("%w: invalid membership role", domain.ErrInvalidInput)
	}
	if role == institution.RoleOwner {
		m, err := s.institutions.GetMembership(ctx, institutionID, actorUserID)
		if err != nil || !m.IsOwner() {
			return fmt.Errorf("%w: only the institution owner can assign the owner role", domain.ErrForbidden)
		}
	}
	// An OWNER cannot demote themselves.
	if targetUserID == actorUserID {
		cur, err := s.institutions.GetMembership(ctx, institutionID, targetUserID)
		if err == nil && cur.IsOwner() && role != institution.RoleOwner {
			return fmt.Errorf("%w: the owner cannot change their own role", domain.ErrConflict)
		}
	}
	if err := s.institutions.SetMembershipRole(ctx, institutionID, targetUserID, role); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &actorUserID, identity.AuditUpdate, "institution_membership",
		nil, nil, map[string]any{"institution_id": institutionID.String(), "user_id": targetUserID.String(), "role": role}, nil, nil)
	return nil
}

// RemoveMember — OWNER/ADMIN removes a member. An OWNER cannot remove themself.
func (s *InstitutionService) RemoveMember(ctx context.Context, actorUserID, institutionID, targetUserID uuid.UUID) error {
	if err := s.requireManager(ctx, actorUserID, institutionID); err != nil {
		return err
	}
	if targetUserID == actorUserID {
		cur, err := s.institutions.GetMembership(ctx, institutionID, targetUserID)
		if err == nil && cur.IsOwner() {
			return fmt.Errorf("%w: the owner cannot remove themselves from the institution", domain.ErrConflict)
		}
	}
	if err := s.institutions.RemoveMembership(ctx, institutionID, targetUserID); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &actorUserID, identity.AuditDelete, "institution_membership",
		nil, nil, map[string]any{"institution_id": institutionID.String(), "user_id": targetUserID.String()}, nil, nil)
	return nil
}

// ListStudents — OWNER/ADMIN lists the institution's linked learners (enriched).
func (s *InstitutionService) ListStudents(ctx context.Context, actorUserID, institutionID uuid.UUID) ([]InstitutionStudentView, error) {
	if err := s.requireManager(ctx, actorUserID, institutionID); err != nil {
		return nil, err
	}
	links, err := s.institutions.ListStudents(ctx, institutionID)
	if err != nil {
		return nil, err
	}
	views := make([]InstitutionStudentView, 0, len(links))
	for _, l := range links {
		v := InstitutionStudentView{InstitutionStudent: l}
		if s.students != nil {
			if p, err := s.students.FindByID(ctx, l.StudentProfileID); err == nil && p != nil {
				v.StudentName = p.FirstName + " " + p.LastName
				v.StudentLevel = p.CurrentLevel
			}
		}
		views = append(views, v)
	}
	return views, nil
}

// AddStudent — OWNER/ADMIN links a learner to the institution.
func (s *InstitutionService) AddStudent(ctx context.Context, actorUserID, institutionID, studentProfileID uuid.UUID, enrollmentRef string) (*InstitutionStudentView, error) {
	if err := s.requireManager(ctx, actorUserID, institutionID); err != nil {
		return nil, err
	}
	var ref *string
	if v := strings.TrimSpace(enrollmentRef); v != "" {
		ref = &v
	}
	l := &institution.InstitutionStudent{
		InstitutionID:    institutionID,
		StudentProfileID: studentProfileID,
		EnrollmentRef:    ref,
	}
	if err := s.institutions.AddStudent(ctx, l); err != nil {
		return nil, err
	}
	v := InstitutionStudentView{InstitutionStudent: *l}
	if s.students != nil {
		if p, err := s.students.FindByID(ctx, studentProfileID); err == nil && p != nil {
			v.StudentName = p.FirstName + " " + p.LastName
			v.StudentLevel = p.CurrentLevel
		}
	}
	_ = s.audit.LogStateChange(ctx, &actorUserID, identity.AuditCreate, "institution_student",
		&l.ID, nil, map[string]any{"institution_id": institutionID.String(), "student_profile_id": studentProfileID.String()}, nil, nil)
	return &v, nil
}

// RemoveStudent — OWNER/ADMIN unlinks a learner from the institution.
func (s *InstitutionService) RemoveStudent(ctx context.Context, actorUserID, institutionID, studentProfileID uuid.UUID) error {
	if err := s.requireManager(ctx, actorUserID, institutionID); err != nil {
		return err
	}
	if err := s.institutions.RemoveStudent(ctx, institutionID, studentProfileID); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &actorUserID, identity.AuditDelete, "institution_student",
		nil, nil, map[string]any{"institution_id": institutionID.String(), "student_profile_id": studentProfileID.String()}, nil, nil)
	return nil
}

func validRole(r institution.MembershipRole) bool {
	switch r {
	case institution.RoleOwner, institution.RoleAdmin, institution.RoleTeacher,
		institution.RoleStudent, institution.RoleBilling:
		return true
	}
	return false
}

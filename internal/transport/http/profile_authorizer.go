package httpapi

import (
	"context"
	"errors"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/vetting"
	"ykay-virtual/internal/middleware"
	"ykay-virtual/pkg"

	"github.com/google/uuid"
)

// ProfileAuthorizer — G1 object-level authorization (remediation plan G1.1/G1.2).
//
// Handlers must NEVER trust a browser-supplied student_profile_id /
// tutor_profile_id. Every profile-scoped endpoint resolves the ID through
// this authorizer, which enforces:
//
//   - STUDENT  → only the profile whose user_id equals the session user.
//   - PARENT   → only learners linked via parent_student_links.
//   - TUTOR    → only the tutor profile owned by the session user.
//   - admin    → any explicit ID (audited operational access).
//
// When the caller omits the ID entirely, the authorizer resolves the
// session's own profile (single-learner parents included), so clients no
// longer need fixture UUIDs at all.
type ProfileAuthorizer struct {
	students identity.StudentProfileRepository
	vetting  vetting.VettingRepository
}

func NewProfileAuthorizer(students identity.StudentProfileRepository, vettingRepo vetting.VettingRepository) *ProfileAuthorizer {
	return &ProfileAuthorizer{students: students, vetting: vettingRepo}
}

// ResolveStudent returns the student profile ID the actor may act for.
// requestedRaw may be empty → resolve from the session.
func (a *ProfileAuthorizer) ResolveStudent(ctx context.Context, actor *middleware.Actor, requestedRaw string) (uuid.UUID, error) {
	requested := uuid.Nil
	if requestedRaw != "" {
		id, err := uuid.Parse(requestedRaw)
		if err != nil {
			return uuid.Nil, pkg.BadRequest("student_profile_id must be a valid UUID", nil)
		}
		requested = id
	}

	if actor.IsAdmin {
		if requested == uuid.Nil {
			return uuid.Nil, pkg.BadRequest("student_profile_id query param is required", nil)
		}
		return requested, nil
	}

	if hasSessionRole(actor.Roles, "STUDENT") {
		own, err := a.students.FindByUserID(ctx, actor.UserID)
		if err != nil && !errors.Is(err, domain.ErrNotFound) {
			return uuid.Nil, err
		}
		if own != nil && (requested == uuid.Nil || requested == own.ID) {
			return own.ID, nil
		}
	}

	if hasSessionRole(actor.Roles, "PARENT") {
		learners, err := a.students.ListByParentUserID(ctx, actor.UserID)
		if err != nil {
			return uuid.Nil, err
		}
		if requested == uuid.Nil {
			if len(learners) == 1 {
				return learners[0].ID, nil
			}
			return uuid.Nil, pkg.BadRequest("student_profile_id query param is required", nil)
		}
		for _, l := range learners {
			if l.ID == requested {
				return requested, nil
			}
		}
	}

	return uuid.Nil, pkg.Forbidden("student profile does not belong to this account")
}

// ResolveTutor returns the tutor profile ID the actor may act for.
// requestedRaw may be empty → resolve the session user's own tutor profile.
func (a *ProfileAuthorizer) ResolveTutor(ctx context.Context, actor *middleware.Actor, requestedRaw string) (uuid.UUID, error) {
	requested := uuid.Nil
	if requestedRaw != "" {
		id, err := uuid.Parse(requestedRaw)
		if err != nil {
			return uuid.Nil, pkg.BadRequest("tutor_profile_id must be a valid UUID", nil)
		}
		requested = id
	}

	if actor.IsAdmin {
		if requested == uuid.Nil {
			return uuid.Nil, pkg.BadRequest("tutor_profile_id query param is required", nil)
		}
		return requested, nil
	}

	if hasSessionRole(actor.Roles, "TUTOR") {
		own, err := a.vetting.GetProfileByUserID(ctx, actor.UserID)
		if err != nil && !errors.Is(err, domain.ErrNotFound) {
			return uuid.Nil, err
		}
		if own != nil && (requested == uuid.Nil || requested == own.ID) {
			return own.ID, nil
		}
	}

	return uuid.Nil, pkg.Forbidden("tutor profile does not belong to this account")
}

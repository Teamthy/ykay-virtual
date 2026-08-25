package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/school"

	"github.com/google/uuid"
)

// SchoolCalendarService â€” virtual-school academic calendar (Pillar 1).
// Owns every invariant for sessions and terms so both the admin console and
// future pillars (timetable, gradebook, transcripts) can rely on them:
//
//   - Session/term dates are calendar dates, end strictly after start.
//   - Non-CLOSED sessions never overlap within a scope (platform = nil
//     institution, or one partner school); at most one ACTIVE per scope.
//   - Terms live fully inside their session's window, never overlap each
//     other, and at most one is ACTIVE per session.
//   - Lifecycles are linear: DRAFTâ†’ACTIVEâ†’CLOSED / UPCOMINGâ†’ACTIVEâ†’CLOSED.
//   - Term activation requires an ACTIVE session (you cannot "be in" a term
//     of a year that has not started).
//   - Closing a session cascades: its terms are CLOSED with it.
//
// Status writes have partial-unique-index backstops in migration 000063, so
// races degrade to the DB constraint rather than corrupting the calendar.
type SchoolCalendarService struct {
	repo school.CalendarRepository
	now  func() time.Time
}

func NewSchoolCalendarService(repo school.CalendarRepository) *SchoolCalendarService {
	return &SchoolCalendarService{repo: repo, now: func() time.Time { return time.Now().UTC() }}
}

// WithClock swaps the clock (tests).
func (s *SchoolCalendarService) WithClock(now func() time.Time) *SchoolCalendarService {
	s.now = now
	return s
}

// SessionInput â€” create/update payload for an academic session.
type SessionInput struct {
	InstitutionID *uuid.UUID
	Name          string
	StartsOn      time.Time
	EndsOn        time.Time
}

// TermInput â€” create/update payload for a term.
type TermInput struct {
	Name               string
	Number             int
	StartsOn           time.Time
	EndsOn             time.Time
	EnrollmentOpensAt  *time.Time
	EnrollmentClosesAt *time.Time
}

// dateOnly normalises a civil date to UTC midnight (DATE columns).
func dateOnly(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func validateSessionInput(in *SessionInput) error {
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		return fmt.Errorf("%w: session name is required", domain.ErrInvalidInput)
	}
	in.StartsOn = dateOnly(in.StartsOn)
	in.EndsOn = dateOnly(in.EndsOn)
	if !in.EndsOn.After(in.StartsOn) {
		return fmt.Errorf("%w: session end date must be after its start date", domain.ErrInvalidInput)
	}
	return nil
}

func validateTermInput(in *TermInput) error {
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		return fmt.Errorf("%w: term name is required", domain.ErrInvalidInput)
	}
	if in.Number < 1 {
		return fmt.Errorf("%w: term number must be 1 or greater", domain.ErrInvalidInput)
	}
	in.StartsOn = dateOnly(in.StartsOn)
	in.EndsOn = dateOnly(in.EndsOn)
	if !in.EndsOn.After(in.StartsOn) {
		return fmt.Errorf("%w: term end date must be after its start date", domain.ErrInvalidInput)
	}
	if in.EnrollmentOpensAt != nil && in.EnrollmentClosesAt != nil &&
		!in.EnrollmentClosesAt.After(*in.EnrollmentOpensAt) {
		return fmt.Errorf("%w: enrolment window closes before it opens", domain.ErrInvalidInput)
	}
	return nil
}

// CreateSession â€” a new session starts life as DRAFT (never live by default).
func (s *SchoolCalendarService) CreateSession(ctx context.Context, in SessionInput) (*school.Session, error) {
	if err := validateSessionInput(&in); err != nil {
		return nil, err
	}
	overlap, err := s.repo.SessionsOverlap(ctx, in.InstitutionID, in.StartsOn, in.EndsOn, uuid.Nil)
	if err != nil {
		return nil, err
	}
	if overlap {
		return nil, fmt.Errorf("%w: an open session already covers part of this date range", domain.ErrConflict)
	}
	sess := &school.Session{
		InstitutionID: in.InstitutionID,
		Name:          in.Name,
		StartsOn:      in.StartsOn,
		EndsOn:        in.EndsOn,
		Status:        school.SessionDraft,
	}
	if err := s.repo.CreateSession(ctx, sess); err != nil {
		return nil, err
	}
	return sess, nil
}

// ListSessions â€” admin list for one scope.
func (s *SchoolCalendarService) ListSessions(ctx context.Context, institutionID *uuid.UUID) ([]school.Session, error) {
	return s.repo.ListSessions(ctx, institutionID)
}

// UpdateSession â€” name/date edits. A CLOSED session is immutable history;
// date edits must still contain every term the session already has.
func (s *SchoolCalendarService) UpdateSession(ctx context.Context, id uuid.UUID, in SessionInput) (*school.Session, error) {
	sess, err := s.repo.GetSession(ctx, id)
	if err != nil {
		return nil, err
	}
	if sess.Status == school.SessionClosed {
		return nil, fmt.Errorf("%w: a closed session cannot be edited", domain.ErrConflict)
	}
	in.InstitutionID = sess.InstitutionID // scope is immutable after creation
	if err := validateSessionInput(&in); err != nil {
		return nil, err
	}
	overlap, err := s.repo.SessionsOverlap(ctx, sess.InstitutionID, in.StartsOn, in.EndsOn, id)
	if err != nil {
		return nil, err
	}
	if overlap {
		return nil, fmt.Errorf("%w: an open session already covers part of this date range", domain.ErrConflict)
	}
	terms, err := s.repo.ListTerms(ctx, id)
	if err != nil {
		return nil, err
	}
	for _, t := range terms {
		if t.StartsOn.Before(in.StartsOn) || t.EndsOn.After(in.EndsOn) {
			return nil, fmt.Errorf("%w: new dates would orphan term %q â€” adjust its terms first", domain.ErrInvalidInput, t.Name)
		}
	}
	sess.Name = in.Name
	sess.StartsOn = in.StartsOn
	sess.EndsOn = in.EndsOn
	if err := s.repo.UpdateSession(ctx, sess); err != nil {
		return nil, err
	}
	return sess, nil
}

// SetSessionStatus â€” DRAFTâ†’ACTIVEâ†’CLOSED. Activating requires no other
// ACTIVE session in the scope (close it first); closing cascades to terms.
func (s *SchoolCalendarService) SetSessionStatus(ctx context.Context, id uuid.UUID, next school.SessionStatus) (*school.Session, error) {
	sess, err := s.repo.GetSession(ctx, id)
	if err != nil {
		return nil, err
	}
	if !sess.Status.CanTransitionTo(next) {
		return nil, fmt.Errorf("%w: session cannot move from %s to %s", domain.ErrConflict, sess.Status, next)
	}
	if next == school.SessionActive {
		if cur, cerr := s.repo.CurrentSession(ctx, sess.InstitutionID); cerr == nil && cur.ID != id {
			return nil, fmt.Errorf("%w: session %q is already ACTIVE â€” close it first", domain.ErrConflict, cur.Name)
		} else if cerr != nil && !errors.Is(cerr, domain.ErrNotFound) {
			return nil, cerr
		}
	}
	if err := s.repo.SetSessionStatus(ctx, id, next); err != nil {
		return nil, err
	}
	if next == school.SessionClosed {
		if err := s.repo.CloseTermsForSession(ctx, id); err != nil {
			return nil, err
		}
	}
	return s.repo.GetSession(ctx, id)
}

// CreateTerm â€” adds a term (UPCOMING) to a non-CLOSED session.
func (s *SchoolCalendarService) CreateTerm(ctx context.Context, sessionID uuid.UUID, in TermInput) (*school.Term, error) {
	sess, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if sess.Status == school.SessionClosed {
		return nil, fmt.Errorf("%w: cannot add terms to a closed session", domain.ErrConflict)
	}
	if err := validateTermInput(&in); err != nil {
		return nil, err
	}
	if in.StartsOn.Before(sess.StartsOn) || in.EndsOn.After(sess.EndsOn) {
		return nil, fmt.Errorf("%w: term must lie inside the session dates (%s â†’ %s)",
			domain.ErrInvalidInput, sess.StartsOn.Format("2006-01-02"), sess.EndsOn.Format("2006-01-02"))
	}
	if err := s.ensureNoTermOverlap(ctx, sessionID, in, uuid.Nil); err != nil {
		return nil, err
	}
	term := &school.Term{
		SessionID:          sessionID,
		Name:               in.Name,
		Number:             in.Number,
		StartsOn:           in.StartsOn,
		EndsOn:             in.EndsOn,
		EnrollmentOpensAt:  in.EnrollmentOpensAt,
		EnrollmentClosesAt: in.EnrollmentClosesAt,
		Status:             school.TermUpcoming,
	}
	if err := s.repo.CreateTerm(ctx, term); err != nil {
		return nil, err
	}
	return term, nil
}

func (s *SchoolCalendarService) ensureNoTermOverlap(ctx context.Context, sessionID uuid.UUID, in TermInput, excludeID uuid.UUID) error {
	overlap, err := s.repo.TermsOverlap(ctx, sessionID, in.StartsOn, in.EndsOn, excludeID)
	if err != nil {
		return err
	}
	if overlap {
		return fmt.Errorf("%w: another term in this session already covers part of this date range", domain.ErrConflict)
	}
	return nil
}

// ListTerms â€” a session's terms ordered by number.
func (s *SchoolCalendarService) ListTerms(ctx context.Context, sessionID uuid.UUID) ([]school.Term, error) {
	if _, err := s.repo.GetSession(ctx, sessionID); err != nil {
		return nil, err
	}
	return s.repo.ListTerms(ctx, sessionID)
}

// UpdateTerm â€” name/number/date/window edits. A CLOSED term (or one whose
// session is CLOSED) is immutable history.
func (s *SchoolCalendarService) UpdateTerm(ctx context.Context, id uuid.UUID, in TermInput) (*school.Term, error) {
	term, err := s.repo.GetTerm(ctx, id)
	if err != nil {
		return nil, err
	}
	if term.Status == school.TermClosed {
		return nil, fmt.Errorf("%w: a closed term cannot be edited", domain.ErrConflict)
	}
	sess, err := s.repo.GetSession(ctx, term.SessionID)
	if err != nil {
		return nil, err
	}
	if sess.Status == school.SessionClosed {
		return nil, fmt.Errorf("%w: the session is closed â€” its terms are locked", domain.ErrConflict)
	}
	if err := validateTermInput(&in); err != nil {
		return nil, err
	}
	if in.StartsOn.Before(sess.StartsOn) || in.EndsOn.After(sess.EndsOn) {
		return nil, fmt.Errorf("%w: term must lie inside the session dates", domain.ErrInvalidInput)
	}
	if err := s.ensureNoTermOverlap(ctx, term.SessionID, in, id); err != nil {
		return nil, err
	}
	term.Name = in.Name
	term.Number = in.Number
	term.StartsOn = in.StartsOn
	term.EndsOn = in.EndsOn
	term.EnrollmentOpensAt = in.EnrollmentOpensAt
	term.EnrollmentClosesAt = in.EnrollmentClosesAt
	if err := s.repo.UpdateTerm(ctx, term); err != nil {
		return nil, err
	}
	return term, nil
}

// SetTermStatus â€” UPCOMINGâ†’ACTIVEâ†’CLOSED. Activation requires the parent
// session to be ACTIVE and no sibling term currently ACTIVE.
func (s *SchoolCalendarService) SetTermStatus(ctx context.Context, id uuid.UUID, next school.TermStatus) (*school.Term, error) {
	term, err := s.repo.GetTerm(ctx, id)
	if err != nil {
		return nil, err
	}
	if !term.Status.CanTransitionTo(next) {
		return nil, fmt.Errorf("%w: term cannot move from %s to %s", domain.ErrConflict, term.Status, next)
	}
	if next == school.TermActive {
		sess, err := s.repo.GetSession(ctx, term.SessionID)
		if err != nil {
			return nil, err
		}
		if sess.Status != school.SessionActive {
			return nil, fmt.Errorf("%w: activate the session before activating a term", domain.ErrConflict)
		}
		terms, err := s.repo.ListTerms(ctx, term.SessionID)
		if err != nil {
			return nil, err
		}
		for _, other := range terms {
			if other.ID != id && other.Status == school.TermActive {
				return nil, fmt.Errorf("%w: term %q is already ACTIVE â€” close it first", domain.ErrConflict, other.Name)
			}
		}
	}
	if err := s.repo.SetTermStatus(ctx, id, next); err != nil {
		return nil, err
	}
	return s.repo.GetTerm(ctx, id)
}

// CurrentCalendar â€” public read: the ACTIVE session for a scope plus its
// terms (each with the enrolment window evaluated at now). A scope with no
// active session is a normal state, answered with Active=false.
func (s *SchoolCalendarService) CurrentCalendar(ctx context.Context, institutionID *uuid.UUID) (*school.CalendarView, error) {
	view := &school.CalendarView{Terms: []school.TermView{}}
	sess, err := s.repo.CurrentSession(ctx, institutionID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return view, nil
		}
		return nil, err
	}
	terms, err := s.repo.ListTerms(ctx, sess.ID)
	if err != nil {
		return nil, err
	}
	now := s.now()
	view.Active = true
	view.Session = sess
	for _, t := range terms {
		view.Terms = append(view.Terms, school.TermView{Term: t, EnrollmentOpen: t.EnrollmentOpenAt(now)})
	}
	return view, nil
}

// Package school â€” virtual-school domain. Pillar 1 is the academic calendar:
// sessions (school years) and terms, which cohorts, timetables, gradebooks
// and transcripts all anchor to. A nil InstitutionID marks the platform-wide
// NUVORA virtual school; a set InstitutionID scopes the calendar to one
// partner school (B2B).
package school

import (
	"time"

	"github.com/google/uuid"
)

// SessionStatus â€” lifecycle of an academic session: DRAFT â†’ ACTIVE â†’ CLOSED.
type SessionStatus string

const (
	SessionDraft  SessionStatus = "DRAFT"
	SessionActive SessionStatus = "ACTIVE"
	SessionClosed SessionStatus = "CLOSED"
)

// CanTransitionTo â€” legal session transitions are strictly linear.
func (s SessionStatus) CanTransitionTo(next SessionStatus) bool {
	switch s {
	case SessionDraft:
		return next == SessionActive
	case SessionActive:
		return next == SessionClosed
	}
	return false
}

// Session â€” one academic year, e.g. "2026/2027". Dates are calendar dates
// (stored as DATE; time components are normalised to UTC midnight).
type Session struct {
	ID            uuid.UUID     `json:"id"`
	InstitutionID *uuid.UUID    `json:"institution_id,omitempty"`
	Name          string        `json:"name"`
	StartsOn      time.Time     `json:"starts_on"`
	EndsOn        time.Time     `json:"ends_on"`
	Status        SessionStatus `json:"status"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

// TermStatus â€” lifecycle of a term: UPCOMING â†’ ACTIVE â†’ CLOSED.
type TermStatus string

const (
	TermUpcoming TermStatus = "UPCOMING"
	TermActive   TermStatus = "ACTIVE"
	TermClosed   TermStatus = "CLOSED"
)

// CanTransitionTo â€” legal term transitions are strictly linear.
func (t TermStatus) CanTransitionTo(next TermStatus) bool {
	switch t {
	case TermUpcoming:
		return next == TermActive
	case TermActive:
		return next == TermClosed
	}
	return false
}

// Term â€” one term within a session. Number is the 1-based position within
// the session (unique per session). Terms never overlap each other within a
// session and must lie inside the session's date window.
type Term struct {
	ID                 uuid.UUID  `json:"id"`
	SessionID          uuid.UUID  `json:"session_id"`
	Name               string     `json:"name"`
	Number             int        `json:"number"`
	StartsOn           time.Time  `json:"starts_on"`
	EndsOn             time.Time  `json:"ends_on"`
	EnrollmentOpensAt  *time.Time `json:"enrollment_opens_at,omitempty"`
	EnrollmentClosesAt *time.Time `json:"enrollment_closes_at,omitempty"`
	Status             TermStatus `json:"status"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

// EnrollmentOpenAt â€” nil bounds are open-ended on that side (same window
// semantics as cohorts, migration 000060). With both nil the term is open
// for enrolment at any time. A CLOSED term never accepts enrolments.
func (t Term) EnrollmentOpenAt(now time.Time) bool {
	if t.Status == TermClosed {
		return false
	}
	if t.EnrollmentOpensAt != nil && now.Before(*t.EnrollmentOpensAt) {
		return false
	}
	if t.EnrollmentClosesAt != nil && now.After(*t.EnrollmentClosesAt) {
		return false
	}
	return true
}

// TermView â€” read model: the term plus its computed enrolment state.
type TermView struct {
	Term
	EnrollmentOpen bool `json:"enrollment_open"`
}

// CalendarView â€” public read model: the current (ACTIVE) session for a scope
// and its terms ordered by number. Active=false when nothing is live yet â€”
// the endpoint answers 200 either way so clients can render an empty state
// instead of handling 404 noise.
type CalendarView struct {
	Active  bool       `json:"active"`
	Session *Session   `json:"session,omitempty"`
	Terms   []TermView `json:"terms"`
}

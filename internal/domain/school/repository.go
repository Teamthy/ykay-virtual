package school

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// CalendarRepository â€” storage for academic sessions and terms. Overlap and
// uniqueness invariants are enforced by the service first (friendly errors)
// and by database constraints as the concurrency backstop.
type CalendarRepository interface {
	// Sessions.
	CreateSession(ctx context.Context, s *Session) error
	GetSession(ctx context.Context, id uuid.UUID) (*Session, error)
	// UpdateSession saves name/date edits; status moves only via
	// SetSessionStatus.
	UpdateSession(ctx context.Context, s *Session) error
	SetSessionStatus(ctx context.Context, id uuid.UUID, status SessionStatus) error
	// ListSessions returns the sessions for one scope (nil institution =
	// platform), newest first.
	ListSessions(ctx context.Context, institutionID *uuid.UUID) ([]Session, error)
	// CurrentSession returns the ACTIVE session for a scope (domain.ErrNotFound
	// when none is active).
	CurrentSession(ctx context.Context, institutionID *uuid.UUID) (*Session, error)
	// SessionsOverlap reports whether another non-CLOSED session in the same
	// scope covers any day of [startsOn, endsOn] (both bounds inclusive).
	SessionsOverlap(ctx context.Context, institutionID *uuid.UUID, startsOn, endsOn time.Time, excludeID uuid.UUID) (bool, error)

	// Terms (scoped by session).
	CreateTerm(ctx context.Context, t *Term) error
	GetTerm(ctx context.Context, id uuid.UUID) (*Term, error)
	// UpdateTerm saves name/number/date/window edits; status moves only via
	// SetTermStatus.
	UpdateTerm(ctx context.Context, t *Term) error
	SetTermStatus(ctx context.Context, id uuid.UUID, status TermStatus) error
	// ListTerms returns a session's terms ordered by number.
	ListTerms(ctx context.Context, sessionID uuid.UUID) ([]Term, error)
	// TermsOverlap reports whether another term in the session covers any day
	// of [startsOn, endsOn], regardless of status.
	TermsOverlap(ctx context.Context, sessionID uuid.UUID, startsOn, endsOn time.Time, excludeID uuid.UUID) (bool, error)
	// CloseTermsForSession bulk-closes a session's UPCOMING/ACTIVE terms â€”
	// the cascade applied when the session itself is closed.
	CloseTermsForSession(ctx context.Context, sessionID uuid.UUID) error
}

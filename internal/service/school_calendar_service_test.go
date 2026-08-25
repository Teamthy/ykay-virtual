package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/school"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func newSchoolCalSvc() *SchoolCalendarService {
	return NewSchoolCalendarService(memory.NewSchoolCalendarMemory())
}

func day(y int, m time.Month, d int) time.Time { return time.Date(y, m, d, 0, 0, 0, 0, time.UTC) }

func sessionInput() SessionInput {
	return SessionInput{Name: "2026/2027", StartsOn: day(2026, 9, 1), EndsOn: day(2027, 7, 16)}
}

func TestSchoolCal_SessionLifecycleAndUniqueness(t *testing.T) {
	ctx := context.Background()
	svc := newSchoolCalSvc()

	sess, err := svc.CreateSession(ctx, sessionInput())
	require.NoError(t, err)
	require.Equal(t, school.SessionDraft, sess.Status)

	// Overlapping session in the same (platform) scope is rejected.
	_, err = svc.CreateSession(ctx, SessionInput{Name: "clash", StartsOn: day(2027, 1, 1), EndsOn: day(2027, 12, 1)})
	require.ErrorIs(t, err, domain.ErrConflict)

	// A back-to-back session (starts the day after the first ends) is fine.
	later, err := svc.CreateSession(ctx, SessionInput{Name: "2027/2028", StartsOn: day(2027, 9, 1), EndsOn: day(2028, 7, 15)})
	require.NoError(t, err)

	// DRAFT cannot skip straight to CLOSED; activate first.
	_, err = svc.SetSessionStatus(ctx, sess.ID, school.SessionClosed)
	require.ErrorIs(t, err, domain.ErrConflict)

	active, err := svc.SetSessionStatus(ctx, sess.ID, school.SessionActive)
	require.NoError(t, err)
	require.Equal(t, school.SessionActive, active.Status)

	// A second ACTIVE session in the same scope is refused with a friendly error.
	_, err = svc.SetSessionStatus(ctx, later.ID, school.SessionActive)
	require.ErrorIs(t, err, domain.ErrConflict)

	// Closing cascades to terms and locks the session against edits.
	closed, err := svc.SetSessionStatus(ctx, sess.ID, school.SessionClosed)
	require.NoError(t, err)
	require.Equal(t, school.SessionClosed, closed.Status)
	_, err = svc.UpdateSession(ctx, sess.ID, sessionInput())
	require.ErrorIs(t, err, domain.ErrConflict)

	// With the first closed, the later session may now go live.
	_, err = svc.SetSessionStatus(ctx, later.ID, school.SessionActive)
	require.NoError(t, err)
}

func TestSchoolCal_TermRules(t *testing.T) {
	ctx := context.Background()
	svc := newSchoolCalSvc()
	sess, err := svc.CreateSession(ctx, sessionInput())
	require.NoError(t, err)

	// Terms must lie inside the session window.
	_, err = svc.CreateTerm(ctx, sess.ID, TermInput{Name: "Too early", Number: 1, StartsOn: day(2026, 8, 1), EndsOn: day(2026, 12, 15)})
	require.ErrorIs(t, err, domain.ErrInvalidInput)

	opens := day(2026, 8, 1).Add(9 * time.Hour)
	closes := day(2026, 9, 10).Add(23 * time.Hour)
	t1, err := svc.CreateTerm(ctx, sess.ID, TermInput{
		Name: "First Term", Number: 1,
		StartsOn: day(2026, 9, 7), EndsOn: day(2026, 12, 11),
		EnrollmentOpensAt: &opens, EnrollmentClosesAt: &closes,
	})
	require.NoError(t, err)
	require.Equal(t, school.TermUpcoming, t1.Status)
	require.True(t, t1.EnrollmentOpenAt(opens.Add(time.Minute)))
	require.False(t, t1.EnrollmentOpenAt(closes.Add(time.Minute)))

	// Overlapping sibling term is rejected, even across term numbers.
	_, err = svc.CreateTerm(ctx, sess.ID, TermInput{Name: "Overlap", Number: 2, StartsOn: day(2026, 12, 1), EndsOn: day(2027, 3, 31)})
	require.ErrorIs(t, err, domain.ErrConflict)

	_, err = svc.CreateTerm(ctx, sess.ID, TermInput{Name: "Second Term", Number: 2, StartsOn: day(2027, 1, 5), EndsOn: day(2027, 3, 26)})
	require.NoError(t, err)

	// Term cannot go live before its session is ACTIVE.
	_, err = svc.SetTermStatus(ctx, t1.ID, school.TermActive)
	require.ErrorIs(t, err, domain.ErrConflict)

	_, err = svc.SetSessionStatus(ctx, sess.ID, school.SessionActive)
	require.NoError(t, err)
	_, err = svc.SetTermStatus(ctx, t1.ID, school.TermActive)
	require.NoError(t, err)

	// Only one ACTIVE term per session.
	terms, err := svc.ListTerms(ctx, sess.ID)
	require.NoError(t, err)
	require.Len(t, terms, 2)
	var second uuid.UUID
	for _, tm := range terms {
		if tm.Number == 2 {
			second = tm.ID
		}
	}
	_, err = svc.SetTermStatus(ctx, second, school.TermActive)
	require.ErrorIs(t, err, domain.ErrConflict)

	// Number uniqueness is enforced by the store on update.
	_, err = svc.UpdateTerm(ctx, second, TermInput{Name: "Second Term", Number: 1, StartsOn: day(2027, 1, 5), EndsOn: day(2027, 3, 26)})
	require.Error(t, err)

	// Closing the session closes every term still open.
	_, err = svc.SetSessionStatus(ctx, sess.ID, school.SessionClosed)
	require.NoError(t, err)
	t1After, err := svc.CurrentCalendar(ctx, nil)
	require.NoError(t, err) // no active session left in platform scope
	require.False(t, t1After.Active)
}

func TestSchoolCal_CurrentCalendar(t *testing.T) {
	ctx := context.Background()
	repo := memory.NewSchoolCalendarMemory()
	clock := day(2026, 9, 20)
	svc := NewSchoolCalendarService(repo).WithClock(func() time.Time { return clock })

	sess, err := svc.CreateSession(ctx, sessionInput())
	require.NoError(t, err)
	opens := day(2026, 9, 1)
	closes := day(2026, 9, 30)
	_, err = svc.CreateTerm(ctx, sess.ID, TermInput{
		Name: "First Term", Number: 1, StartsOn: day(2026, 9, 7), EndsOn: day(2026, 12, 11),
		EnrollmentOpensAt: &opens, EnrollmentClosesAt: &closes,
	})
	require.NoError(t, err)
	_, err = svc.CreateTerm(ctx, sess.ID, TermInput{Name: "Second Term", Number: 2, StartsOn: day(2027, 1, 5), EndsOn: day(2027, 3, 26)})
	require.NoError(t, err)

	// No ACTIVE session yet â†’ Active=false, no error.
	view, err := svc.CurrentCalendar(ctx, nil)
	require.NoError(t, err)
	require.False(t, view.Active)
	require.Empty(t, view.Terms)

	_, err = svc.SetSessionStatus(ctx, sess.ID, school.SessionActive)
	require.NoError(t, err)

	view, err = svc.CurrentCalendar(ctx, nil)
	require.NoError(t, err)
	require.True(t, view.Active)
	require.Equal(t, "2026/2027", view.Session.Name)
	require.Len(t, view.Terms, 2)
	// Terms are ordered by number; only the first has an explicit enrolment
	// window (open at "now"). The second has no window â†’ open-ended, same
	// semantics as cohort enrolment windows (migration 000060).
	require.Equal(t, 1, view.Terms[0].Number)
	require.True(t, view.Terms[0].EnrollmentOpen)
	require.True(t, view.Terms[1].EnrollmentOpen)

	// Institution-scoped calendars are independent of the platform scope.
	instView, err := svc.CurrentCalendar(ctx, &[]uuid.UUID{uuid.New()}[0])
	require.NoError(t, err)
	require.False(t, instView.Active)
}

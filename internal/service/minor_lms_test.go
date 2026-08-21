package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func dobAt(years int) *time.Time {
	d := time.Now().UTC().AddDate(-years, 0, -1)
	return &d
}

// TestMinorGating_Under15NeedsParent — the product policy: a self-owned
// learner under 15 cannot self-enroll without a linked parent/guardian.
func TestMinorGating_Under15NeedsParent(t *testing.T) {
	store := memory.NewMemoryStore()
	svc := NewBookingService(memory.NewMemoryUnitOfWorkFactory(store), store.StudentLinks, memory.NewTutorSubjectMemory(nil), NewAuditService(store.AuditLogs))

	actor := uuid.New()
	student := uuid.New()

	// Under 15, self-owned, NO parent link → forbidden.
	require.NoError(t, store.Students.Create(context.Background(), identityStudent{
		ID: student, UserID: &actor, FirstName: "Kemi", LastName: "Ade",
		DateOfBirth: dobAt(12),
	}.profile()))

	err := svc.authorizeEnrollment(context.Background(), student, actor)
	assert.ErrorIs(t, err, domain.ErrForbidden)

	// Same minor WITH a linked parent → allowed (parent-guided).
	parent := uuid.New()
	require.NoError(t, store.StudentLinks.Create(context.Background(), identityParentLink(parent, student)))
	err = svc.authorizeEnrollment(context.Background(), student, actor)
	// Self-owned minor with a linked parent passes via HasLinkedParent.
	assert.NoError(t, err)
}

// TestMinorGating_Over15SelfService — 15+ self-owned learners self-enroll.
func TestMinorGating_Over15SelfService(t *testing.T) {
	store := memory.NewMemoryStore()
	svc := NewBookingService(memory.NewMemoryUnitOfWorkFactory(store), store.StudentLinks, memory.NewTutorSubjectMemory(nil), NewAuditService(store.AuditLogs))

	actor := uuid.New()
	student := uuid.New()
	require.NoError(t, store.Students.Create(context.Background(), identityStudent{
		ID: student, UserID: &actor, FirstName: "Dara", LastName: "Ade",
		DateOfBirth: dobAt(15),
	}.profile()))

	err := svc.authorizeEnrollment(context.Background(), student, actor)
	assert.NoError(t, err)
}

// TestLMSStarterPack_EveryCohortGetsFunctionalLMS — assigning a tutor via the
// hook creates the recorded lesson, study resource, assignment and homework
// note exactly once (idempotent).
func TestLMSStarterPack_EveryCohortGetsFunctionalLMS(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	starter := NewLMSStarterService(store.Lessons, memory.NewResourceMemory(), store.Assignments, memory.NewLessonNoteMemory())
	resourcesMem := memory.NewResourceMemory()
	notesMem := memory.NewLessonNoteMemory()
	starter = NewLMSStarterService(store.Lessons, resourcesMem, store.Assignments, notesMem)

	cohortID := uuid.New()
	tutorID := uuid.New()

	require.NoError(t, starter.EnsureCohortPack(ctx, cohortID, tutorID, "IGCSE Maths — Sept"))

	lessons, err := store.Lessons.ListByCohort(ctx, cohortID, 50)
	require.NoError(t, err)
	require.Len(t, lessons, 1, "starter recorded lesson")
	require.NotNil(t, lessons[0].VideoURL, "lesson carries the demo video")

	resources, err := resourcesMem.ListByCohort(ctx, cohortID)
	require.NoError(t, err)
	assert.Len(t, resources, 1, "starter study resource")

	assignments, err := store.Assignments.ListByCohort(ctx, cohortID)
	require.NoError(t, err)
	assert.Len(t, assignments, 1, "starter assignment")

	notes, err := notesMem.ListByLesson(ctx, lessons[0].ID)
	require.NoError(t, err)
	assert.Len(t, notes, 1, "starter lesson note with homework")
	require.NotNil(t, notes[0].Homework)

	// Idempotent: second run adds nothing.
	require.NoError(t, starter.EnsureCohortPack(ctx, cohortID, tutorID, "IGCSE Maths — Sept"))
	lessons, _ = store.Lessons.ListByCohort(ctx, cohortID, 50)
	resources, _ = resourcesMem.ListByCohort(ctx, cohortID)
	assignments, _ = store.Assignments.ListByCohort(ctx, cohortID)
	assert.Len(t, lessons, 1)
	assert.Len(t, resources, 1)
	assert.Len(t, assignments, 1)
}

// ── helpers (avoid name collisions with the other test files) ─────────────

type identityStudent struct {
	ID          uuid.UUID
	UserID      *uuid.UUID
	FirstName   string
	LastName    string
	DateOfBirth *time.Time
}

func (s identityStudent) profile() *identity.StudentProfile {
	return &identity.StudentProfile{
		ID: s.ID, UserID: s.UserID, FirstName: s.FirstName, LastName: s.LastName,
		DateOfBirth: s.DateOfBirth, GuardianConsent: true, Timezone: "Africa/Lagos",
	}
}

func identityParentLink(parentID, studentID uuid.UUID) *identity.ParentStudentLink {
	return &identity.ParentStudentLink{
		ID: uuid.New(), ParentUserID: parentID, StudentProfileID: studentID, Relationship: "PARENT",
	}
}

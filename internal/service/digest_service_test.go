package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"ykay-virtual/internal/domain/digest"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/practice"
	"ykay-virtual/internal/repository/memory"
)

// --- fakes: embed the wide repo interfaces, override only what's used. ---

type fakeUserRepo struct {
	identity.UserRepository
	byID map[uuid.UUID]*identity.User
}

func (f fakeUserRepo) FindByID(_ context.Context, id uuid.UUID) (*identity.User, error) {
	return f.byID[id], nil
}

type fakeStudentRepo struct {
	identity.StudentProfileRepository
	byParent map[uuid.UUID][]identity.StudentProfile
}

func (f fakeStudentRepo) ListByParentUserID(_ context.Context, parentID uuid.UUID) ([]identity.StudentProfile, error) {
	return f.byParent[parentID], nil
}

type fakePracticeRepo struct {
	practice.Repository
	byStudent map[uuid.UUID][]practice.Attempt
}

func (f fakePracticeRepo) ListAttemptsByStudent(_ context.Context, studentID uuid.UUID, _ int) ([]practice.Attempt, error) {
	return f.byStudent[studentID], nil
}

type fakeMail struct {
	sent []string
	fail bool
}

func (m *fakeMail) Send(_ context.Context, to, _, _ string) error {
	if m.fail {
		return errors.New("mail down")
	}
	m.sent = append(m.sent, to)
	return nil
}

func ptr[T any](v T) *T { return &v }

func TestSummarize_CountsOnlyScoredAttemptsSince(t *testing.T) {
	since := time.Date(2026, 9, 20, 0, 0, 0, 0, time.UTC)
	attempts := []practice.Attempt{
		{SubmittedAt: ptr(since.Add(1 * time.Hour)), Score: ptr(80)},   // in window
		{SubmittedAt: ptr(since.Add(2 * time.Hour)), Score: ptr(90)},   // in window
		{SubmittedAt: ptr(since.Add(3 * time.Hour)), Score: ptr(70)},   // in window → avg 80
		{SubmittedAt: ptr(since.Add(-1 * time.Hour)), Score: ptr(100)}, // before window — excluded
		{SubmittedAt: ptr(since.Add(1 * time.Hour))},                   // no score — excluded
		{SubmittedAt: nil, Score: ptr(100)},                            // not submitted — excluded
	}
	count, avg := summarize(attempts, since)
	assert.Equal(t, 3, count)
	assert.Equal(t, 80, avg)
}

func TestDigestPrefs_DefaultEnabledWhenAbsent(t *testing.T) {
	svc := NewDigestService(memory.NewDigestMemory(), nil, nil, nil, nil, "")
	p, err := svc.GetPrefs(context.Background(), uuid.New())
	require.NoError(t, err)
	require.NotNil(t, p)
	assert.True(t, p.Enabled, "default is opted-in")
	assert.Nil(t, p.LastSentAt)
}

func TestDigestPrefs_SetEnabledPersists(t *testing.T) {
	svc := NewDigestService(memory.NewDigestMemory(), nil, nil, nil, nil, "")
	parent := uuid.New()
	require.NoError(t, svc.SetEnabled(context.Background(), parent, false))
	p, err := svc.GetPrefs(context.Background(), parent)
	require.NoError(t, err)
	assert.False(t, p.Enabled)
}

func TestSendDigests_OnlyEnabledParentsWithActivity(t *testing.T) {
	ctx := context.Background()
	prefs := memory.NewDigestMemory()
	active := uuid.New()
	idle := uuid.New()
	off := uuid.New()
	require.NoError(t, prefs.Upsert(ctx, &digest.Prefs{ParentUserID: active, Enabled: true}))
	require.NoError(t, prefs.Upsert(ctx, &digest.Prefs{ParentUserID: idle, Enabled: true}))
	require.NoError(t, prefs.Upsert(ctx, &digest.Prefs{ParentUserID: off, Enabled: false}))

	activeChild := uuid.New()
	idleChild := uuid.New()
	users := fakeUserRepo{byID: map[uuid.UUID]*identity.User{
		active: {ID: active, Email: "active@example.com", FirstName: "Ada"},
		idle:   {ID: idle, Email: "idle@example.com"},
		off:    {ID: off, Email: "off@example.com"},
	}}
	students := fakeStudentRepo{byParent: map[uuid.UUID][]identity.StudentProfile{
		active: {{ID: activeChild, FirstName: "Kiddo"}},
		idle:   {{ID: idleChild, FirstName: "Quiet"}},
		off:    {{ID: activeChild, FirstName: "Ignored"}},
	}}
	recent := time.Now().Add(-time.Hour)
	prac := fakePracticeRepo{byStudent: map[uuid.UUID][]practice.Attempt{
		activeChild: {{SubmittedAt: &recent, Score: ptr(75)}}, // only this child has activity
		idleChild:   {},
	}}
	mail := &fakeMail{}
	svc := NewDigestService(prefs, users, students, prac, mail, "https://yk.example")

	n, err := svc.SendDigests(ctx)
	require.NoError(t, err)
	assert.Equal(t, 1, n, "only the enabled parent with activity is emailed")
	require.Len(t, mail.sent, 1)
	assert.Equal(t, "active@example.com", mail.sent[0])

	// last_sent stamped only for the parent that was emailed.
	activePrefs, err := prefs.Get(ctx, active)
	require.NoError(t, err)
	require.NotNil(t, activePrefs.LastSentAt)
	idlePrefs, err := prefs.Get(ctx, idle)
	require.NoError(t, err)
	assert.Nil(t, idlePrefs.LastSentAt)
}

func TestSendDigests_SkipsParentWithoutEmail(t *testing.T) {
	ctx := context.Background()
	prefs := memory.NewDigestMemory()
	parent := uuid.New()
	child := uuid.New()
	require.NoError(t, prefs.Upsert(ctx, &digest.Prefs{ParentUserID: parent, Enabled: true}))
	users := fakeUserRepo{byID: map[uuid.UUID]*identity.User{parent: {ID: parent, Email: ""}}} // no email
	students := fakeStudentRepo{byParent: map[uuid.UUID][]identity.StudentProfile{parent: {{ID: child}}}}
	recent := time.Now().Add(-time.Hour)
	prac := fakePracticeRepo{byStudent: map[uuid.UUID][]practice.Attempt{child: {{SubmittedAt: &recent, Score: ptr(60)}}}}
	mail := &fakeMail{}
	svc := NewDigestService(prefs, users, students, prac, mail, "")

	n, err := svc.SendDigests(ctx)
	require.NoError(t, err)
	assert.Equal(t, 0, n)
	assert.Empty(t, mail.sent)
}

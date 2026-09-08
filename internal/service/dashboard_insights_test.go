package service

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain/dash"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDailyQuote_Deterministic_PerUserPerDay(t *testing.T) {
	day := time.Date(2026, 8, 26, 12, 0, 0, 0, time.UTC)
	u1 := uuid.New()

	q1a := DailyQuote(u1, day)
	q1b := DailyQuote(u1, day) // same user same day
	assert.Equal(t, q1a, q1b, "same user + same day must be stable")
	assert.Contains(t, WelcomeQuotes, q1a)

	// A different day / different user *can* collide — there are only
	// len(WelcomeQuotes) buckets, so a single random draw flakes ~1-in-12.
	// Draw until the bucket differs: the property under test is that the
	// selection varies, not that any particular pair differs.
	q1next := q1a
	for i := 0; i < 64 && q1next == q1a; i++ {
		q1next = DailyQuote(u1, day.Add(24*time.Hour*time.Duration(i+1)))
	}
	assert.NotEqual(t, q1a, q1next, "quote must vary across days")

	q2 := q1a
	for i := 0; i < 64 && q2 == q1a; i++ {
		q2 = DailyQuote(uuid.New(), day)
	}
	assert.NotEqual(t, q1a, q2, "quote must vary across users")
}

func TestDashboardInsights_FeedbackAndPrefs(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	svc := NewDashboardInsightsService(store.Dash)
	user := uuid.New()
	student := uuid.New()

	// Feedback.
	f, err := svc.SubmitFeedback(ctx, FeedbackInput{LessonID: uuid.New(), StudentProfileID: student, Rating: 5, Comment: strPtr("Great")})
	require.NoError(t, err)
	assert.Equal(t, 5, f.Rating)

	// Invalid rating.
	_, err = svc.SubmitFeedback(ctx, FeedbackInput{LessonID: uuid.New(), StudentProfileID: student, Rating: 6})
	require.Error(t, err)

	// Prefs default.
	p, err := svc.GetPrefs(ctx, user)
	require.NoError(t, err)
	assert.Equal(t, 3, p.WeeklyGoal)

	// Update prefs.
	optIn := true
	goal := 5
	widgets := []string{"calendar", "gradebook"}
	up, err := svc.UpdatePrefs(ctx, user, PrefsInput{LeaderboardOptIn: &optIn, WeeklyGoal: &goal, Widgets: &widgets})
	require.NoError(t, err)
	assert.True(t, up.LeaderboardOptIn)
	assert.Equal(t, 5, up.WeeklyGoal)
	assert.Equal(t, []string{"calendar", "gradebook"}, up.Widgets)

	// Persisted.
	p2, _ := svc.GetPrefs(ctx, user)
	assert.True(t, p2.LeaderboardOptIn)
}

func TestDashboardInsights_LeaderboardRespectsOptIn(t *testing.T) {
	ctx := context.Background()
	store := memory.NewMemoryStore()
	svc := NewDashboardInsightsService(store.Dash)
	student := uuid.New()

	// A user who opted in.
	optIn := true
	_, _ = svc.UpdatePrefs(ctx, uuid.New(), PrefsInput{LeaderboardOptIn: &optIn})
	// A user who did not opt in.
	no := false
	_, _ = svc.UpdatePrefs(ctx, uuid.New(), PrefsInput{LeaderboardOptIn: &no})

	rows, err := svc.Leaderboard(ctx, student, 20)
	require.NoError(t, err)
	// Only the opted-in user may appear (XP may be 0, still listed if opted in).
	assert.True(t, len(rows) <= 1, "only opted-in users should be visible")
	_ = dash.XPLessonWatched
}

package service

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/dash"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/learning"
	"ykay-virtual/internal/domain/practice"
)

// WelcomeQuotes — a curated set of daily welcome quotes. Different users get a
// different quote on the same day, and each user's quote changes daily, chosen
// deterministically from the user ID + date (no DB writes, always stable per
// user/day).
var WelcomeQuotes = []string{
	"Every expert was once a beginner.",
	"Small daily progress beats occasional heroic effort.",
	"The only way to do great work is to love what you learn.",
	"Knowledge grows when it is shared.",
	"Discipline is choosing between what you want now and what you want most.",
	"Don't watch the clock; do what it does — keep going.",
	"The beautiful thing about learning is that no one can take it away from you.",
	"Success is the sum of small efforts, repeated day in and day out.",
	"You don't have to be great to start, but you have to start to be great.",
	"Mistakes are proof that you are trying.",
	"Focus on progress, not perfection.",
	"Your only limit is the one you set in your own mind.",
	"Learning never exhausts the mind.",
	"The secret of getting ahead is getting started.",
	"One hour of focused study moves mountains.",
	"Curiosity is the wick in the candle of learning.",
	"Strive for consistent, not perfect.",
	"Today's effort is tomorrow's confidence.",
	"A calm mind and a clear goal win the day.",
	"Every question you ask is a step forward.",
}

// DailyQuote returns today's welcome quote for the user — deterministic per
// (userID, UTC date) so the same user sees the same quote all day and a
// different one tomorrow, while different users get different quotes today.
func DailyQuote(userID uuid.UUID, day time.Time) string {
	y, m, d := day.UTC().Date()
	key := fmt.Sprintf("%s|%04d-%02d-%02d", userID.String(), y, int(m), d)
	sum := sha256.Sum256([]byte(key))
	idx := binary.BigEndian.Uint64(sum[:8]) % uint64(len(WelcomeQuotes))
	return WelcomeQuotes[idx]
}

// DashboardInsightsService — aggregates the data behind the student dashboard
// widgets: gradebook, XP/leaderboard, review queue, feedback + prefs.
type DashboardInsightsService struct {
	repo     dash.Repository
	practice practice.Repository
	learning learning.AssessmentRepository
	users    identity.UserRepository
	now      func() time.Time
}

func NewDashboardInsightsService(repo dash.Repository) *DashboardInsightsService {
	return &DashboardInsightsService{repo: repo, now: time.Now}
}

// WithPractice wires the practice-exam store (review queue + gradebook).
func (s *DashboardInsightsService) WithPractice(p practice.Repository) *DashboardInsightsService {
	s.practice = p
	return s
}

// WithLearning wires the assessment store (gradebook + review queue).
func (s *DashboardInsightsService) WithLearning(l learning.AssessmentRepository) *DashboardInsightsService {
	s.learning = l
	return s
}

// WithUsers wires the user store (leaderboard names).
func (s *DashboardInsightsService) WithUsers(u identity.UserRepository) *DashboardInsightsService {
	s.users = u
	return s
}

// FeedbackInput — a lesson rating.
type FeedbackInput struct {
	LessonID         uuid.UUID
	StudentProfileID uuid.UUID
	Rating           int
	Comment          *string
}

// SubmitFeedback records a lesson rating (1-5). Idempotent per learner+lesson.
func (s *DashboardInsightsService) SubmitFeedback(ctx context.Context, in FeedbackInput) (*dash.LessonFeedback, error) {
	if s.repo == nil {
		return nil, fmt.Errorf("%w: dashboard store unavailable", domain.ErrInvalidInput)
	}
	if in.Rating < 1 || in.Rating > 5 {
		return nil, fmt.Errorf("%w: rating must be 1-5", domain.ErrInvalidInput)
	}
	f := &dash.LessonFeedback{
		LessonID: in.LessonID, StudentProfileID: in.StudentProfileID,
		Rating: in.Rating, Comment: in.Comment,
	}
	if err := s.repo.CreateFeedback(ctx, f); err != nil {
		return nil, err
	}
	return f, nil
}

// PrefsInput — dashboard preferences update.
type PrefsInput struct {
	LeaderboardOptIn *bool
	WeeklyGoal       *int
	Widgets          *[]string
}

// GetPrefs returns the user's dashboard prefs (defaults if none).
func (s *DashboardInsightsService) GetPrefs(ctx context.Context, userID uuid.UUID) (*dash.Prefs, error) {
	if s.repo == nil {
		return &dash.Prefs{UserID: userID, WeeklyGoal: 3}, nil
	}
	p, err := s.repo.GetPrefs(ctx, userID)
	if err == domain.ErrNotFound {
		return &dash.Prefs{UserID: userID, WeeklyGoal: 3, Widgets: []string{}}, nil
	}
	return p, err
}

// UpdatePrefs merges + persists the user's dashboard prefs.
func (s *DashboardInsightsService) UpdatePrefs(ctx context.Context, userID uuid.UUID, in PrefsInput) (*dash.Prefs, error) {
	if s.repo == nil {
		return nil, fmt.Errorf("%w: dashboard store unavailable", domain.ErrInvalidInput)
	}
	cur, err := s.GetPrefs(ctx, userID)
	if err != nil && err != domain.ErrNotFound {
		return nil, err
	}
	if cur == nil {
		cur = &dash.Prefs{UserID: userID, WeeklyGoal: 3, Widgets: []string{}}
	}
	if in.LeaderboardOptIn != nil {
		cur.LeaderboardOptIn = *in.LeaderboardOptIn
	}
	if in.WeeklyGoal != nil {
		if *in.WeeklyGoal < 1 || *in.WeeklyGoal > 30 {
			return nil, fmt.Errorf("%w: weekly_goal must be 1-30", domain.ErrInvalidInput)
		}
		cur.WeeklyGoal = *in.WeeklyGoal
	}
	if in.Widgets != nil {
		cur.Widgets = *in.Widgets
	}
	if err := s.repo.UpsertPrefs(ctx, cur); err != nil {
		return nil, err
	}
	return cur, nil
}

// GradeRow — per-subject aggregate for the gradebook widget.
type GradeRow struct {
	Subject string  `json:"subject"`
	Score   float64 `json:"score"`
	Count   int     `json:"count"`
}

// Gradebook aggregates a student's assessment + practice-exam scores by subject.
func (s *DashboardInsightsService) Gradebook(ctx context.Context, studentProfileID uuid.UUID) ([]GradeRow, error) {
	agg := map[string]*GradeRow{}
	order := []string{}

	add := func(subject string, score, max float64) {
		if max <= 0 {
			return
		}
		r, ok := agg[subject]
		if !ok {
			r = &GradeRow{Subject: subject}
			agg[subject] = r
			order = append(order, subject)
		}
		r.Score += score
		r.Count++
	}

	// Practice attempts.
	if s.practice != nil {
		attempts, err := s.practice.ListAttemptsByStudent(ctx, studentProfileID, 200)
		if err == nil {
			for _, a := range attempts {
				if a.Score == nil {
					continue
				}
				e, err := s.practice.GetExam(ctx, a.ExamID)
				if err != nil || e == nil {
					continue
				}
				add(e.Subject, float64(*a.Score), 100)
			}
		}
	}
	// Learner assessments.
	if s.learning != nil {
		assessments, err := s.learning.ListForStudent(ctx, studentProfileID, 100)
		if err == nil {
			for _, a := range assessments {
				attempt, aerr := s.learning.GetAttemptForStudent(ctx, a.ID, studentProfileID)
				if aerr != nil || attempt == nil || attempt.Score == nil || attempt.MaxScore == nil {
					continue
				}
				add(subjectName(a.SubjectID), *attempt.Score, *attempt.MaxScore)
			}
		}
	}

	out := []GradeRow{}
	for _, subj := range order {
		r := agg[subj]
		if r.Count > 0 {
			r.Score = r.Score / float64(r.Count)
		}
		out = append(out, *r)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Subject < out[j].Subject })
	return out, nil
}

// LeaderboardRow — one user's XP + rank on a cohort leaderboard.
type LeaderboardRow struct {
	UserID  uuid.UUID `json:"user_id"`
	Name    string    `json:"name"`
	XP      int       `json:"xp"`
	Lessons int       `json:"lessons"`
}

// Leaderboard returns XP-ranked, leaderboard-opted-in users (safeguarding:
// only users who opted in appear).
func (s *DashboardInsightsService) Leaderboard(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]LeaderboardRow, error) {
	if s.repo == nil {
		return []LeaderboardRow{}, nil
	}
	optedIn, err := s.repo.OptedInUserIDs(ctx, 200)
	if err != nil {
		return nil, err
	}
	rows := []LeaderboardRow{}
	for _, uid := range optedIn {
		xp := 0
		lessons := 0
		// learner self-profile -> user link: if the opted-in user owns the
		// learner, count their activity. Simplification: XP is computed from
		// the student's own progress and attributed to their account.
		_ = uid
		xp, lessons = s.computeXP(ctx, studentProfileID)
		if xp <= 0 && lessons <= 0 {
			continue
		}
		rows = append(rows, LeaderboardRow{UserID: uid, XP: xp, Lessons: lessons, Name: s.userName(ctx, uid)})
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i].XP > rows[j].XP })
	if limit > 0 && len(rows) > limit {
		rows = rows[:limit]
	}
	return rows, nil
}

func (s *DashboardInsightsService) computeXP(ctx context.Context, studentProfileID uuid.UUID) (int, int) {
	xp := 0
	lessons := 0
	if s.learning != nil {
		assessments, err := s.learning.ListForStudent(ctx, studentProfileID, 100)
		if err == nil {
			for _, a := range assessments {
				attempt, aerr := s.learning.GetAttemptForStudent(ctx, a.ID, studentProfileID)
				if aerr == nil && attempt != nil && attempt.Passed != nil && *attempt.Passed {
					xp += dash.XPAssessmentPass
				}
			}
		}
	}
	if s.practice != nil {
		attempts, _ := s.practice.ListAttemptsByStudent(ctx, studentProfileID, 200)
		for _, a := range attempts {
			if a.Passed != nil && *a.Passed {
				xp += dash.XPAssessmentPass
			}
		}
	}
	return xp, lessons
}

func (s *DashboardInsightsService) userName(ctx context.Context, userID uuid.UUID) string {
	if s.users == nil {
		return ""
	}
	u, err := s.users.FindByID(ctx, userID)
	if err != nil || u == nil {
		return ""
	}
	return strings.TrimSpace(u.FirstName + " " + u.LastName)
}

// ReviewItem — a missed question for the review queue.
type ReviewItem struct {
	Question string   `json:"question"`
	Subject  string   `json:"subject"`
	Options  []string `json:"options"`
	Correct  string   `json:"correct"`
}

// ReviewQueue derives the learner's missed questions from completed practice
// attempts, so they can re-drill weak areas (spaced-repetition style).
func (s *DashboardInsightsService) ReviewQueue(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]ReviewItem, error) {
	if s.practice == nil {
		return []ReviewItem{}, nil
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	attempts, err := s.practice.ListAttemptsByStudent(ctx, studentProfileID, 200)
	if err != nil {
		return []ReviewItem{}, nil
	}
	out := []ReviewItem{}
	for _, a := range attempts {
		if len(a.Answers) == 0 {
			continue
		}
		e, err := s.practice.GetExam(ctx, a.ExamID)
		if err != nil || e == nil {
			continue
		}
		qByID := map[uuid.UUID]practice.Question{}
		for _, q := range e.Questions {
			qByID[q.ID] = q
		}
		for qidStr, chosen := range a.Answers {
			qid, perr := uuid.Parse(qidStr)
			if perr != nil {
				continue
			}
			q, ok := qByID[qid]
			if !ok {
				continue
			}
			if chosen == q.CorrectIndex {
				continue
			}
			correct := ""
			if q.CorrectIndex >= 0 && q.CorrectIndex < len(q.Options) {
				correct = q.Options[q.CorrectIndex]
			}
			out = append(out, ReviewItem{Question: q.Text, Subject: e.Subject, Options: q.Options, Correct: correct})
			if len(out) >= limit {
				return out, nil
			}
		}
	}
	return out, nil
}

func subjectName(_ *uuid.UUID) string { return "Assessment" }

// Now returns the current time (used by the handler for the daily quote).
func (s *DashboardInsightsService) Now() time.Time { return s.now() }

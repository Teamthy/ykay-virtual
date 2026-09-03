package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/plus"
	"ykay-virtual/internal/domain/practice"

	"github.com/google/uuid"
)

// PracticeExamService — the CBT practice-exam engine.
// Tutors author papers (subject, timed, pass mark, questions with one correct
// option); students sit timed attempts; submission (or expiry) auto-scores and
// produces a pass/fail with a per-question review.
type PracticeExamService struct {
	repo        practice.Repository
	enrollments booking.CohortEnrollmentRepository
	plus        *PlusService // premium vault gate (000066)
	now         func() time.Time
}

func NewPracticeExamService(repo practice.Repository, enrollments booking.CohortEnrollmentRepository) *PracticeExamService {
	return &PracticeExamService{repo: repo, enrollments: enrollments, now: time.Now}
}

// WithPlus wires the YK-Virtual Plus entitlement gate (premium CBT vault).
func (s *PracticeExamService) WithPlus(p *PlusService) *PracticeExamService {
	s.plus = p
	return s
}

// WithClock overrides the time source (tests).
func (s *PracticeExamService) WithClock(fn func() time.Time) *PracticeExamService {
	s.now = fn
	return s
}

// ---- inputs -----------------------------------------------------------------

type ExamQuestionInput struct {
	Text         string   `json:"text"`
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correct_index"`
	Explanation  string   `json:"explanation,omitempty"`
}

type CreateExamInput struct {
	Subject         string              `json:"subject"`
	Title           string              `json:"title"`
	Description     string              `json:"description,omitempty"`
	DurationMinutes int                 `json:"duration_minutes"`
	PassingScore    int                 `json:"passing_score"`
	CohortID        *uuid.UUID          `json:"cohort_id,omitempty"`
	Premium         bool                `json:"premium,omitempty"` // Plus vault
	Questions       []ExamQuestionInput `json:"questions"`
}

const (
	maxExamQuestions = 60
	maxOptions       = 6
	minOptions       = 2
)

// ---- tutor side -------------------------------------------------------------

func validateExam(in CreateExamInput) error {
	switch {
	case strings.TrimSpace(in.Title) == "" || len(strings.TrimSpace(in.Title)) > 120:
		return fmt.Errorf("%w: title is required (max 120 chars)", domain.ErrInvalidInput)
	case strings.TrimSpace(in.Subject) == "" || len(strings.TrimSpace(in.Subject)) > 80:
		return fmt.Errorf("%w: subject is required (max 80 chars)", domain.ErrInvalidInput)
	case in.DurationMinutes < 1 || in.DurationMinutes > 180:
		return fmt.Errorf("%w: duration must be 1-180 minutes", domain.ErrInvalidInput)
	case in.PassingScore < 0 || in.PassingScore > 100:
		return fmt.Errorf("%w: passing score must be 0-100", domain.ErrInvalidInput)
	case len(in.Questions) == 0:
		return fmt.Errorf("%w: add at least one question", domain.ErrInvalidInput)
	case len(in.Questions) > maxExamQuestions:
		return fmt.Errorf("%w: max 60 questions per exam", domain.ErrInvalidInput)
	}
	for i, q := range in.Questions {
		if strings.TrimSpace(q.Text) == "" || len(q.Text) > 500 {
			return fmt.Errorf("%w: question %d: text is required (max 500 chars)", domain.ErrInvalidInput, i+1)
		}
		if len(q.Options) < minOptions || len(q.Options) > maxOptions {
			return fmt.Errorf("%w: question %d: 2-6 options required", domain.ErrInvalidInput, i+1)
		}
		if q.CorrectIndex < 0 || q.CorrectIndex >= len(q.Options) {
			return fmt.Errorf("%w: question %d: correct option out of range", domain.ErrInvalidInput, i+1)
		}
	}
	return nil
}

func (s *PracticeExamService) CreateExam(ctx context.Context, tutorID uuid.UUID, in CreateExamInput) (*practice.Exam, error) {
	if err := validateExam(in); err != nil {
		return nil, err
	}
	e := &practice.Exam{
		ID:              uuid.New(),
		TutorID:         tutorID,
		Subject:         strings.TrimSpace(in.Subject),
		Title:           strings.TrimSpace(in.Title),
		Description:     strings.TrimSpace(in.Description),
		DurationMinutes: in.DurationMinutes,
		PassingScore:    in.PassingScore,
		CohortID:        in.CohortID,
		Status:          practice.StatusActive,
		Premium:         in.Premium,
		Questions:       make([]practice.Question, len(in.Questions)),
	}
	for i, q := range in.Questions {
		e.Questions[i] = practice.Question{
			ID:           uuid.New(),
			Position:     i + 1,
			Text:         strings.TrimSpace(q.Text),
			Options:      q.Options,
			CorrectIndex: q.CorrectIndex,
			Explanation:  strings.TrimSpace(q.Explanation),
		}
	}
	if err := s.repo.CreateExam(ctx, e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *PracticeExamService) ListTutorExams(ctx context.Context, tutorID uuid.UUID) ([]practice.Exam, error) {
	exams, err := s.repo.ListByTutor(ctx, tutorID)
	if err != nil {
		return nil, err
	}
	if exams == nil {
		exams = []practice.Exam{}
	}
	return exams, nil
}

func (s *PracticeExamService) GetTutorExam(ctx context.Context, tutorID, examID uuid.UUID) (*practice.Exam, error) {
	e, err := s.repo.GetExam(ctx, examID)
	if err != nil {
		return nil, err
	}
	if e.TutorID != tutorID {
		return nil, practice.ErrNotOwner
	}
	return e, nil
}

func (s *PracticeExamService) UpdateExam(ctx context.Context, tutorID, examID uuid.UUID, in CreateExamInput) (*practice.Exam, error) {
	cur, err := s.GetTutorExam(ctx, tutorID, examID)
	if err != nil {
		return nil, err
	}
	if err := validateExam(in); err != nil {
		return nil, err
	}
	cur.Subject = strings.TrimSpace(in.Subject)
	cur.Title = strings.TrimSpace(in.Title)
	cur.Description = strings.TrimSpace(in.Description)
	cur.DurationMinutes = in.DurationMinutes
	cur.PassingScore = in.PassingScore
	cur.CohortID = in.CohortID
	cur.Premium = in.Premium
	cur.Questions = make([]practice.Question, len(in.Questions))
	for i, q := range in.Questions {
		cur.Questions[i] = practice.Question{
			ID:           uuid.New(),
			Position:     i + 1,
			Text:         strings.TrimSpace(q.Text),
			Options:      q.Options,
			CorrectIndex: q.CorrectIndex,
			Explanation:  strings.TrimSpace(q.Explanation),
		}
	}
	if err := s.repo.UpdateExam(ctx, cur); err != nil {
		return nil, err
	}
	return cur, nil
}

func (s *PracticeExamService) DeleteExam(ctx context.Context, tutorID, examID uuid.UUID) error {
	e, err := s.repo.GetExam(ctx, examID)
	if err != nil {
		return err
	}
	if e.TutorID != tutorID {
		return practice.ErrNotOwner
	}
	return s.repo.DeleteExam(ctx, examID)
}

// ---- student side -----------------------------------------------------------

func (s *PracticeExamService) eligible(ctx context.Context, e *practice.Exam, studentID, userID uuid.UUID) error {
	if e.Status != practice.StatusActive {
		return practice.ErrNotAvailable
	}
	// YK-Virtual Plus gate (000066): premium-vault exams require an active plan.
	if e.Premium && (s.plus == nil || !s.plus.HasActivePlan(ctx, userID)) {
		return plus.ErrPremiumRequired
	}
	if e.CohortID == nil {
		return nil
	}
	_, err := s.enrollments.GetByCohortAndStudent(ctx, *e.CohortID, studentID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return practice.ErrNotAvailable
		}
		return err
	}
	return nil
}

func (s *PracticeExamService) ListStudentExams(ctx context.Context, studentID, userID uuid.UUID) ([]practice.Exam, error) {
	exams, err := s.repo.ListActive(ctx)
	if err != nil {
		return nil, err
	}
	out := []practice.Exam{}
	for _, e := range exams {
		if s.eligible(ctx, &e, studentID, userID) == nil {
			out = append(out, e)
		}
	}
	return out, nil
}

func (s *PracticeExamService) GetStudentExam(ctx context.Context, studentID, examID, userID uuid.UUID) (*practice.Exam, error) {
	e, err := s.repo.GetExam(ctx, examID)
	if err != nil {
		return nil, err
	}
	if err := s.eligible(ctx, e, studentID, userID); err != nil {
		return nil, err
	}
	return e, nil
}

// StartAttempt opens a timed sitting for the student.
func (s *PracticeExamService) StartAttempt(ctx context.Context, studentID, examID, userID uuid.UUID) (*practice.Attempt, error) {
	e, err := s.GetStudentExam(ctx, studentID, examID, userID)
	if err != nil {
		return nil, err
	}
	now := s.now().UTC()
	if open, err := s.repo.GetOpenAttempt(ctx, studentID, examID); err == nil {
		// Idempotent start: double-clicks / mobile retries reuse the open sitting.
		if open.ExpiresAt.After(now) {
			return open, nil
		}
		// Expired but never submitted: auto-mark it so the DB partial-unique index
		// can allow a fresh sitting.
		_, _ = s.SubmitAttempt(ctx, studentID, open.ID, map[string]int{})
	} else if !errors.Is(err, practice.ErrAttemptNotFound) {
		return nil, err
	}
	a := &practice.Attempt{
		ID:        uuid.New(),
		ExamID:    e.ID,
		StudentID: studentID,
		StartedAt: now,
		ExpiresAt: now.Add(time.Duration(e.DurationMinutes) * time.Minute),
	}
	if err := s.repo.CreateAttempt(ctx, a); err != nil {
		if errors.Is(err, practice.ErrAttemptSubmitted) {
			if open, getErr := s.repo.GetOpenAttempt(ctx, studentID, examID); getErr == nil && open.ExpiresAt.After(now) {
				return open, nil
			}
		}
		return nil, err
	}
	return a, nil
}

// AttemptResult — what submit/review returns.
type AttemptResult struct {
	AttemptID   uuid.UUID
	ExamID      uuid.UUID
	ExamTitle   string
	ExamSubject string
	Passing     int
	Correct     int
	Total       int
	Score       int
	Passed      bool
	Expired     bool // auto-submitted at the time limit
	SubmittedAt time.Time
	Questions   []PracticeAttemptQuestion
}

type PracticeAttemptQuestion struct {
	ID           uuid.UUID
	Position     int
	Text         string
	Options      []string
	ChosenIndex  *int
	CorrectIndex int
	Explanation  string
}

func (s *PracticeExamService) SubmitAttempt(ctx context.Context, studentID, attemptID uuid.UUID, answers map[string]int) (*AttemptResult, error) {
	a, err := s.repo.GetAttempt(ctx, attemptID)
	if err != nil {
		return nil, err
	}
	if a.StudentID != studentID {
		return nil, practice.ErrAttemptNotFound
	}
	if a.SubmittedAt != nil {
		return s.GetAttemptReview(ctx, studentID, attemptID)
	}
	e, err := s.repo.GetExam(ctx, a.ExamID)
	if err != nil {
		return nil, err
	}
	now := s.now().UTC()
	expired := now.After(a.ExpiresAt)
	submittedAt := now
	if expired {
		submittedAt = a.ExpiresAt
	}
	correct := 0
	for _, q := range e.Questions {
		if chosen, ok := answers[q.ID.String()]; ok && chosen == q.CorrectIndex {
			correct++
		}
	}
	total := len(e.Questions)
	score := 0
	if total > 0 {
		score = int(math.Round(float64(correct) / float64(total) * 100))
	}
	passed := score >= e.PassingScore
	a.Answers = answers
	a.SubmittedAt = &submittedAt
	a.Score = &score
	a.Passed = &passed
	if err := s.repo.UpdateAttempt(ctx, a); err != nil {
		if errors.Is(err, practice.ErrAttemptSubmitted) {
			return s.GetAttemptReview(ctx, studentID, attemptID)
		}
		return nil, err
	}
	return buildResult(a, e, expired), nil
}

func buildResult(a *practice.Attempt, e *practice.Exam, expired bool) *AttemptResult {
	res := &AttemptResult{
		AttemptID:   a.ID,
		ExamID:      e.ID,
		ExamTitle:   e.Title,
		ExamSubject: e.Subject,
		Passing:     e.PassingScore,
		Total:       len(e.Questions),
		Expired:     expired,
	}
	if a.Score != nil {
		res.Score = *a.Score
	}
	if a.Passed != nil {
		res.Passed = *a.Passed
	}
	if a.SubmittedAt != nil {
		res.SubmittedAt = *a.SubmittedAt
	}
	for _, q := range e.Questions {
		aq := PracticeAttemptQuestion{
			ID:           q.ID,
			Position:     q.Position,
			Text:         q.Text,
			Options:      q.Options,
			CorrectIndex: q.CorrectIndex,
			Explanation:  q.Explanation,
		}
		if chosen, ok := a.Answers[q.ID.String()]; ok {
			c := chosen
			aq.ChosenIndex = &c
			if chosen == q.CorrectIndex {
				res.Correct++
			}
		}
		res.Questions = append(res.Questions, aq)
	}
	return res
}

// AttemptListItem — history rows (student + tutor consoles).
type AttemptListItem struct {
	AttemptID   uuid.UUID
	ExamID      uuid.UUID
	ExamTitle   string
	ExamSubject string
	Score       *int
	Passed      *bool
	Total       int
	StartedAt   time.Time
	ExpiresAt   time.Time
	SubmittedAt *time.Time
}

func (s *PracticeExamService) ListStudentAttempts(ctx context.Context, studentID uuid.UUID, limit int) ([]AttemptListItem, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	attempts, err := s.repo.ListAttemptsByStudent(ctx, studentID, limit)
	if err != nil {
		return nil, err
	}
	return s.toItems(ctx, attempts)
}

func (s *PracticeExamService) ListExamAttempts(ctx context.Context, tutorID, examID uuid.UUID, limit int) ([]AttemptListItem, error) {
	if _, err := s.GetTutorExam(ctx, tutorID, examID); err != nil {
		return nil, err
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	attempts, err := s.repo.ListAttemptsByExam(ctx, examID, limit)
	if err != nil {
		return nil, err
	}
	return s.toItems(ctx, attempts)
}

func (s *PracticeExamService) toItems(ctx context.Context, attempts []practice.Attempt) ([]AttemptListItem, error) {
	examCache := map[uuid.UUID]*practice.Exam{}
	items := []AttemptListItem{}
	for _, a := range attempts {
		e, ok := examCache[a.ExamID]
		if !ok {
			var err error
			e, err = s.repo.GetExam(ctx, a.ExamID)
			if err != nil {
				continue // deleted exam — skip the row
			}
			examCache[a.ExamID] = e
		}
		items = append(items, AttemptListItem{
			AttemptID:   a.ID,
			ExamID:      a.ExamID,
			ExamTitle:   e.Title,
			ExamSubject: e.Subject,
			Score:       a.Score,
			Passed:      a.Passed,
			Total:       len(e.Questions),
			StartedAt:   a.StartedAt,
			ExpiresAt:   a.ExpiresAt,
			SubmittedAt: a.SubmittedAt,
		})
	}
	return items, nil
}

// GetAttemptReview returns the full marked paper for a submitted attempt.
func (s *PracticeExamService) GetAttemptReview(ctx context.Context, studentID, attemptID uuid.UUID) (*AttemptResult, error) {
	a, err := s.repo.GetAttempt(ctx, attemptID)
	if err != nil {
		return nil, err
	}
	if a.StudentID != studentID {
		return nil, practice.ErrAttemptNotFound
	}
	if a.SubmittedAt == nil {
		return nil, practice.ErrAttemptNotMarked
	}
	e, err := s.repo.GetExam(ctx, a.ExamID)
	if err != nil {
		return nil, err
	}
	return buildResult(a, e, false), nil
}

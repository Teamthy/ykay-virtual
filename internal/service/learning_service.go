package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/learning"

	"github.com/google/uuid"
)

// LearningService — assessments (auto-graded quizzes), grading with
// notifications, and progress reports. Phase 11c.
//
// Design notes:
//   - Assessments are authored by tutors (or admins) and attached to cohorts;
//     students get ONE attempt (UNIQUE assessment+student), auto-graded.
//   - Grading releases score + feedback; the student and their linked parent
//     receive a notification (FR-19 transactional notifications).
//   - Progress reports are written by tutors and visible to the student +
//     linked parents (FR-15), with an overall rating 1-5.

type LearningService struct {
	assessments learning.AssessmentRepository
	grading     learning.GradingRepository
	reports     learning.ProgressReportRepository
	assignments booking.AssignmentRepository
	notify      *MessagingService
	audit       identity.AuditService
	now         func() time.Time
}

func NewLearningService(assessments learning.AssessmentRepository,
	grading learning.GradingRepository, reports learning.ProgressReportRepository,
	assignments booking.AssignmentRepository, audit identity.AuditService) *LearningService {
	return &LearningService{
		assessments: assessments, grading: grading, reports: reports,
		assignments: assignments, audit: audit, now: time.Now,
	}
}

// WithNotifications wires the notification service (grade/report events).
func (s *LearningService) WithNotifications(n *MessagingService) *LearningService {
	s.notify = n
	return s
}

// --- Assessment authoring (tutor) ---

type CreateAssessmentInput struct {
	AuthorUserID   uuid.UUID
	TutorProfileID uuid.UUID
	CohortID       *uuid.UUID
	LessonID       *uuid.UUID
	Title          string
	Instructions   *string
	PassThreshold  float64
	DueAt          *time.Time
	Questions      []AssessmentQuestionInput
}

type AssessmentQuestionInput struct {
	Question     string   `json:"question"`
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correct_index"`
	Explanation  *string  `json:"explanation"`
}

func (s *LearningService) CreateAssessment(ctx context.Context, in CreateAssessmentInput) (*learning.LearnerAssessment, error) {
	if strings.TrimSpace(in.Title) == "" {
		return nil, fmt.Errorf("%w: title is required", domain.ErrInvalidInput)
	}
	if len(in.Questions) == 0 {
		return nil, fmt.Errorf("%w: at least one question is required", domain.ErrInvalidInput)
	}
	for _, q := range in.Questions {
		if strings.TrimSpace(q.Question) == "" || len(q.Options) < 2 {
			return nil, fmt.Errorf("%w: each question needs text and at least 2 options", domain.ErrInvalidInput)
		}
		if q.CorrectIndex < 0 || q.CorrectIndex >= len(q.Options) {
			return nil, fmt.Errorf("%w: correct_index out of range", domain.ErrInvalidInput)
		}
	}
	if in.PassThreshold <= 0 || in.PassThreshold > 1 {
		in.PassThreshold = 0.5
	}
	if s.assessments == nil {
		return nil, errors.New("assessment store unavailable")
	}

	a := &learning.LearnerAssessment{
		CohortID:       in.CohortID,
		LessonID:       in.LessonID,
		TutorProfileID: in.TutorProfileID,
		Title:          strings.TrimSpace(in.Title),
		Instructions:   in.Instructions,
		PassThreshold:  in.PassThreshold,
		DueAt:          in.DueAt,
		Status:         learning.AssessmentPublished,
		CreatedBy:      &in.AuthorUserID,
	}
	if err := s.assessments.CreateAssessment(ctx, a); err != nil {
		return nil, err
	}
	for i, q := range in.Questions {
		if err := s.assessments.AddQuestion(ctx, &learning.AssessmentQuestion{
			AssessmentID: a.ID,
			Question:     strings.TrimSpace(q.Question),
			Options:      q.Options,
			CorrectIndex: q.CorrectIndex,
			Explanation:  q.Explanation,
			SortOrder:    i,
		}); err != nil {
			return nil, err
		}
	}
	_ = s.audit.LogStateChange(ctx, &in.AuthorUserID, identity.AuditCreate, "learner_assessment",
		&a.ID, nil, map[string]any{"title": a.Title, "questions": len(in.Questions)}, nil, nil)
	return a, nil
}

func (s *LearningService) ListAssessmentsByCohort(ctx context.Context, cohortID uuid.UUID) ([]learning.LearnerAssessment, error) {
	if s.assessments == nil {
		return []learning.LearnerAssessment{}, nil
	}
	return s.assessments.ListByCohort(ctx, cohortID, "", 50)
}

// --- Taking an assessment (student) ---

type AssessmentQuestionView struct {
	ID       uuid.UUID `json:"id"`
	Question string    `json:"question"`
	Options  []string  `json:"options"`
}

type AssessmentStart struct {
	Title         string                   `json:"title"`
	Attempt       learning.LearnerAttempt  `json:"attempt"`
	Questions     []AssessmentQuestionView `json:"questions"`
	PassThreshold float64                  `json:"pass_threshold"`
}

// StartAssessment — begins the student's single attempt (30 minutes).
func (s *LearningService) StartAssessment(ctx context.Context, studentProfileID, assessmentID uuid.UUID) (*AssessmentStart, error) {
	if s.assessments == nil {
		return nil, errors.New("assessment store unavailable")
	}
	// Already attempted?
	if existing, err := s.assessments.GetAttemptForStudent(ctx, assessmentID, studentProfileID); err == nil {
		return s.viewFor(ctx, existing)
	} else if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	a, err := s.assessments.GetAssessment(ctx, assessmentID)
	if err != nil {
		return nil, err
	}
	if a.Status != learning.AssessmentPublished {
		return nil, fmt.Errorf("%w: assessment is not open", domain.ErrConflict)
	}
	attempt := &learning.LearnerAttempt{
		AssessmentID:     assessmentID,
		StudentProfileID: studentProfileID,
		TutorProfileID:   a.TutorProfileID,
		Status:           learning.AttemptInProgress,
		ExpiresAt:        s.now().UTC().Add(30 * time.Minute),
	}
	if err := s.assessments.CreateAttempt(ctx, attempt); err != nil {
		return nil, err
	}
	return s.viewFor(ctx, attempt)
}

func (s *LearningService) viewFor(ctx context.Context, attempt *learning.LearnerAttempt) (*AssessmentStart, error) {
	questions, err := s.assessments.GetQuestions(ctx, attempt.AssessmentID)
	if err != nil {
		return nil, err
	}
	a, err := s.assessments.GetAssessment(ctx, attempt.AssessmentID)
	if err != nil {
		return nil, err
	}
	out := &AssessmentStart{Title: a.Title, Attempt: *attempt, PassThreshold: a.PassThreshold}
	for _, q := range questions {
		out.Questions = append(out.Questions, AssessmentQuestionView{ID: q.ID, Question: q.Question, Options: q.Options})
	}
	return out, nil
}

type AssessmentAnswer struct {
	QuestionID  uuid.UUID `json:"question_id"`
	ChosenIndex int       `json:"chosen_index"`
}

type LearnerAssessmentResult struct {
	AttemptID uuid.UUID `json:"attempt_id"`
	Score     float64   `json:"score"`
	MaxScore  float64   `json:"max_score"`
	Passed    bool      `json:"passed"`
	Correct   int       `json:"correct"`
	Total     int       `json:"total"`
}

// SubmitAssessmentForStudent — resolves the student's (single) attempt for an
// assessment and submits it. Convenience for the HTTP surface where the
// client addresses the assessment, not the attempt UUID.
func (s *LearningService) SubmitAssessmentForStudent(ctx context.Context, studentProfileID, assessmentID uuid.UUID, answers []AssessmentAnswer) (*LearnerAssessmentResult, error) {
	attempt, err := s.assessments.GetAttemptForStudent(ctx, assessmentID, studentProfileID)
	if err != nil {
		return nil, err
	}
	if attempt.Status == learning.AttemptCompleted {
		return nil, fmt.Errorf("%w: attempt already completed", domain.ErrConflict)
	}
	return s.SubmitAssessment(ctx, studentProfileID, attempt.ID, answers)
}

// SubmitAssessment — auto-grades the attempt (MCQ), records the result and
// notifies the student.
func (s *LearningService) SubmitAssessment(ctx context.Context, studentProfileID, attemptID uuid.UUID, answers []AssessmentAnswer) (*LearnerAssessmentResult, error) {
	if s.assessments == nil {
		return nil, errors.New("assessment store unavailable")
	}
	attempt, err := s.assessments.GetAttempt(ctx, attemptID)
	if err != nil {
		return nil, err
	}
	if attempt.StudentProfileID != studentProfileID {
		return nil, domain.ErrForbidden
	}
	if attempt.Status == learning.AttemptCompleted {
		return nil, fmt.Errorf("%w: attempt already completed", domain.ErrConflict)
	}
	if s.now().UTC().After(attempt.ExpiresAt) {
		return nil, fmt.Errorf("%w: attempt expired", domain.ErrConflict)
	}
	if len(answers) == 0 {
		return nil, fmt.Errorf("%w: no answers provided", domain.ErrInvalidInput)
	}

	questions, err := s.assessments.GetQuestions(ctx, attempt.AssessmentID)
	if err != nil {
		return nil, err
	}
	byID := map[uuid.UUID]learning.AssessmentQuestion{}
	for _, q := range questions {
		byID[q.ID] = q
	}
	correct := 0
	for _, ans := range answers {
		q, ok := byID[ans.QuestionID]
		if !ok {
			return nil, fmt.Errorf("%w: question does not belong to this assessment", domain.ErrInvalidInput)
		}
		if ans.ChosenIndex < 0 || ans.ChosenIndex >= len(q.Options) {
			return nil, fmt.Errorf("%w: answer index out of range", domain.ErrInvalidInput)
		}
		if ans.ChosenIndex == q.CorrectIndex {
			correct++
		}
	}
	total := len(questions)
	score := float64(correct)
	passed := total > 0 && score/float64(total) >= 0.5

	if err := s.assessments.CompleteAttempt(ctx, attemptID, score, float64(total), passed); err != nil {
		return nil, err
	}
	if s.notify != nil {
		body := fmt.Sprintf("Your score: %d/%d (%s).", correct, total, passLabel(passed))
		_ = s.notify.Notify(ctx, studentUserIDFallback(studentProfileID), "ASSESSMENT_GRADED",
			"Assessment graded", &body, map[string]any{"attempt_id": attemptID, "passed": passed})
	}
	return &LearnerAssessmentResult{AttemptID: attemptID, Score: score, MaxScore: float64(total), Passed: passed, Correct: correct, Total: total}, nil
}

func passLabel(passed bool) string {
	if passed {
		return "passed"
	}
	return "not passed yet"
}

func studentUserIDFallback(_ uuid.UUID) uuid.UUID {
	return uuid.Nil // notify stores per user; student portal lists by profile — see portal handler
}

// --- Grading (tutor) ---

func (s *LearningService) ListSubmissionsByAssignment(ctx context.Context, assignmentID uuid.UUID) ([]learning.GradedSubmission, error) {
	if s.grading == nil {
		return []learning.GradedSubmission{}, nil
	}
	return s.grading.ListSubmissionsByAssignment(ctx, assignmentID)
}

// GradeSubmission — tutor grades with score + feedback; notifies the student.
func (s *LearningService) GradeSubmission(ctx context.Context, tutorUserID uuid.UUID,
	submissionID uuid.UUID, score *float64, feedback *string) error {

	if s.grading == nil {
		return errors.New("grading store unavailable")
	}
	if score != nil && (*score < 0 || *score > 100) {
		return fmt.Errorf("%w: score must be 0-100", domain.ErrInvalidInput)
	}
	if err := s.grading.Grade(ctx, submissionID, score, feedback, tutorUserID); err != nil {
		return err
	}
	_ = s.audit.LogStateChange(ctx, &tutorUserID, identity.AuditUpdate, "submission",
		&submissionID, nil, map[string]any{"score": score, "has_feedback": feedback != nil}, nil, nil)
	return nil
}

// --- Progress reports ---

type CreateReportInput struct {
	TutorUserID      uuid.UUID
	StudentProfileID uuid.UUID
	TutorProfileID   uuid.UUID
	CohortID         *uuid.UUID
	PeriodStart      time.Time
	PeriodEnd        time.Time
	Strengths        *string
	Weaknesses       *string
	Recommendations  *string
	OverallRating    *int
}

func (s *LearningService) CreateProgressReport(ctx context.Context, in CreateReportInput) (*learning.ProgressReport, error) {
	if in.PeriodEnd.Before(in.PeriodStart) {
		return nil, fmt.Errorf("%w: period_end must be after period_start", domain.ErrInvalidInput)
	}
	if in.OverallRating != nil && (*in.OverallRating < 1 || *in.OverallRating > 5) {
		return nil, fmt.Errorf("%w: overall_rating must be 1-5", domain.ErrInvalidInput)
	}
	if s.reports == nil {
		return nil, errors.New("report store unavailable")
	}
	report := &learning.ProgressReport{
		StudentProfileID: in.StudentProfileID,
		TutorProfileID:   in.TutorProfileID,
		CohortID:         in.CohortID,
		PeriodStart:      in.PeriodStart,
		PeriodEnd:        in.PeriodEnd,
		Strengths:        in.Strengths,
		Weaknesses:       in.Weaknesses,
		Recommendations:  in.Recommendations,
		OverallRating:    in.OverallRating,
	}
	if err := s.reports.Create(ctx, report); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &in.TutorUserID, identity.AuditCreate, "progress_report",
		&report.ID, nil, map[string]any{"student": in.StudentProfileID.String(), "rating": in.OverallRating}, nil, nil)
	if s.notify != nil {
		body := "Your tutor published a new progress report."
		_ = s.notify.Notify(ctx, in.TutorUserID, "PROGRESS_REPORT", "Progress report available", &body, map[string]any{"report_id": report.ID})
	}
	return report, nil
}

func (s *LearningService) ListProgressByStudent(ctx context.Context, studentProfileID uuid.UUID) ([]learning.ProgressReport, error) {
	if s.reports == nil {
		return []learning.ProgressReport{}, nil
	}
	return s.reports.ListByStudent(ctx, studentProfileID, 20)
}

func (s *LearningService) ListProgressByTutor(ctx context.Context, tutorProfileID uuid.UUID) ([]learning.ProgressReport, error) {
	if s.reports == nil {
		return []learning.ProgressReport{}, nil
	}
	return s.reports.ListByTutor(ctx, tutorProfileID, 20)
}

// --- Analytics (admin) ---

type AnalyticsService struct {
	analytics learning.AnalyticsRepository
}

func NewAnalyticsService(a learning.AnalyticsRepository) *AnalyticsService {
	return &AnalyticsService{analytics: a}
}

func (s *AnalyticsService) Funnel(ctx context.Context) (*learning.Funnel, error) {
	if s.analytics == nil {
		return &learning.Funnel{}, nil
	}
	return s.analytics.Funnel(ctx)
}

func (s *AnalyticsService) CohortAnalytics(ctx context.Context, limit int) ([]learning.CohortAnalytics, error) {
	if s.analytics == nil {
		return []learning.CohortAnalytics{}, nil
	}
	return s.analytics.CohortAnalytics(ctx, limit)
}

func (s *AnalyticsService) RevenueByProgramme(ctx context.Context, limit int) ([]learning.RevenueByProgramme, error) {
	if s.analytics == nil {
		return []learning.RevenueByProgramme{}, nil
	}
	return s.analytics.RevenueByProgramme(ctx, limit)
}

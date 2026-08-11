package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/vetting"

	"github.com/google/uuid"
)

// AssessmentService methods on VettingService — competency quiz engine:
// timed attempts, question sampling without answer keys, 70% pass threshold,
// 12-month competency validity, cross-subject answer guard.

// AttemptQuestion — question DTO with the correct index stripped.
type AttemptQuestion struct {
	ID       uuid.UUID `json:"id"`
	Question string    `json:"question"`
	Options  []string  `json:"options"`
}

type AttemptWithQuestions struct {
	Attempt       vetting.AssessmentAttempt `json:"attempt"`
	Questions     []AttemptQuestion         `json:"questions"`
	PassThreshold float64                   `json:"pass_threshold"`
}

type AssessmentAnswerInput struct {
	QuestionID  uuid.UUID `json:"question_id"`
	ChosenIndex int       `json:"chosen_index"`
}

type AssessmentResult struct {
	AttemptID uuid.UUID  `json:"attempt_id"`
	Score     float64    `json:"score"`
	MaxScore  float64    `json:"max_score"`
	Passed    bool       `json:"passed"`
	Correct   int        `json:"correct"`
	Total     int        `json:"total"`
	ExpiresAt *time.Time `json:"competency_expires_at,omitempty"`
}

// StartAssessment — begins a timed attempt for the tutor's subject.
func (s *VettingService) StartAssessment(ctx context.Context, actorUserID, profileID, subjectID uuid.UUID) (*AttemptWithQuestions, error) {
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	profile, err := s.uowProfile(ctx, uow, profileID)
	if err != nil {
		return nil, err
	}
	if profile.UserID != actorUserID {
		return nil, domain.ErrForbidden
	}

	// Subject must be in the tutor's teaching scope.
	subjects, err := uow.TutorSubjects().ListByTutor(ctx, profileID)
	if err != nil {
		return nil, err
	}
	hasSubject := false
	for _, e := range subjects {
		if e.SubjectID == subjectID {
			hasSubject = true
			break
		}
	}
	if !hasSubject {
		return nil, fmt.Errorf("%w: subject is not in the tutor's teaching scope", domain.ErrForbidden)
	}

	// No active attempt for the subject.
	if _, err := uow.Vetting().GetActiveAttempt(ctx, profileID, subjectID); err == nil {
		return nil, fmt.Errorf("%w: an attempt is already in progress", domain.ErrConflict)
	} else if !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	// Already passed with unexpired competency → no retake needed.
	passed, err := uow.Vetting().PassedCompetencyExists(ctx, profileID, s.clock().UTC())
	if err != nil {
		return nil, err
	}
	if passed {
		return nil, fmt.Errorf("%w: tutor already has an unexpired passed assessment", domain.ErrConflict)
	}

	questions, err := uow.Vetting().ListQuestionsForSubject(ctx, subjectID, vetting.QuestionsPerAttempt)
	if err != nil {
		return nil, err
	}
	if len(questions) < vetting.QuestionsPerAttempt {
		return nil, fmt.Errorf("%w: question bank for this subject is not ready yet", domain.ErrConflict)
	}

	attempt := &vetting.AssessmentAttempt{
		TutorProfileID: profileID,
		SubjectID:      subjectID,
		Status:         vetting.AttemptInProgress,
		ExpiresAt:      s.clock().UTC().Add(vetting.AttemptDuration),
	}
	if err := uow.Vetting().CreateAttempt(ctx, attempt); err != nil {
		return nil, err
	}
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}

	out := &AttemptWithQuestions{
		Attempt:       *attempt,
		PassThreshold: vetting.PassThreshold,
	}
	for _, q := range questions {
		out.Questions = append(out.Questions, AttemptQuestion{
			ID:       q.ID,
			Question: q.Question,
			Options:  q.Options,
		})
	}
	return out, nil
}

// SubmitAssessment — grades the attempt, records the competency result.
// Idempotent: a COMPLETED attempt cannot be resubmitted.
func (s *VettingService) SubmitAssessment(ctx context.Context, actorUserID uuid.UUID,
	attemptID uuid.UUID, answers []AssessmentAnswerInput) (*AssessmentResult, error) {

	now := s.clock().UTC()
	uow, err := s.uows.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer uow.Rollback()

	attempt, err := uow.Vetting().GetAttempt(ctx, attemptID)
	if err != nil {
		return nil, err
	}
	profile, err := uow.Vetting().GetProfileByID(ctx, attempt.TutorProfileID)
	if err != nil {
		return nil, err
	}
	if profile.UserID != actorUserID {
		return nil, domain.ErrForbidden
	}
	if !attempt.CanSubmit(now) {
		if attempt.Status == vetting.AttemptCompleted {
			return nil, fmt.Errorf("%w: attempt already submitted", domain.ErrConflict)
		}
		return nil, fmt.Errorf("%w: attempt expired", domain.ErrConflict)
	}
	if len(answers) == 0 || len(answers) > vetting.QuestionsPerAttempt {
		return nil, fmt.Errorf("%w: answers must match the attempt questions", domain.ErrInvalidInput)
	}

	correct := 0
	total := len(answers)
	for _, in := range answers {
		if in.ChosenIndex < 0 {
			return nil, fmt.Errorf("%w: invalid answer index", domain.ErrInvalidInput)
		}
		// Cross-subject guard: only questions belonging to the attempt's
		// subject can be answered (prevents pre-fetched answer-key cheating).
		q, err := uow.Vetting().GetQuestion(ctx, in.QuestionID)
		if err != nil {
			return nil, err
		}
		if q.SubjectID != attempt.SubjectID || !q.IsActive {
			return nil, fmt.Errorf("%w: question %s does not belong to this attempt", domain.ErrInvalidInput, in.QuestionID)
		}
		if in.ChosenIndex >= len(q.Options) {
			return nil, fmt.Errorf("%w: answer index out of range", domain.ErrInvalidInput)
		}
		isCorrect := in.ChosenIndex == q.CorrectIndex
		if isCorrect {
			correct++
		}
		if err := uow.Vetting().SaveAnswer(ctx, &vetting.AssessmentAnswer{
			AttemptID:   attemptID,
			QuestionID:  in.QuestionID,
			ChosenIndex: intPtr(in.ChosenIndex),
			IsCorrect:   isCorrect,
		}); err != nil {
			return nil, err
		}
	}

	maxScore := float64(total)
	score := float64(correct)
	passed := score/maxScore >= vetting.PassThreshold

	if err := uow.Vetting().CompleteAttempt(ctx, attemptID, score, maxScore, passed); err != nil {
		return nil, err
	}
	var expiresAt *time.Time
	if passed {
		exp := now.Add(vetting.CompetencyValidity)
		expiresAt = &exp
	}
	result := &vetting.CompetencyAssessment{
		TutorProfileID: attempt.TutorProfileID,
		SubjectID:      &attempt.SubjectID,
		Score:          score,
		MaxScore:       maxScore,
		Passed:         passed,
		ExpiresAt:      expiresAt,
	}
	if err := uow.Vetting().CreateCompetencyResult(ctx, result); err != nil {
		return nil, err
	}

	_ = s.audit.LogStateChange(ctx, &actorUserID, identity.AuditVettingStatusChange, "competency_assessment",
		&attemptID, map[string]any{"status": vetting.AttemptInProgress}, map[string]any{
			"status": vetting.AttemptCompleted, "score": score, "max": maxScore, "passed": passed,
		}, nil, nil)
	if err := uow.Commit(ctx); err != nil {
		return nil, err
	}

	return &AssessmentResult{
		AttemptID: attemptID,
		Score:     score,
		MaxScore:  maxScore,
		Passed:    passed,
		Correct:   correct,
		Total:     total,
		ExpiresAt: expiresAt,
	}, nil
}

func intPtr(i int) *int { return &i }

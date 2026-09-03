package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/advisor"
	"ykay-virtual/internal/domain/identity"
)

// AdvisorService — YK-Virtual Plus named Learning Advisor + learning plan (000067).
// Only active Plus users get an advisor or a learning plan.
type AdvisorService struct {
	repo  advisor.Repository
	plus  *PlusService
	users identity.UserRepository
	audit identity.AuditService
}

func NewAdvisorService(repo advisor.Repository, audit identity.AuditService) *AdvisorService {
	return &AdvisorService{repo: repo, audit: audit}
}

// WithPlus wires the Plus gate.
func (s *AdvisorService) WithPlus(p *PlusService) *AdvisorService {
	s.plus = p
	return s
}

// WithUsers wires the user repo so advisor name/email can be resolved.
func (s *AdvisorService) WithUsers(u identity.UserRepository) *AdvisorService {
	s.users = u
	return s
}

// AdvisorView — an assignment enriched with the advisor's contact details.
type AdvisorView struct {
	advisor.Assignment
	AdvisorName  string `json:"advisor_name"`
	AdvisorEmail string `json:"advisor_email"`
}

// AssignAdvisor — admin assigns a named advisor to a Plus subscriber.
func (s *AdvisorService) AssignAdvisor(ctx context.Context, adminID, subscriberUserID, advisorUserID uuid.UUID, note *string) (*AdvisorView, error) {
	if s.repo == nil {
		return nil, errorsAdvisorUnavailable()
	}
	if s.plus == nil || !s.plus.HasActivePlan(ctx, subscriberUserID) {
		return nil, fmt.Errorf("%w: the user has no active YK-Virtual Plus plan to assign an advisor to", domain.ErrConflict)
	}
	a := &advisor.Assignment{
		UserID:        subscriberUserID,
		AdvisorUserID: advisorUserID,
		Note:          note,
		AssignedBy:    &adminID,
	}
	if err := s.repo.Assign(ctx, a); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &adminID, identity.AuditCreate, "plus_advisor",
		&a.ID, nil, map[string]any{"user_id": subscriberUserID.String(), "advisor_user_id": advisorUserID.String()}, nil, nil)
	return s.view(ctx, a)
}

// GetMyAdvisor — the caller's named advisor (Plus only).
func (s *AdvisorService) GetMyAdvisor(ctx context.Context, userID uuid.UUID) (*AdvisorView, error) {
	if s.repo == nil {
		return nil, errorsAdvisorUnavailable()
	}
	if s.plus != nil && !s.plus.HasActivePlan(ctx, userID) {
		return nil, fmt.Errorf("%w: assign a YK-Virtual Plus plan to get a named advisor", plusErrConflict())
	}
	a, err := s.repo.GetByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.view(ctx, a)
}

func (s *AdvisorService) view(ctx context.Context, a *advisor.Assignment) (*AdvisorView, error) {
	v := &AdvisorView{Assignment: *a}
	if s.users != nil {
		if u, err := s.users.FindByID(ctx, a.AdvisorUserID); err == nil && u != nil {
			v.AdvisorName = strings.TrimSpace(u.FirstName + " " + u.LastName)
			v.AdvisorEmail = u.Email
		}
	}
	return v, nil
}

// --- Learning plan ---

// SetLearningPlan — admin/advisor authors (or updates) a Plus user's learning
// plan for a learner.
func (s *AdvisorService) SetLearningPlan(ctx context.Context, actorID, userID, studentProfileID uuid.UUID,
	goals, focusAreas, recommendations *string) (*advisor.LearningPlan, error) {
	if s.repo == nil {
		return nil, errorsAdvisorUnavailable()
	}
	if s.plus != nil && !s.plus.HasActivePlan(ctx, userID) {
		return nil, fmt.Errorf("%w: assign a YK-Virtual Plus plan to author a learning plan", plusErrConflict())
	}
	p := &advisor.LearningPlan{
		UserID:           userID,
		StudentProfileID: studentProfileID,
		Goals:            goals,
		FocusAreas:       focusAreas,
		Recommendations:  recommendations,
		Status:           advisor.PlanActive,
		Source:           advisor.SourceManual,
		CreatedBy:        &actorID,
	}
	if err := s.repo.UpsertPlan(ctx, p); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &actorID, identity.AuditCreate, "plus_learning_plan",
		&p.ID, nil, map[string]any{"user_id": userID.String(), "student_profile_id": studentProfileID.String()}, nil, nil)
	return p, nil
}

// GetMyLearningPlan — the caller's learning plan for a learner (Plus only).
func (s *AdvisorService) GetMyLearningPlan(ctx context.Context, userID, studentProfileID uuid.UUID) (*advisor.LearningPlan, error) {
	if s.repo == nil {
		return nil, errorsAdvisorUnavailable()
	}
	if s.plus != nil && !s.plus.HasActivePlan(ctx, userID) {
		return nil, fmt.Errorf("%w: assign a YK-Virtual Plus plan to view a learning plan", plusErrConflict())
	}
	return s.repo.GetPlan(ctx, userID, studentProfileID)
}

func errorsAdvisorUnavailable() error {
	return fmt.Errorf("%w: advisor store unavailable", domain.ErrInvalidInput)
}

func plusErrConflict() error { return domain.ErrConflict }

// GeneratePlanFromScore auto-authors a learning plan from a completed
// diagnostic (P5 / 000068). Plus-gated: returns nil,nil for non-Plus users so
// the assessment hook can call this unconditionally. The plan's goals, focus
// areas and recommendations are derived from the score ratio and subject.
func (s *AdvisorService) GeneratePlanFromScore(ctx context.Context, parentUserID, studentProfileID uuid.UUID,
	subject string, score, total float64) (*advisor.LearningPlan, error) {
	if s.repo == nil {
		return nil, errorsAdvisorUnavailable()
	}
	if s.plus != nil && !s.plus.HasActivePlan(ctx, parentUserID) {
		return nil, nil // not a Plus user — no plan
	}
	ratio := 0.0
	if total > 0 {
		ratio = score / total
	}
	subject = strings.TrimSpace(subject)
	if subject == "" {
		subject = "the subject"
	}

	var goals, focus, recs string
	switch {
	case ratio >= 0.8:
		goals = fmt.Sprintf("Build on a strong grasp of %s and push toward mastery", subject)
		focus = fmt.Sprintf("Advanced %s topics, exam technique, and speed", subject)
		recs = "Maintain current pace; add 1-2 advanced %s problems weekly and book a mock exam monthly"
		recs = fmt.Sprintf(recs, subject)
	case ratio >= 0.5:
		goals = fmt.Sprintf("Solidify core %s concepts and improve accuracy", subject)
		focus = fmt.Sprintf("Core %s fundamentals, worked examples, and past-paper practice", subject)
		recs = "Review incorrect answers; complete 2 focused %s exercises per week; ask the AI tutor to explain missed topics"
		recs = fmt.Sprintf(recs, subject)
	default:
		goals = fmt.Sprintf("Rebuild %s foundations and close key gaps", subject)
		focus = fmt.Sprintf("Revisit %s fundamentals with step-by-step guidance", subject)
		recs = "Start with foundational %s lessons, use the AI tutor for step-by-step help, and retake a diagnostic in 3 weeks"
		recs = fmt.Sprintf(recs, subject)
	}

	p := &advisor.LearningPlan{
		UserID:           parentUserID,
		StudentProfileID: studentProfileID,
		Goals:            &goals,
		FocusAreas:       &focus,
		Recommendations:  &recs,
		Status:           advisor.PlanActive,
		Source:           advisor.SourceDiagnostic,
	}
	if err := s.repo.UpsertPlan(ctx, p); err != nil {
		return nil, err
	}
	_ = s.audit.LogStateChange(ctx, &parentUserID, identity.AuditCreate, "plus_learning_plan",
		&p.ID, nil, map[string]any{"source": "DIAGNOSTIC", "subject": subject, "score": score, "total": total}, nil, nil)
	return p, nil
}

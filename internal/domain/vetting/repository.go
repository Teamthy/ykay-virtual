package vetting

import (
	"context"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/tutor"
)

// VettingRepository — persistence for the vetting pipeline.
// Implementations: internal/repository/postgres, internal/repository/memory.
// All status transitions, document reviews and assessment submissions run
// inside a UnitOfWork (audit + cache invalidation stay consistent).

type VettingRepository interface {
	// --- Tutor profile reads/writes (vetting surface of tutor_profiles) ---
	GetProfileByID(ctx context.Context, profileID uuid.UUID) (*tutor.TutorProfile, error)
	GetProfileByUserID(ctx context.Context, userID uuid.UUID) (*tutor.TutorProfile, error)
	CreateProfile(ctx context.Context, p *tutor.TutorProfile) error
	UpdateStatus(ctx context.Context, profileID uuid.UUID, status string) error
	SetPublic(ctx context.Context, profileID uuid.UUID, isPublic bool) error
	MarkApproved(ctx context.Context, profileID, approvedBy uuid.UUID, rankingScore float64) error
	SetRankingScore(ctx context.Context, profileID uuid.UUID, score float64) error
	ListByStatus(ctx context.Context, status string, limit, offset int) ([]tutor.TutorProfile, int64, error)
	ListApprovedProfiles(ctx context.Context, limit int) ([]uuid.UUID, error)

	// --- Documents (PRIVATE bucket) ---
	CreateDocument(ctx context.Context, d *VettingDocument) error
	GetDocument(ctx context.Context, id uuid.UUID) (*VettingDocument, error)
	ListDocuments(ctx context.Context, profileID uuid.UUID) ([]VettingDocument, error)
	UpdateDocumentReview(ctx context.Context, id uuid.UUID, status DocumentStatus,
		reviewedBy uuid.UUID, reason *string) error

	// --- Events (attributable timeline) ---
	CreateEvent(ctx context.Context, e *VettingEvent) error
	ListEvents(ctx context.Context, profileID uuid.UUID, limit int) ([]VettingEvent, error)

	// --- Competency assessment ---
	CreateAttempt(ctx context.Context, a *AssessmentAttempt) error
	GetAttempt(ctx context.Context, id uuid.UUID) (*AssessmentAttempt, error)
	GetActiveAttempt(ctx context.Context, profileID, subjectID uuid.UUID) (*AssessmentAttempt, error)
	ListQuestionsForSubject(ctx context.Context, subjectID uuid.UUID, limit int) ([]AssessmentQuestion, error)
	GetQuestion(ctx context.Context, id uuid.UUID) (*AssessmentQuestion, error)
	SaveAnswer(ctx context.Context, a *AssessmentAnswer) error
	CompleteAttempt(ctx context.Context, id uuid.UUID, score, maxScore float64, passed bool) error
	CreateCompetencyResult(ctx context.Context, c *CompetencyAssessment) error
	ListCompetencyResults(ctx context.Context, profileID uuid.UUID, limit int) ([]CompetencyAssessment, error)
	// PassedCompetencyExists — at least one unexpired passed assessment.
	PassedCompetencyExists(ctx context.Context, profileID uuid.UUID, now time.Time) (bool, error)
}

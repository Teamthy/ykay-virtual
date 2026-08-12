package learning

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Learning domain — assessments (auto-graded), grading, progress reports and
// analytics (Phase 11c). Pure types + repository contracts.

// --- Learner assessments ---

type AssessmentStatus string

const (
	AssessmentDraft     AssessmentStatus = "DRAFT"
	AssessmentPublished AssessmentStatus = "PUBLISHED"
	AssessmentClosed    AssessmentStatus = "CLOSED"
)

type LearnerAssessment struct {
	ID             uuid.UUID        `json:"id"`
	CohortID       *uuid.UUID       `json:"cohort_id,omitempty"`
	LessonID       *uuid.UUID       `json:"lesson_id,omitempty"`
	TutorProfileID uuid.UUID        `json:"tutor_profile_id"`
	Title          string           `json:"title"`
	Instructions   *string          `json:"instructions,omitempty"`
	PassThreshold  float64          `json:"pass_threshold"`
	DueAt          *time.Time       `json:"due_at,omitempty"`
	Status         AssessmentStatus `json:"status"`
	CreatedBy      *uuid.UUID       `json:"created_by,omitempty"`
	CreatedAt      time.Time        `json:"created_at"`
	UpdatedAt      time.Time        `json:"updated_at"`
}

type AssessmentQuestion struct {
	ID           uuid.UUID `json:"id"`
	AssessmentID uuid.UUID `json:"assessment_id"`
	Question     string    `json:"question"`
	Options      []string  `json:"options"`
	CorrectIndex int       `json:"-"`
	Explanation  *string   `json:"explanation,omitempty"`
	SortOrder    int       `json:"sort_order"`
}

type AttemptStatus string

const (
	AttemptInProgress AttemptStatus = "IN_PROGRESS"
	AttemptCompleted  AttemptStatus = "COMPLETED"
	AttemptExpired    AttemptStatus = "EXPIRED"
)

type LearnerAttempt struct {
	ID               uuid.UUID     `json:"id"`
	AssessmentID     uuid.UUID     `json:"assessment_id"`
	StudentProfileID uuid.UUID     `json:"student_profile_id"`
	TutorProfileID   uuid.UUID     `json:"tutor_profile_id"`
	Status           AttemptStatus `json:"status"`
	Score            *float64      `json:"score,omitempty"`
	MaxScore         *float64      `json:"max_score,omitempty"`
	Passed           *bool         `json:"passed,omitempty"`
	StartedAt        time.Time     `json:"started_at"`
	CompletedAt      *time.Time    `json:"completed_at,omitempty"`
	ExpiresAt        time.Time     `json:"expires_at"`
}

// --- Progress reports (migration 000010) ---

type ProgressReport struct {
	ID               uuid.UUID  `json:"id"`
	StudentProfileID uuid.UUID  `json:"student_profile_id"`
	TutorProfileID   uuid.UUID  `json:"tutor_profile_id"`
	CohortID         *uuid.UUID `json:"cohort_id,omitempty"`
	PeriodStart      time.Time  `json:"period_start"`
	PeriodEnd        time.Time  `json:"period_end"`
	Strengths        *string    `json:"strengths,omitempty"`
	Weaknesses       *string    `json:"weaknesses,omitempty"`
	Recommendations  *string    `json:"recommendations,omitempty"`
	OverallRating    *int       `json:"overall_rating,omitempty"` // 1-5
	CreatedAt        time.Time  `json:"created_at"`
}

// --- Repositories ---

type AssessmentRepository interface {
	CreateAssessment(ctx context.Context, a *LearnerAssessment) error
	AddQuestion(ctx context.Context, q *AssessmentQuestion) error
	GetAssessment(ctx context.Context, id uuid.UUID) (*LearnerAssessment, error)
	ListByCohort(ctx context.Context, cohortID uuid.UUID, status string, limit int) ([]LearnerAssessment, error)
	GetQuestions(ctx context.Context, assessmentID uuid.UUID) ([]AssessmentQuestion, error)
	SetStatus(ctx context.Context, id uuid.UUID, status AssessmentStatus) error

	CreateAttempt(ctx context.Context, a *LearnerAttempt) error
	GetAttempt(ctx context.Context, id uuid.UUID) (*LearnerAttempt, error)
	GetAttemptForStudent(ctx context.Context, assessmentID, studentProfileID uuid.UUID) (*LearnerAttempt, error)
	// ExpireStaleAttempts — marks IN_PROGRESS attempts whose window has passed
	// as EXPIRED (worker cron). Returns the number expired.
	ExpireStaleAttempts(ctx context.Context, before time.Time) (int64, error)
	CompleteAttempt(ctx context.Context, id uuid.UUID, score, maxScore float64, passed bool) error
}

type GradingRepository interface {
	// ListSubmissionsByAssignment — all submissions for an assignment (tutor view).
	ListSubmissionsByAssignment(ctx context.Context, assignmentID uuid.UUID) ([]GradedSubmission, error)
	// Grade — score + feedback + graded_by.
	Grade(ctx context.Context, submissionID uuid.UUID, score *float64, feedback *string, gradedBy uuid.UUID) error
}

type GradedSubmission struct {
	ID               uuid.UUID  `json:"id"`
	AssignmentID     uuid.UUID  `json:"assignment_id"`
	StudentProfileID uuid.UUID  `json:"student_profile_id"`
	Content          *string    `json:"content,omitempty"`
	Score            *float64   `json:"score,omitempty"`
	Feedback         *string    `json:"feedback,omitempty"`
	SubmittedAt      time.Time  `json:"submitted_at"`
	GradedAt         *time.Time `json:"graded_at,omitempty"`
}

type ProgressReportRepository interface {
	Create(ctx context.Context, r *ProgressReport) error
	ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]ProgressReport, error)
	ListByTutor(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]ProgressReport, error)
}

// Analytics (working-doc §22) — funnel + operational metrics.

type Funnel struct {
	RegisteredUsers      int64   `json:"registered_users"`
	LearnersCreated      int64   `json:"learners_created"`
	OrdersCreated        int64   `json:"orders_created"`
	PaidOrders           int64   `json:"paid_orders"`
	EnrollmentsConfirmed int64   `json:"enrollments_confirmed"`
	ConversionRate       float64 `json:"conversion_rate"` // paid / registered
}

type CohortAnalytics struct {
	CohortID       uuid.UUID `json:"cohort_id"`
	Title          string    `json:"title"`
	Capacity       int       `json:"capacity"`
	Enrolled       int       `json:"enrolled"`
	FillRate       float64   `json:"fill_rate"`
	LessonsCount   int64     `json:"lessons_count"`
	AttendanceRate float64   `json:"attendance_rate"`
}

type RevenueByProgramme struct {
	ProgrammeID    uuid.UUID `json:"programme_id"`
	ProgrammeTitle string    `json:"programme_title"`
	Revenue        float64   `json:"revenue"`
	Orders         int64     `json:"orders"`
}

type AnalyticsRepository interface {
	Funnel(ctx context.Context) (*Funnel, error)
	CohortAnalytics(ctx context.Context, limit int) ([]CohortAnalytics, error)
	RevenueByProgramme(ctx context.Context, limit int) ([]RevenueByProgramme, error)
}

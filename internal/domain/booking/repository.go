package booking

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Repository interfaces for the booking + escrow engine (migrations
// 000006_booking, 000007_payment). Implementations:
// internal/repository/postgres (transactional), internal/repository/memory (fakes).

type CohortRepository interface {
	ListPublished(ctx context.Context, params CohortListParams) ([]Cohort, int64, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Cohort, error)
	// GetByIDForUpdate locks the row (SELECT ... FOR UPDATE) so concurrent
	// enrollments cannot oversubscribe a cohort (SLO: no overbooking).
	GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*Cohort, error)
	IncrementEnrolledCount(ctx context.Context, id uuid.UUID, delta int) error
}

// LessonParticipantLinker — connects a learner to a cohort's upcoming
// lessons. Called when an enrollment is confirmed (payment settled) so the
// student's LMS reflects their cohort immediately; idempotent.
type LessonParticipantLinker interface {
	LinkStudentToCohortLessons(ctx context.Context, cohortID, studentProfileID uuid.UUID, from time.Time) (int64, error)
}

type CohortEnrollmentRepository interface {
	Create(ctx context.Context, e *CohortEnrollment) error
	GetByCohortAndStudent(ctx context.Context, cohortID, studentProfileID uuid.UUID) (*CohortEnrollment, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status EnrollmentStatus) error
	// ListByCohort — roster for the tutor console (LMS).
	ListByCohort(ctx context.Context, cohortID uuid.UUID) ([]CohortEnrollment, error)
}

type PrivateTuitionRequestRepository interface {
	Create(ctx context.Context, r *PrivateTuitionRequest) error
	GetByID(ctx context.Context, id uuid.UUID) (*PrivateTuitionRequest, error)
}

type PrivatePackageRepository interface {
	Create(ctx context.Context, p *PrivatePackage) error
	GetByID(ctx context.Context, id uuid.UUID) (*PrivatePackage, error)
	// UpdateStatus — idempotent status transition (used to activate a package
	// only after its order is settled; YK-004).
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
}

// StudentProfileReader lets the booking service verify the parent→student
// link (object-level authorization enforced in the service layer, never UI).
type StudentProfileReader interface {
	StudentExistsForParent(ctx context.Context, studentID, parentUserID uuid.UUID) (bool, error)
	// StudentBookingAccess resolves the full booking-access picture for one
	// student profile relative to the actor. Used for self-enrollment and
	// minor (<17) gating (Phase 3). When the profile does not exist, it
	// returns the zero value (no error) so the caller can reject cleanly.
	StudentBookingAccess(ctx context.Context, studentID, actorUserID uuid.UUID) (StudentBookingAccess, error)
}

// StudentBookingAccess — raw facts the booking service combines into its
// authorization + minor-gating decision. Age is computed in the service from
// DateOfBirth (keeps business rules out of the repositories).
type StudentBookingAccess struct {
	ParentLinked    bool       // a parent_student_links row connects actor → student
	SelfOwned       bool       // student_profiles.user_id == actorUserID (the learner is the actor)
	DateOfBirth     *time.Time // may be nil (unknown age)
	GuardianConsent bool       // student_profiles.guardian_consent
	HasLinkedParent bool       // ANY parent_student_links row exists for the student
}

type TutorProfileReader interface {
	TutorCanTeach(ctx context.Context, tutorProfileID uuid.UUID, subjectID uuid.UUID) (bool, error)
}

// LessonRepository — read side for lessons (dashboards, scheduling).
type LessonRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Lesson, error)
	ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]Lesson, error)
	ListByTutor(ctx context.Context, tutorProfileID uuid.UUID, limit int) ([]Lesson, error)
	ListByCohort(ctx context.Context, cohortID uuid.UUID, limit int) ([]Lesson, error)
}

// LessonProgress — per-student watch state for a lesson (000035).
type LessonProgress struct {
	ID               uuid.UUID  `json:"id"`
	LessonID         uuid.UUID  `json:"lesson_id"`
	StudentProfileID uuid.UUID  `json:"student_profile_id"`
	Watched          bool       `json:"watched"`
	PositionSeconds  int        `json:"position_seconds"`
	WatchedAt        *time.Time `json:"watched_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// LessonProgressRepository — upsert + read watch progress (000035).
type LessonProgressRepository interface {
	// Upsert records (or updates) a student's progress for a lesson. Idempotent
	// on (lesson_id, student_profile_id).
	Upsert(ctx context.Context, p *LessonProgress) error
	// GetByLessonAndStudent returns progress for one lesson+student, or nil when
	// none exists yet.
	GetByLessonAndStudent(ctx context.Context, lessonID, studentProfileID uuid.UUID) (*LessonProgress, error)
	// ListByStudent returns the student's progress across lessons (for the LMS
	// completion summary).
	ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]LessonProgress, error)
}

// CohortListParams — public cohort catalogue filters.
type CohortListParams struct {
	ProgrammeID *uuid.UUID
	Status      string // default PUBLISHED
	Page        int
	PageSize    int
}

// AttendanceRepository — lesson attendance (MVP teaching ops).
type AttendanceRepository interface {
	Upsert(ctx context.Context, lessonID, studentProfileID uuid.UUID, status string, markedBy uuid.UUID, note *string) error
	ListByLesson(ctx context.Context, lessonID uuid.UUID) ([]Attendance, error)
}

// Attendance mirrors migration attendance.
type Attendance struct {
	ID               uuid.UUID `json:"id"`
	LessonID         uuid.UUID `json:"lesson_id"`
	StudentProfileID uuid.UUID `json:"student_profile_id"`
	Status           string    `json:"status"`
	MarkedBy         uuid.UUID `json:"marked_by"`
	Note             *string   `json:"note,omitempty"`
	MarkedAt         time.Time `json:"marked_at"`
}

// LessonNoteRepository — tutor lesson notes (MVP teaching ops).
type LessonNoteRepository interface {
	Create(ctx context.Context, n *LessonNote) error
	ListByLesson(ctx context.Context, lessonID uuid.UUID) ([]LessonNote, error)
}

type LessonNote struct {
	ID                uuid.UUID  `json:"id"`
	LessonID          uuid.UUID  `json:"lesson_id"`
	TutorProfileID    uuid.UUID  `json:"tutor_profile_id"`
	StudentProfileID  *uuid.UUID `json:"student_profile_id,omitempty"`
	Content           string     `json:"content"`
	Homework          *string    `json:"homework,omitempty"`
	IsVisibleToParent bool       `json:"is_visible_to_parent"`
	CreatedAt         time.Time  `json:"created_at"`
}

// ResourceRepository — read side for learning resources (migration 000006).
type ResourceRepository interface {
	ListByCohort(ctx context.Context, cohortID uuid.UUID) ([]Resource, error)
	Create(ctx context.Context, r *Resource) error
}

type Resource struct {
	ID          uuid.UUID  `json:"id"`
	ProgrammeID *uuid.UUID `json:"programme_id,omitempty"`
	CohortID    *uuid.UUID `json:"cohort_id,omitempty"`
	LessonID    *uuid.UUID `json:"lesson_id,omitempty"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	FileURL     *string    `json:"file_url,omitempty"`
	IsPublic    bool       `json:"is_public"`
	CreatedAt   time.Time  `json:"created_at"`
}

// AssignmentRepository — read side for assignments (migration 000006).
type AssignmentRepository interface {
	ListByCohort(ctx context.Context, cohortID uuid.UUID) ([]Assignment, error)
	// ListByStudent — assignments for cohorts the student is enrolled in.
	ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]Assignment, error)
	Create(ctx context.Context, a *Assignment) error
}

type Assignment struct {
	ID           uuid.UUID  `json:"id"`
	CohortID     *uuid.UUID `json:"cohort_id,omitempty"`
	LessonID     *uuid.UUID `json:"lesson_id,omitempty"`
	Title        string     `json:"title"`
	Instructions *string    `json:"instructions,omitempty"`
	DueAt        *time.Time `json:"due_at,omitempty"`
	MaxScore     *float64   `json:"max_score,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// SubmissionRepository — assignment submissions (migration 000006).
type SubmissionRepository interface {
	Upsert(ctx context.Context, s *Submission) error
	ListByStudent(ctx context.Context, studentProfileID uuid.UUID, limit int) ([]Submission, error)
}

// Submission mirrors migration submissions.
type Submission struct {
	ID               uuid.UUID  `json:"id"`
	AssignmentID     uuid.UUID  `json:"assignment_id"`
	StudentProfileID uuid.UUID  `json:"student_profile_id"`
	Content          *string    `json:"content,omitempty"`
	FileKey          *string    `json:"-"`
	Score            *float64   `json:"score,omitempty"`
	Feedback         *string    `json:"feedback,omitempty"`
	SubmittedAt      time.Time  `json:"submitted_at"`
	GradedAt         *time.Time `json:"graded_at,omitempty"`
}

// AvailabilityException mirrors migration tutor_availability_exceptions.
type AvailabilityException struct {
	ID             uuid.UUID `json:"id"`
	TutorProfileID uuid.UUID `json:"tutor_profile_id"`
	ExceptionDate  time.Time `json:"exception_date"`
	IsAvailable    bool      `json:"is_available"`
	StartTime      *string   `json:"start_time,omitempty"`
	EndTime        *string   `json:"end_time,omitempty"`
	Reason         *string   `json:"reason,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// Admin cohort management (Phase 11 admin console).
type CohortAdminRepository interface {
	ListAll(ctx context.Context, params CohortListParams) ([]Cohort, int64, error)
	Create(ctx context.Context, c *Cohort) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status CohortStatus) error
}

// Lesson admin reads.
type LessonAdminRepository interface {
	ListByDate(ctx context.Context, date time.Time) ([]Lesson, error)
}

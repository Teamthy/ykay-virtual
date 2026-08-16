package booking

import (
	"time"

	"github.com/google/uuid"
)

type CohortStatus string

const (
	CohortDraft     CohortStatus = "DRAFT"
	CohortPublished CohortStatus = "PUBLISHED"
	CohortFull      CohortStatus = "FULL"
	CohortOngoing   CohortStatus = "ONGOING"
	CohortCompleted CohortStatus = "COMPLETED"
	CohortCancelled CohortStatus = "CANCELLED"
)

type EnrollmentStatus string

const (
	EnrollmentPending    EnrollmentStatus = "PENDING"
	EnrollmentConfirmed  EnrollmentStatus = "CONFIRMED"
	EnrollmentCancelled  EnrollmentStatus = "CANCELLED"
	EnrollmentRefunded   EnrollmentStatus = "REFUNDED"
	EnrollmentWaitlisted EnrollmentStatus = "WAITLISTED"
)

type PrivateRequestStatus string

const (
	PrivatePending    PrivateRequestStatus = "PENDING"
	PrivateMatched    PrivateRequestStatus = "MATCHED"
	PrivateAssigned   PrivateRequestStatus = "ASSIGNED"
	PrivateInProgress PrivateRequestStatus = "IN_PROGRESS"
	PrivateCompleted  PrivateRequestStatus = "COMPLETED"
	PrivateCancelled  PrivateRequestStatus = "CANCELLED"
)

type LessonStatus string

const (
	LessonScheduled   LessonStatus = "SCHEDULED"
	LessonOngoing     LessonStatus = "ONGOING"
	LessonCompleted   LessonStatus = "COMPLETED"
	LessonCancelled   LessonStatus = "CANCELLED"
	LessonRescheduled LessonStatus = "RESCHEDULED"
	LessonNoShow      LessonStatus = "NO_SHOW"
)

type Cohort struct {
	ID                  uuid.UUID    `json:"id"`
	ProgrammeID         uuid.UUID    `json:"programme_id"`
	Title               string       `json:"title"`
	Slug                string       `json:"slug"`
	TutorProfileID      *uuid.UUID   `json:"tutor_profile_id,omitempty"`
	Capacity            int          `json:"capacity"`
	EnrolledCount       int          `json:"enrolled_count"`
	StartDate           time.Time    `json:"start_date"`
	EndDate             time.Time    `json:"end_date"`
	ScheduleDesc        *string      `json:"schedule_description,omitempty"`
	Timezone            string       `json:"timezone"`
	LocationMode        string       `json:"location_mode"`
	LocationID          *uuid.UUID   `json:"location_id,omitempty"`
	Fee                 float64      `json:"fee"`
	Currency            string       `json:"currency"`
	Status              CohortStatus `json:"status"`
	MeetingLinkTemplate *string      `json:"meeting_link_template,omitempty"`
	CreatedBy           *uuid.UUID   `json:"created_by,omitempty"`
	PublishedAt         *time.Time   `json:"published_at,omitempty"`
	CreatedAt           time.Time    `json:"created_at"`
	UpdatedAt           time.Time    `json:"updated_at"`
}

func (c *Cohort) IsFull() bool    { return c.EnrolledCount >= c.Capacity }
func (c *Cohort) CanEnroll() bool { return c.Status == CohortPublished && !c.IsFull() }

type CohortEnrollment struct {
	ID               uuid.UUID        `json:"id"`
	CohortID         uuid.UUID        `json:"cohort_id"`
	StudentProfileID uuid.UUID        `json:"student_profile_id"`
	ParentUserID     uuid.UUID        `json:"parent_user_id"`
	OrderID          *uuid.UUID       `json:"order_id,omitempty"`
	Status           EnrollmentStatus `json:"status"`
	EnrolledAt       time.Time        `json:"enrolled_at"`
	CancelledAt      *time.Time       `json:"cancelled_at,omitempty"`
	CreatedAt        time.Time        `json:"created_at"`
}

type PrivateTuitionRequest struct {
	ID               uuid.UUID            `json:"id"`
	ParentUserID     uuid.UUID            `json:"parent_user_id"`
	StudentProfileID uuid.UUID            `json:"student_profile_id"`
	SubjectID        uuid.UUID            `json:"subject_id"`
	CurriculumID     *uuid.UUID           `json:"curriculum_id,omitempty"`
	LevelID          *uuid.UUID           `json:"level_id,omitempty"`
	Goals            *string              `json:"goals,omitempty"`
	PreferredDays    *string              `json:"preferred_days,omitempty"`
	PreferredTime    *string              `json:"preferred_time_range,omitempty"`
	Timezone         string               `json:"timezone"`
	LocationMode     string               `json:"location_mode"`
	LocationID       *uuid.UUID           `json:"location_id,omitempty"`
	Status           PrivateRequestStatus `json:"status"`
	MatchedTutorID   *uuid.UUID           `json:"matched_tutor_id,omitempty"`
	CreatedAt        time.Time            `json:"created_at"`
	UpdatedAt        time.Time            `json:"updated_at"`
}

type PrivatePackage struct {
	ID                  uuid.UUID  `json:"id"`
	RequestID           uuid.UUID  `json:"request_id"`
	TutorProfileID      uuid.UUID  `json:"tutor_profile_id"`
	StudentProfileID    uuid.UUID  `json:"student_profile_id"`
	TotalSessions       int        `json:"total_sessions"`
	SessionsUsed        int        `json:"sessions_used"`
	SessionDurationMins int        `json:"session_duration_minutes"`
	PricePerSession     float64    `json:"price_per_session"`
	TotalPrice          float64    `json:"total_price"`
	Currency            string     `json:"currency"`
	ValidFrom           time.Time  `json:"valid_from"`
	ValidUntil          *time.Time `json:"valid_until,omitempty"`
	Status              string     `json:"status"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

func (p *PrivatePackage) RemainingSessions() int {
	return p.TotalSessions - p.SessionsUsed
}

type Lesson struct {
	ID               uuid.UUID  `json:"id"`
	CohortID         *uuid.UUID `json:"cohort_id,omitempty"`
	PrivatePackageID *uuid.UUID `json:"private_package_id,omitempty"`
	TutorProfileID   uuid.UUID  `json:"tutor_profile_id"`
	Title            string     `json:"title"`
	Description      *string    `json:"description,omitempty"`
	StartAt          time.Time  `json:"start_at"`
	EndAt            time.Time  `json:"end_at"`
	Timezone         string     `json:"timezone"`
	MeetingURL       *string    `json:"meeting_url,omitempty"`
	MeetingProvider  string     `json:"meeting_provider"`
	// On-demand video lesson (000035): a pre-recorded lesson students watch
	// in-app, in addition to any live meeting link.
	VideoURL *string `json:"video_url,omitempty"`
	// Meeting-link lifecycle (000028): provider reference for idempotent
	// refresh, link expiry and the participant join window. Internal state —
	// never serialized into lesson API payloads (MeetingService exposes
	// these through the dedicated meeting endpoints).
	MeetingRef        string       `json:"-"`
	MeetingExpiresAt  *time.Time   `json:"-"`
	JoinWindowMinutes int          `json:"-"`
	LocationID        *uuid.UUID   `json:"location_id,omitempty"`
	Status            LessonStatus `json:"status"`
	CreatedBy         *uuid.UUID   `json:"created_by,omitempty"`
	CreatedAt         time.Time    `json:"created_at"`
	UpdatedAt         time.Time    `json:"updated_at"`
}

func (l *Lesson) Overlaps(other Lesson) bool {
	return l.TutorProfileID == other.TutorProfileID && l.StartAt.Before(other.EndAt) && other.StartAt.Before(l.EndAt)
}

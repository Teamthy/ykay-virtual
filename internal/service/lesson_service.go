package service

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/tutor"

	"github.com/google/uuid"
)

// LessonService — teaching operations (MVP): cohort sessions, attendance,
// lesson notes, resources and assignments.
//
// AUTHORIZATION (A-02): ownership is enforced here, fail-closed. Every
// mutating/roster method takes (actorUserID, isAdmin) and verifies the actor
// owns the lesson/cohort (tutor profile → user match) or is a platform admin.
// Content reads additionally allow learners ENROLLED in the cohort. When the
// ownership lookups are not wired the check returns ErrForbidden — it can
// never silently degrade to "anyone may act" (the previous nil-guard made
// ownership checks effectively disabled in production).

type LessonService struct {
	lessons     booking.LessonRepository
	attendance  booking.AttendanceRepository
	notes       booking.LessonNoteRepository
	resources   booking.ResourceRepository
	assignments booking.AssignmentRepository
	enrollments booking.CohortEnrollmentRepository
	studentByID func(ctx context.Context, id uuid.UUID) (*identity.StudentProfile, error)
	tutorByID   func(ctx context.Context, id uuid.UUID) (*tutor.TutorProfile, error)

	// Authorization lookups (A-02). Optional but REQUIRED for enforcement:
	// when nil, the corresponding check fails closed with ErrForbidden.
	cohortByID      func(ctx context.Context, id uuid.UUID) (*booking.Cohort, error)
	studentByUserID func(ctx context.Context, userID uuid.UUID) (*identity.StudentProfile, error)
	enrollmentCheck func(ctx context.Context, cohortID, studentProfileID uuid.UUID) (bool, error)
}

// RosterEntry — one enrolled learner in a cohort (tutor console).
type RosterEntry struct {
	StudentProfileID uuid.UUID `json:"student_profile_id"`
	Name             string    `json:"name"`
	Status           string    `json:"status"`
	EnrolledAt       time.Time `json:"enrolled_at"`
}

func NewLessonService(lessons booking.LessonRepository, attendance booking.AttendanceRepository,
	notes booking.LessonNoteRepository, resources booking.ResourceRepository,
	assignments booking.AssignmentRepository) *LessonService {
	return &LessonService{
		lessons: lessons, attendance: attendance, notes: notes,
		resources: resources, assignments: assignments,
	}
}

// WithRoster wires the enrollment + student-profile lookups used by the
// tutor console roster.
func (s *LessonService) WithRoster(enrollments booking.CohortEnrollmentRepository,
	studentByID func(ctx context.Context, id uuid.UUID) (*identity.StudentProfile, error)) *LessonService {
	s.enrollments = enrollments
	s.studentByID = studentByID
	return s
}

// WithTutorReader wires the tutor-profile lookup used for ownership checks.
func (s *LessonService) WithTutorReader(fn func(ctx context.Context, id uuid.UUID) (*tutor.TutorProfile, error)) *LessonService {
	s.tutorByID = fn
	return s
}

// WithCohortReader wires the cohort lookup used for cohort ownership checks.
func (s *LessonService) WithCohortReader(fn func(ctx context.Context, id uuid.UUID) (*booking.Cohort, error)) *LessonService {
	s.cohortByID = fn
	return s
}

// WithEnrollmentAccess wires the lookups used to grant enrolled learners
// read access to their cohort's content (resources/assignments/notes).
func (s *LessonService) WithEnrollmentAccess(
	studentByUserID func(ctx context.Context, userID uuid.UUID) (*identity.StudentProfile, error),
	enrollmentCheck func(ctx context.Context, cohortID, studentProfileID uuid.UUID) (bool, error),
) *LessonService {
	s.studentByUserID = studentByUserID
	s.enrollmentCheck = enrollmentCheck
	return s
}

// --- Ownership helpers (fail-closed) -------------------------------------

var errOwnershipUnavailable = errors.New("ownership verification unavailable")

// ownsLesson — verifies the actor's user owns the lesson's tutor profile.
// Fails closed when the tutor reader is not wired.
func (s *LessonService) ownsLesson(ctx context.Context, actorUserID uuid.UUID, lesson *booking.Lesson) error {
	if s.tutorByID == nil {
		return fmt.Errorf("%w: %v", domain.ErrForbidden, errOwnershipUnavailable)
	}
	profile, err := s.tutorByID(ctx, lesson.TutorProfileID)
	if err != nil {
		return fmt.Errorf("%w: lesson tutor not found", domain.ErrNotFound)
	}
	if profile.UserID != actorUserID {
		return fmt.Errorf("%w: only the lesson's tutor can do this", domain.ErrForbidden)
	}
	return nil
}

// ownsCohort — verifies the actor's user owns the cohort's assigned tutor
// profile. Fails closed when the cohort/tutor readers are not wired.
func (s *LessonService) ownsCohort(ctx context.Context, actorUserID uuid.UUID, cohortID uuid.UUID) error {
	if s.cohortByID == nil {
		return fmt.Errorf("%w: %v", domain.ErrForbidden, errOwnershipUnavailable)
	}
	cohort, err := s.cohortByID(ctx, cohortID)
	if err != nil {
		return err // ErrNotFound propagates as 404
	}
	if cohort.TutorProfileID == nil {
		return fmt.Errorf("%w: cohort has no assigned tutor", domain.ErrForbidden)
	}
	if s.tutorByID == nil {
		return fmt.Errorf("%w: %v", domain.ErrForbidden, errOwnershipUnavailable)
	}
	profile, err := s.tutorByID(ctx, *cohort.TutorProfileID)
	if err != nil {
		return fmt.Errorf("%w: cohort tutor not found", domain.ErrNotFound)
	}
	if profile.UserID != actorUserID {
		return fmt.Errorf("%w: only the cohort's tutor can do this", domain.ErrForbidden)
	}
	return nil
}

// tutorScope — tutor-owner-or-admin gate for authoring/roster operations.
func (s *LessonService) lessonTutorScope(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, lessonID uuid.UUID) (*booking.Lesson, error) {
	lesson, err := s.lessons.GetByID(ctx, lessonID)
	if err != nil {
		return nil, err
	}
	if isAdmin {
		return lesson, nil
	}
	if err := s.ownsLesson(ctx, actorUserID, lesson); err != nil {
		return nil, err
	}
	return lesson, nil
}

// cohortTutorScope — tutor-owner-or-admin gate for cohort-scoped authoring.
func (s *LessonService) cohortTutorScope(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, cohortID uuid.UUID) error {
	if isAdmin {
		return nil
	}
	return s.ownsCohort(ctx, actorUserID, cohortID)
}

// canAccessCohort — content-read gate: admin, the cohort's tutor, or an
// enrolled learner (resolved via their student profile).
func (s *LessonService) canAccessCohort(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, cohortID uuid.UUID) error {
	if isAdmin {
		return nil
	}
	if err := s.ownsCohort(ctx, actorUserID, cohortID); err == nil {
		return nil
	} else if !errors.Is(err, domain.ErrForbidden) {
		return err // cohort missing / store unavailable → propagate
	}
	if s.studentByUserID == nil || s.enrollmentCheck == nil {
		return fmt.Errorf("%w: cohort content requires enrollment", domain.ErrForbidden)
	}
	profile, err := s.studentByUserID(ctx, actorUserID)
	if err != nil || profile == nil {
		return fmt.Errorf("%w: cohort content requires enrollment", domain.ErrForbidden)
	}
	ok, err := s.enrollmentCheck(ctx, cohortID, profile.ID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("%w: cohort content requires enrollment", domain.ErrForbidden)
	}
	return nil
}

// CanAccessCohort reports whether the actor may see a cohort's private
// schedule details (meeting/video URLs). Public callers still get the
// redacted schedule — this only upgrades them to the full view.
// ScheduleLessonInput — fields to create a live lesson.
type ScheduleLessonInput struct {
	CohortID         *uuid.UUID
	PrivatePackageID *uuid.UUID
	TutorProfileID   uuid.UUID
	Title            string
	Description      *string
	StartAt          time.Time
	EndAt            time.Time
	Timezone         string
	MeetingProvider  string
}

// ScheduleLesson — creates a live lesson with the FR-10 / AC-05 double-booking
// guard: a tutor can never be booked for two live lessons whose windows
// overlap. Only non-cancelled lessons count, so cancelled slots can be reused.
func (s *LessonService) ScheduleLesson(ctx context.Context, in ScheduleLessonInput) (*booking.Lesson, error) {
	if in.CohortID == nil && in.PrivatePackageID == nil {
		return nil, fmt.Errorf("%w: a lesson must belong to a cohort or a private package", domain.ErrInvalidInput)
	}
	if strings.TrimSpace(in.Title) == "" {
		return nil, fmt.Errorf("%w: lesson title is required", domain.ErrInvalidInput)
	}
	if !in.EndAt.After(in.StartAt) {
		return nil, fmt.Errorf("%w: end_at must be after start_at", domain.ErrInvalidInput)
	}
	if in.Timezone == "" {
		in.Timezone = "Africa/Lagos"
	}

	// FR-10 / AC-05: reject double-booking before it can reach the calendar.
	if s.lessons != nil {
		conflict, err := s.lessons.HasOverlappingLessons(ctx, in.TutorProfileID, in.StartAt, in.EndAt, nil)
		if err != nil {
			return nil, err
		}
		if conflict {
			return nil, fmt.Errorf("%w: tutor is already booked for an overlapping lesson at %s",
				domain.ErrConflict, in.StartAt.Format(time.RFC3339))
		}
	}

	lesson := &booking.Lesson{
		CohortID:         in.CohortID,
		PrivatePackageID: in.PrivatePackageID,
		TutorProfileID:   in.TutorProfileID,
		Title:            in.Title,
		Description:      in.Description,
		StartAt:          in.StartAt,
		EndAt:            in.EndAt,
		Timezone:         in.Timezone,
		MeetingProvider:  in.MeetingProvider,
		Status:           booking.LessonScheduled,
	}
	if err := s.lessons.Create(ctx, lesson); err != nil {
		return nil, err
	}
	return lesson, nil
}

// RescheduleLesson — FR-23: the lesson's tutor (or an admin) moves a lesson
// to a new time window. The double-booking guard applies, excluding the
// lesson itself; COMPLETED/CANCELLED lessons cannot be rescheduled.
func (s *LessonService) RescheduleLesson(ctx context.Context, actorUserID uuid.UUID, isAdmin bool,
	lessonID uuid.UUID, startAt, endAt time.Time) (*booking.Lesson, error) {

	if !endAt.After(startAt) {
		return nil, fmt.Errorf("%w: end_at must be after start_at", domain.ErrInvalidInput)
	}
	lesson, err := s.lessonTutorScope(ctx, actorUserID, isAdmin, lessonID)
	if err != nil {
		return nil, err
	}
	switch lesson.Status {
	case booking.LessonCompleted, booking.LessonCancelled:
		return nil, fmt.Errorf("%w: a %s lesson cannot be rescheduled", domain.ErrConflict, lesson.Status)
	}
	conflict, err := s.lessons.HasOverlappingLessons(ctx, lesson.TutorProfileID, startAt, endAt, &lesson.ID)
	if err != nil {
		return nil, err
	}
	if conflict {
		return nil, fmt.Errorf("%w: tutor is already booked for an overlapping lesson at %s",
			domain.ErrConflict, startAt.Format(time.RFC3339))
	}
	if err := s.lessons.Reschedule(ctx, lesson.ID, startAt, endAt); err != nil {
		return nil, err
	}
	lesson.StartAt = startAt
	lesson.EndAt = endAt
	lesson.Status = booking.LessonRescheduled
	return lesson, nil
}

// CancelLesson — FR-23: the lesson's tutor (or an admin) cancels a lesson.
// Cancelled lessons free the tutor's calendar (the double-booking guard
// ignores CANCELLED) and surface as cancelled on every enrolled learner's
// schedule. COMPLETED lessons cannot be cancelled; cancelling twice is a
// no-op conflict.
func (s *LessonService) CancelLesson(ctx context.Context, actorUserID uuid.UUID, isAdmin bool,
	lessonID uuid.UUID) (*booking.Lesson, error) {

	lesson, err := s.lessonTutorScope(ctx, actorUserID, isAdmin, lessonID)
	if err != nil {
		return nil, err
	}
	switch lesson.Status {
	case booking.LessonCompleted:
		return nil, fmt.Errorf("%w: a completed lesson cannot be cancelled", domain.ErrConflict)
	case booking.LessonCancelled:
		return nil, fmt.Errorf("%w: lesson is already cancelled", domain.ErrConflict)
	}
	if err := s.lessons.UpdateStatus(ctx, lesson.ID, booking.LessonCancelled); err != nil {
		return nil, err
	}
	lesson.Status = booking.LessonCancelled
	return lesson, nil
}

// SetRecordedVideo — admin/tutor attaches (or clears) a recorded-lesson video
// URL on a lesson. Only the cohort's tutor or a platform admin may do so.
func (s *LessonService) SetRecordedVideo(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, lessonID uuid.UUID, videoURL *string) error {
	lesson, err := s.lessons.GetByID(ctx, lessonID)
	if err != nil {
		return err
	}
	if lesson.CohortID != nil {
		if err := s.cohortTutorScope(ctx, actorUserID, isAdmin, *lesson.CohortID); err != nil {
			return err
		}
	} else if !isAdmin {
		return domain.ErrForbidden
	}
	return s.lessons.SetVideoURL(ctx, lessonID, videoURL)
}

// SetLessonTranscript — admin/tutor attaches (or clears) a plain-text
// transcript on a lesson. Same ownership scope as SetRecordedVideo: the
// cohort's tutor or a platform admin. Empty string clears.
func (s *LessonService) SetLessonTranscript(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, lessonID uuid.UUID, transcript *string) error {
	if transcript != nil {
		if t := *transcript; len(t) > 100_000 {
			return fmt.Errorf("%w: transcript too long (max 100,000 characters)", domain.ErrInvalidInput)
		}
	}
	// Same ownership rule as reschedule/cancel: the lesson's tutor (cohort
	// or private) or a platform admin.
	if _, err := s.lessonTutorScope(ctx, actorUserID, isAdmin, lessonID); err != nil {
		return err
	}
	return s.lessons.SetTranscript(ctx, lessonID, transcript)
}

// ListRecordedLibrary — the recorded-lesson library for an enrolled learner.
// Returns the video lessons the caller is entitled to across their cohorts.
// Ownership (actor must be the learner or an admin) is enforced here.
func (s *LessonService) ListRecordedLibrary(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, studentProfileID uuid.UUID, limit int) ([]booking.Lesson, error) {
	if s.lessons == nil {
		return []booking.Lesson{}, nil
	}
	if !isAdmin {
		if s.studentByUserID == nil {
			return nil, domain.ErrForbidden
		}
		own, err := s.studentByUserID(ctx, actorUserID)
		if err != nil || own == nil || own.ID != studentProfileID {
			// The actor is not the learner; they must be a linked parent. If
			// the learner is themselves, this is the learner. Otherwise reject.
			// (Linked-parent authorization is covered by the calling layer;
			// here we fail closed unless the actor IS the learner or admin.)
			return nil, domain.ErrForbidden
		}
	}
	return s.lessons.ListRecordedForStudent(ctx, studentProfileID, limit)
}

func (s *LessonService) CanAccessCohort(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, cohortID uuid.UUID) bool {
	return s.canAccessCohort(ctx, actorUserID, isAdmin, cohortID) == nil
}

// --- Cohort-scoped teaching operations -----------------------------------

// CreateAssignment — adds an assignment to a cohort (tutor console).
func (s *LessonService) CreateAssignment(ctx context.Context, actorUserID uuid.UUID, isAdmin bool,
	cohortID uuid.UUID, title string, instructions *string, dueAt *time.Time, maxScore *float64) (*booking.Assignment, error) {
	if strings.TrimSpace(title) == "" {
		return nil, fmt.Errorf("%w: assignment title is required", domain.ErrInvalidInput)
	}
	if err := s.cohortTutorScope(ctx, actorUserID, isAdmin, cohortID); err != nil {
		return nil, err
	}
	if s.assignments == nil {
		return nil, domain.ErrNotFound
	}
	a := &booking.Assignment{
		ID: uuid.New(), CohortID: &cohortID, Title: strings.TrimSpace(title),
		Instructions: instructions, DueAt: dueAt, MaxScore: maxScore,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.assignments.Create(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

// NormalizeResourceURL validates a resource link and rewrites known
// third-party URLs into student-friendly forms:
//   - Google Drive share links → /preview (embeddable, opens in-app/browser)
//   - only http(s) URLs are accepted (never javascript: or file: schemes)
func NormalizeResourceURL(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", nil
	}
	u, err := url.Parse(trimmed)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return "", fmt.Errorf("%w: resource link must be a full https URL", domain.ErrInvalidInput)
	}
	host := strings.ToLower(u.Host)
	// drive.google.com/file/d/<id>/... → /preview
	if (host == "drive.google.com" || host == "docs.google.com") &&
		strings.HasPrefix(u.Path, "/file/d/") {
		parts := strings.Split(strings.Trim(u.Path, "/"), "/")
		if len(parts) >= 3 {
			fileID := parts[2]
			// Google Drive file ids are 20-60 chars of [A-Za-z0-9_-].
			ok := len(fileID) >= 20 && len(fileID) <= 60
			for _, c := range fileID {
				if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '-' || c == '_') {
					ok = false
					break
				}
			}
			if !ok {
				return "", fmt.Errorf("%w: invalid Google Drive file id", domain.ErrInvalidInput)
			}
			return "https://drive.google.com/file/d/" + fileID + "/preview", nil
		}
	}
	return trimmed, nil
}

// CreateResource — adds a resource (material link) to a cohort.
func (s *LessonService) CreateResource(ctx context.Context, actorUserID uuid.UUID, isAdmin bool,
	cohortID uuid.UUID, title string, description, fileURL *string) (*booking.Resource, error) {
	if strings.TrimSpace(title) == "" {
		return nil, fmt.Errorf("%w: resource title is required", domain.ErrInvalidInput)
	}
	if err := s.cohortTutorScope(ctx, actorUserID, isAdmin, cohortID); err != nil {
		return nil, err
	}
	if s.resources == nil {
		return nil, domain.ErrNotFound
	}
	// Normalize the material link (Google Drive share URLs → preview URLs;
	// reject non-https schemes) so learners open it directly.
	var normalized *string
	if fileURL != nil {
		n, err := NormalizeResourceURL(*fileURL)
		if err != nil {
			return nil, err
		}
		normalized = &n
	}
	r := &booking.Resource{
		ID: uuid.New(), CohortID: &cohortID, Title: strings.TrimSpace(title),
		Description: description, FileURL: normalized, IsPublic: true,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.resources.Create(ctx, r); err != nil {
		return nil, err
	}
	return r, nil
}

// ListCohortEnrollments — roster of enrolled learners for the tutor console
// (learner records = PII → tutor-owner or admin only).
func (s *LessonService) ListCohortEnrollments(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, cohortID uuid.UUID) ([]RosterEntry, error) {
	if err := s.cohortTutorScope(ctx, actorUserID, isAdmin, cohortID); err != nil {
		return nil, err
	}
	if s.enrollments == nil {
		return []RosterEntry{}, nil
	}
	list, err := s.enrollments.ListByCohort(ctx, cohortID)
	if err != nil {
		return nil, err
	}
	out := make([]RosterEntry, 0, len(list))
	for _, e := range list {
		name := ""
		if s.studentByID != nil {
			if p, err := s.studentByID(ctx, e.StudentProfileID); err == nil && p != nil {
				name = strings.TrimSpace(p.FirstName + " " + p.LastName)
			}
		}
		out = append(out, RosterEntry{
			StudentProfileID: e.StudentProfileID, Name: name,
			Status: string(e.Status), EnrolledAt: e.EnrolledAt,
		})
	}
	return out, nil
}

// ListCohortLessons — the session schedule for a cohort (public read; the
// handler redacts private URLs for callers who cannot access the cohort).
func (s *LessonService) ListCohortLessons(ctx context.Context, cohortID uuid.UUID, limit int) ([]booking.Lesson, error) {
	if s.lessons == nil {
		return []booking.Lesson{}, nil
	}
	return s.lessons.ListByCohort(ctx, cohortID, limit)
}

// --- Lesson-scoped teaching operations ------------------------------------

// MarkAttendance — tutor marks attendance for one of their lessons.
func (s *LessonService) MarkAttendance(ctx context.Context, actorUserID uuid.UUID, isAdmin bool,
	lessonID, studentProfileID uuid.UUID, status string, note *string) error {

	status = strings.ToUpper(strings.TrimSpace(status))
	switch status {
	case "PRESENT", "ABSENT", "LATE", "EXCUSED":
	default:
		return fmt.Errorf("%w: status must be PRESENT, ABSENT, LATE or EXCUSED", domain.ErrInvalidInput)
	}
	if s.lessons == nil || s.attendance == nil {
		return errors.New("teaching-ops store unavailable")
	}
	if _, err := s.lessonTutorScope(ctx, actorUserID, isAdmin, lessonID); err != nil {
		return err
	}
	return s.attendance.Upsert(ctx, lessonID, studentProfileID, status, actorUserID, note)
}

// ListLessonAttendance — learner records for a lesson (tutor-owner/admin).
func (s *LessonService) ListLessonAttendance(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, lessonID uuid.UUID) ([]booking.Attendance, error) {
	if s.lessons == nil || s.attendance == nil {
		return []booking.Attendance{}, nil
	}
	if _, err := s.lessonTutorScope(ctx, actorUserID, isAdmin, lessonID); err != nil {
		return nil, err
	}
	return s.attendance.ListByLesson(ctx, lessonID)
}

// AddLessonNote — tutor writes the lesson summary + homework.
func (s *LessonService) AddLessonNote(ctx context.Context, actorUserID uuid.UUID, isAdmin bool,
	lessonID uuid.UUID, studentID *uuid.UUID, content string, homework *string, visible bool) (*booking.LessonNote, error) {

	if strings.TrimSpace(content) == "" {
		return nil, fmt.Errorf("%w: note content is required", domain.ErrInvalidInput)
	}
	if s.lessons == nil || s.notes == nil {
		return nil, errors.New("teaching-ops store unavailable")
	}
	lesson, err := s.lessonTutorScope(ctx, actorUserID, isAdmin, lessonID)
	if err != nil {
		return nil, err
	}
	n := &booking.LessonNote{
		LessonID:          lessonID,
		TutorProfileID:    lesson.TutorProfileID,
		StudentProfileID:  studentID,
		Content:           strings.TrimSpace(content),
		Homework:          homework,
		IsVisibleToParent: visible,
	}
	if err := s.notes.Create(ctx, n); err != nil {
		return nil, err
	}
	return n, nil
}

// ListLessonNotes — lesson summary + homework. Visible to the lesson's tutor
// (owner) or admin, and to learners enrolled in the lesson's cohort.
func (s *LessonService) ListLessonNotes(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, lessonID uuid.UUID) ([]booking.LessonNote, error) {
	if s.lessons == nil || s.notes == nil {
		return []booking.LessonNote{}, nil
	}
	if err := s.canAccessLesson(ctx, actorUserID, isAdmin, lessonID); err != nil {
		return nil, err
	}
	return s.notes.ListByLesson(ctx, lessonID)
}

// ListCohortResources — cohort material. Tutor-owner/admin or enrolled learner.
func (s *LessonService) ListCohortResources(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, cohortID uuid.UUID) ([]booking.Resource, error) {
	if err := s.canAccessCohort(ctx, actorUserID, isAdmin, cohortID); err != nil {
		return nil, err
	}
	if s.resources == nil {
		return []booking.Resource{}, nil
	}
	return s.resources.ListByCohort(ctx, cohortID)
}

// ListCohortAssignments — cohort assignments. Tutor-owner/admin or enrolled learner.
func (s *LessonService) ListCohortAssignments(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, cohortID uuid.UUID) ([]booking.Assignment, error) {
	if err := s.canAccessCohort(ctx, actorUserID, isAdmin, cohortID); err != nil {
		return nil, err
	}
	if s.assignments == nil {
		return []booking.Assignment{}, nil
	}
	return s.assignments.ListByCohort(ctx, cohortID)
}

// canAccessLesson — content-read gate for a single lesson: admin, the
// lesson's tutor, or a learner enrolled in the lesson's cohort.
func (s *LessonService) canAccessLesson(ctx context.Context, actorUserID uuid.UUID, isAdmin bool, lessonID uuid.UUID) error {
	if isAdmin {
		return nil
	}
	lesson, err := s.lessons.GetByID(ctx, lessonID)
	if err != nil {
		return err
	}
	if err := s.ownsLesson(ctx, actorUserID, lesson); err == nil {
		return nil
	}
	if lesson.CohortID != nil {
		return s.canAccessCohort(ctx, actorUserID, false, *lesson.CohortID)
	}
	return fmt.Errorf("%w: only enrolled learners can view this lesson's content", domain.ErrForbidden)
}

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
	"ykay-virtual/internal/domain/tutor"

	"github.com/google/uuid"
)

// LessonService — teaching operations (MVP): cohort sessions, attendance,
// lesson notes, resources and assignments. Authorization is enforced here:
// tutors act only on their own lessons (tutor profile → user match).

type LessonService struct {
	lessons     booking.LessonRepository
	attendance  booking.AttendanceRepository
	notes       booking.LessonNoteRepository
	resources   booking.ResourceRepository
	assignments booking.AssignmentRepository
	enrollments booking.CohortEnrollmentRepository
	studentByID func(ctx context.Context, id uuid.UUID) (*identity.StudentProfile, error)
	tutorByID   func(ctx context.Context, id uuid.UUID) (*tutor.TutorProfile, error)
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

// CreateAssignment — adds an assignment to a cohort (tutor console).
func (s *LessonService) CreateAssignment(ctx context.Context, cohortID uuid.UUID, title string,
	instructions *string, dueAt *time.Time, maxScore *float64) (*booking.Assignment, error) {
	if strings.TrimSpace(title) == "" {
		return nil, fmt.Errorf("%w: assignment title is required", domain.ErrInvalidInput)
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

// CreateResource — adds a resource (material link) to a cohort.
func (s *LessonService) CreateResource(ctx context.Context, cohortID uuid.UUID, title string,
	description, fileURL *string) (*booking.Resource, error) {
	if strings.TrimSpace(title) == "" {
		return nil, fmt.Errorf("%w: resource title is required", domain.ErrInvalidInput)
	}
	if s.resources == nil {
		return nil, domain.ErrNotFound
	}
	r := &booking.Resource{
		ID: uuid.New(), CohortID: &cohortID, Title: strings.TrimSpace(title),
		Description: description, FileURL: fileURL, IsPublic: true,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.resources.Create(ctx, r); err != nil {
		return nil, err
	}
	return r, nil
}

// ListCohortEnrollments — roster of enrolled learners for the tutor console.
func (s *LessonService) ListCohortEnrollments(ctx context.Context, cohortID uuid.UUID) ([]RosterEntry, error) {
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

// ownsLesson — verifies the actor's user owns the lesson's tutor profile.
func (s *LessonService) ownsLesson(ctx context.Context, actorUserID uuid.UUID, lesson *booking.Lesson) error {
	if s.tutorByID == nil {
		return nil // ownership checks disabled (dev mode)
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

// ListCohortLessons — the session schedule for a cohort (public read).
func (s *LessonService) ListCohortLessons(ctx context.Context, cohortID uuid.UUID, limit int) ([]booking.Lesson, error) {
	if s.lessons == nil {
		return []booking.Lesson{}, nil
	}
	return s.lessons.ListByCohort(ctx, cohortID, limit)
}

// MarkAttendance — tutor marks attendance for one of their lessons.
func (s *LessonService) MarkAttendance(ctx context.Context, actorUserID uuid.UUID,
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
	lesson, err := s.lessons.GetByID(ctx, lessonID)
	if err != nil {
		return err
	}
	if err := s.ownsLesson(ctx, actorUserID, lesson); err != nil {
		return err
	}
	return s.attendance.Upsert(ctx, lessonID, studentProfileID, status, actorUserID, note)
}

func (s *LessonService) ListLessonAttendance(ctx context.Context, lessonID uuid.UUID) ([]booking.Attendance, error) {
	if s.attendance == nil {
		return []booking.Attendance{}, nil
	}
	return s.attendance.ListByLesson(ctx, lessonID)
}

// AddLessonNote — tutor writes the lesson summary + homework.
func (s *LessonService) AddLessonNote(ctx context.Context, actorUserID uuid.UUID,
	lessonID uuid.UUID, studentID *uuid.UUID, content string, homework *string, visible bool) (*booking.LessonNote, error) {

	if strings.TrimSpace(content) == "" {
		return nil, fmt.Errorf("%w: note content is required", domain.ErrInvalidInput)
	}
	if s.lessons == nil || s.notes == nil {
		return nil, errors.New("teaching-ops store unavailable")
	}
	lesson, err := s.lessons.GetByID(ctx, lessonID)
	if err != nil {
		return nil, err
	}
	if err := s.ownsLesson(ctx, actorUserID, lesson); err != nil {
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

func (s *LessonService) ListLessonNotes(ctx context.Context, lessonID uuid.UUID) ([]booking.LessonNote, error) {
	if s.notes == nil {
		return []booking.LessonNote{}, nil
	}
	return s.notes.ListByLesson(ctx, lessonID)
}

func (s *LessonService) ListCohortResources(ctx context.Context, cohortID uuid.UUID) ([]booking.Resource, error) {
	if s.resources == nil {
		return []booking.Resource{}, nil
	}
	return s.resources.ListByCohort(ctx, cohortID)
}

func (s *LessonService) ListCohortAssignments(ctx context.Context, cohortID uuid.UUID) ([]booking.Assignment, error) {
	if s.assignments == nil {
		return []booking.Assignment{}, nil
	}
	return s.assignments.ListByCohort(ctx, cohortID)
}

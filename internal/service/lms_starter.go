package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"ykay-virtual/internal/domain/booking"

	"github.com/google/uuid"
)

// LMSStarterService — every tutor attached to a cohort gets a fully
// functional LMS out of the box: a recorded demo lesson slot, a getting-
// started study resource, a welcome assignment and a lesson note with
// homework. Idempotent per cohort: repeat calls never duplicate content.
type LMSStarterService struct {
	lessons     booking.LessonRepository
	resources   booking.ResourceRepository
	assignments booking.AssignmentRepository
	notes       booking.LessonNoteRepository
}

func NewLMSStarterService(
	lessons booking.LessonRepository,
	resources booking.ResourceRepository,
	assignments booking.AssignmentRepository,
	notes booking.LessonNoteRepository,
) *LMSStarterService {
	return &LMSStarterService{lessons: lessons, resources: resources, assignments: assignments, notes: notes}
}

func f64PtrLocal(v float64) *float64 { return &v }

// Starter pack constants (public demo content — safe in every environment).
const (
	starterVideoURL = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
	starterPDFURL   = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
	starterLesson   = "Welcome & how this class works (recorded)"
	starterResource = "Getting started — study guide (PDF)"
	starterAssign   = "Welcome worksheet"
	starterNote     = "Welcome note & first homework"
)

// EnsureCohortPack — attaches the starter LMS pack to a cohort for the given
// tutor. Safe to call every time a tutor is assigned/approved: each piece is
// created only when missing.
func (s *LMSStarterService) EnsureCohortPack(ctx context.Context, cohortID, tutorProfileID uuid.UUID, cohortTitle string) error {
	if s.lessons == nil || s.resources == nil || s.assignments == nil || s.notes == nil {
		return fmt.Errorf("lms starter pack stores unavailable")
	}
	title := strings.TrimSpace(cohortTitle)
	if title == "" {
		title = "your cohort"
	}

	// 1. Recorded demo lesson slot.
	var lessonID uuid.UUID
	if existing, err := s.lessons.ListByCohort(ctx, cohortID, 50); err == nil {
		for _, l := range existing {
			if l.Title == starterLesson {
				lessonID = l.ID
				break
			}
		}
	}
	if lessonID == uuid.Nil {
		start := time.Now().UTC().Add(7 * 24 * time.Hour)
		lesson := &booking.Lesson{
			ID:              uuid.New(),
			CohortID:        &cohortID,
			TutorProfileID:  tutorProfileID,
			Title:           starterLesson,
			Description:     strPtrOrNil("Welcome to " + title + " — watch this recorded lesson first."),
			StartAt:         start,
			EndAt:           start.Add(30 * time.Minute),
			Timezone:        "Africa/Lagos",
			MeetingProvider: "GOOGLE_MEET",
			Status:          booking.LessonScheduled,
			VideoURL:        strPtrOrNil(starterVideoURL),
		}
		if err := s.lessons.Create(ctx, lesson); err != nil {
			return fmt.Errorf("starter lesson: %w", err)
		}
		lessonID = lesson.ID
	}

	// 2. Study resource.
	if existing, err := s.resources.ListByCohort(ctx, cohortID); err == nil {
		for _, r := range existing {
			if r.Title == starterResource {
				goto resourcesDone
			}
		}
		if err := s.resources.Create(ctx, &booking.Resource{
			ID:          uuid.New(),
			CohortID:    &cohortID,
			LessonID:    &lessonID,
			Title:       starterResource,
			Description: strPtrOrNil("Starter study material for every enrolled learner — syllabus, expectations and week-one reading."),
			FileURL:     strPtrOrNil(starterPDFURL),
			IsPublic:    true,
		}); err != nil {
			return fmt.Errorf("starter resource: %w", err)
		}
	}
resourcesDone:

	// 3. Welcome assignment.
	if existing, err := s.assignments.ListByCohort(ctx, cohortID); err == nil {
		for _, a := range existing {
			if a.Title == starterAssign {
				goto assignDone
			}
		}
		due := time.Now().UTC().Add(21 * 24 * time.Hour)
		if err := s.assignments.Create(ctx, &booking.Assignment{
			ID:           uuid.New(),
			CohortID:     &cohortID,
			LessonID:     &lessonID,
			Title:        starterAssign,
			Instructions: strPtrOrNil("Complete the welcome worksheet and upload your working — it helps the tutor pace the class."),
			DueAt:        &due,
			MaxScore:     f64PtrLocal(20),
		}); err != nil {
			return fmt.Errorf("starter assignment: %w", err)
		}
	}
assignDone:

	// 4. Lesson note + homework.
	if existing, err := s.notes.ListByLesson(ctx, lessonID); err == nil {
		for _, n := range existing {
			if strings.HasPrefix(n.Content, "Welcome to ") {
				return nil
			}
		}
	}
	if err := s.notes.Create(ctx, &booking.LessonNote{
		ID:                uuid.New(),
		LessonID:          lessonID,
		TutorProfileID:    tutorProfileID,
		Content:           "Welcome to " + title + "! This note covers how live classes, recordings and homework work on NUVORA.",
		Homework:          strPtrOrNil("Complete the welcome worksheet before the first live session."),
		IsVisibleToParent: true,
	}); err != nil {
		return fmt.Errorf("starter lesson note: %w", err)
	}
	return nil
}

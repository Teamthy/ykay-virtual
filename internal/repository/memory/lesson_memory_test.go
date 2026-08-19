package memory

import (
	"context"
	"testing"
	"time"

	"ykay-virtual/internal/domain/booking"

	"github.com/google/uuid"
)

// TestLessonOverlapGuard covers the FR-10 / AC-05 double-booking guard
// semantics: overlapping windows conflict, exact-boundary touches do not,
// cancelled lessons never block, and each tutor is independent.
func TestLessonOverlapGuard(t *testing.T) {
	ctx := context.Background()
	m := NewLessonMemory()

	tutorA := uuid.New()
	tutorB := uuid.New()
	cohort := uuid.New()
	t0 := time.Date(2026, 9, 1, 10, 0, 0, 0, time.UTC)

	// Existing lesson: 10:00–11:00 for tutorA.
	existing := &booking.Lesson{
		CohortID:       &cohort,
		TutorProfileID: tutorA,
		Title:          "Existing",
		StartAt:        t0,
		EndAt:          t0.Add(time.Hour),
		Timezone:       "Africa/Lagos",
		Status:         booking.LessonScheduled,
	}
	m.Seed(existing)

	cases := []struct {
		name  string
		tutor uuid.UUID
		start time.Time
		end   time.Time
		want  bool
	}{
		{"overlap inside", tutorA, t0.Add(15 * time.Minute), t0.Add(45 * time.Minute), true},
		{"overlap straddles", tutorA, t0.Add(-30 * time.Minute), t0.Add(90 * time.Minute), true},
		{"overlap start-touch-inside", tutorA, t0.Add(30 * time.Minute), t0.Add(2 * time.Hour), true},
		{"exact same window", tutorA, t0, t0.Add(time.Hour), true},
		{"back-to-back ok", tutorA, t0.Add(time.Hour), t0.Add(2 * time.Hour), false},
		{"before ok", tutorA, t0.Add(-time.Hour), t0, false},
		{"different tutor ok", tutorB, t0, t0.Add(time.Hour), false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := m.HasOverlappingLessons(ctx, tc.tutor, tc.start, tc.end, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("HasOverlappingLessons(%s, %s..%s) = %v, want %v", tc.tutor, tc.start, tc.end, got, tc.want)
			}
		})
	}

	// Cancelled lessons never block (reuse of a cancelled slot).
	cancelled := &booking.Lesson{
		CohortID:       &cohort,
		TutorProfileID: tutorA,
		Title:          "Cancelled",
		StartAt:        t0.Add(2 * time.Hour),
		EndAt:          t0.Add(3 * time.Hour),
		Status:         booking.LessonCancelled,
	}
	m.Seed(cancelled)
	got, err := m.HasOverlappingLessons(ctx, tutorA, t0.Add(2*time.Hour+time.Minute), t0.Add(2*time.Hour+30*time.Minute), nil)
	if err != nil {
		t.Fatal(err)
	}
	if got {
		t.Fatalf("cancelled lesson should not block its slot")
	}

	// excludeLessonID lets a reschedule ignore the lesson itself.
	got, err = m.HasOverlappingLessons(ctx, tutorA, t0, t0.Add(time.Hour), &existing.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got {
		t.Fatalf("excludeLessonID should ignore the existing lesson")
	}
}

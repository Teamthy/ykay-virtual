package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/booking"
	"ykay-virtual/internal/domain/practice"
	"ykay-virtual/internal/repository/memory"

	"github.com/google/uuid"
)

func newExamService() (*PracticeExamService, *memory.EnrollmentMemory) {
	enrollments := memory.NewEnrollmentMemory()
	return NewPracticeExamService(memory.NewPracticeExamMemory(), enrollments), enrollments
}

func seedExam(t *testing.T, svc *PracticeExamService, tutorID uuid.UUID, in CreateExamInput) *practice.Exam {
	t.Helper()
	e, err := svc.CreateExam(context.Background(), tutorID, in)
	if err != nil {
		t.Fatalf("create exam: %v", err)
	}
	return e
}

func baseInput() CreateExamInput {
	return CreateExamInput{
		Subject:         "Mathematics",
		Title:           "JAMB-style Algebra paper",
		Description:     "25-minute CBT drill",
		DurationMinutes: 25,
		PassingScore:    60,
		Questions: []ExamQuestionInput{
			{Text: "2 + 2 = ?", Options: []string{"3", "4", "5", "6"}, CorrectIndex: 1, Explanation: "basic addition"},
			{Text: "5 * 6 = ?", Options: []string{"30", "11", "25", "56"}, CorrectIndex: 0},
		},
	}
}

func TestCreateExamValidation(t *testing.T) {
	svc, _ := newExamService()
	tutor := uuid.New()
	cases := []struct {
		name   string
		mutate func(*CreateExamInput)
	}{
		{"no title", func(in *CreateExamInput) { in.Title = "  " }},
		{"no subject", func(in *CreateExamInput) { in.Subject = "" }},
		{"bad duration", func(in *CreateExamInput) { in.DurationMinutes = 0 }},
		{"bad passing", func(in *CreateExamInput) { in.PassingScore = 101 }},
		{"no questions", func(in *CreateExamInput) { in.Questions = nil }},
		{"one option", func(in *CreateExamInput) { in.Questions[0].Options = []string{"yes"} }},
		{"correct out of range", func(in *CreateExamInput) { in.Questions[0].CorrectIndex = 4 }},
		{"empty question text", func(in *CreateExamInput) { in.Questions[0].Text = " " }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := baseInput()
			tc.mutate(&in)
			if _, err := svc.CreateExam(context.Background(), tutor, in); err == nil {
				t.Fatal("expected validation error, got nil")
			} else if !errors.Is(err, domain.ErrInvalidInput) {
				t.Fatalf("expected ErrInvalidInput, got %v", err)
			}
		})
	}
}

func TestTutorOwnership(t *testing.T) {
	svc, _ := newExamService()
	a, b := uuid.New(), uuid.New()
	e := seedExam(t, svc, a, baseInput())

	if _, err := svc.GetTutorExam(context.Background(), b, e.ID); !errors.Is(err, practice.ErrNotOwner) {
		t.Fatalf("expected ErrNotOwner, got %v", err)
	}
	if err := svc.DeleteExam(context.Background(), b, e.ID); !errors.Is(err, practice.ErrNotOwner) {
		t.Fatalf("expected ErrNotOwner on delete, got %v", err)
	}
	got, err := svc.GetTutorExam(context.Background(), a, e.ID)
	if err != nil || got.ID != e.ID {
		t.Fatalf("owner should read exam: %v", err)
	}
	if len(got.Questions) != 2 {
		t.Fatalf("expected 2 questions, got %d", len(got.Questions))
	}
}

func TestCohortScopedEligibility(t *testing.T) {
	svc, enrollments := newExamService()
	tutor := uuid.New()
	cohort := uuid.New()
	member := uuid.New()
	outsider := uuid.New()

	in := baseInput()
	in.CohortID = &cohort
	seedExam(t, svc, tutor, in)
	// an open exam too
	openIn := baseInput()
	openIn.Title = "Open paper"
	seedExam(t, svc, tutor, openIn)

	if err := enrollments.Create(context.Background(), &booking.CohortEnrollment{ID: uuid.New(), CohortID: cohort, StudentProfileID: member, Status: "CONFIRMED"}); err != nil {
		t.Fatalf("seed enrollment: %v", err)
	}

	memberExams, err := svc.ListStudentExams(context.Background(), member, uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	if len(memberExams) != 2 {
		t.Fatalf("member should see 2 exams (scoped + open), got %d", len(memberExams))
	}

	outExams, err := svc.ListStudentExams(context.Background(), outsider, uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	if len(outExams) != 1 || outExams[0].Title != "Open paper" {
		t.Fatalf("outsider should only see the open exam, got %d", len(outExams))
	}
}

func TestAttemptLifecycleAndScoring(t *testing.T) {
	svc, _ := newExamService()
	tutor := uuid.New()
	student := uuid.New()
	e := seedExam(t, svc, tutor, baseInput())

	start := time.Date(2026, 8, 21, 10, 0, 0, 0, time.UTC)
	svc.WithClock(func() time.Time { return start })

	a, err := svc.StartAttempt(context.Background(), student, e.ID, uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	if a.ExpiresAt.Sub(start) != 25*time.Minute {
		t.Fatalf("expiry should be 25m after start, got %v", a.ExpiresAt.Sub(start))
	}

	// 1 correct of 2 → 50% < 60 → fail
	res, err := svc.SubmitAttempt(context.Background(), student, a.ID, map[string]int{
		e.Questions[0].ID.String(): 1,
		e.Questions[1].ID.String(): 3, // wrong
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.Score != 50 || res.Passed || res.Correct != 1 || res.Total != 2 {
		t.Fatalf("bad result: %+v", res)
	}

	dup, err := svc.SubmitAttempt(context.Background(), student, a.ID, map[string]int{})
	if err != nil {
		t.Fatalf("duplicate submit should replay marked review, got %v", err)
	}
	if dup.AttemptID != a.ID || dup.Score != res.Score || dup.Correct != res.Correct {
		t.Fatalf("duplicate submit should replay original result: got %+v want score=%d correct=%d", dup, res.Score, res.Correct)
	}

	// review shows the marked paper
	review, err := svc.GetAttemptReview(context.Background(), student, a.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(review.Questions) != 2 || review.Questions[0].CorrectIndex != 1 {
		t.Fatalf("review should carry correct answers: %+v", review.Questions)
	}

	// history
	items, err := svc.ListStudentAttempts(context.Background(), student, 10)
	if err != nil || len(items) != 1 || items[0].ExamTitle != e.Title {
		t.Fatalf("history should contain the attempt: %v", err)
	}

	// tutor sees attempt results
	tutorItems, err := svc.ListExamAttempts(context.Background(), tutor, e.ID, 10)
	if err != nil || len(tutorItems) != 1 {
		t.Fatalf("tutor should see attempts: %v", err)
	}
}

func TestExpiryAutoSubmit(t *testing.T) {
	svc, _ := newExamService()
	tutor := uuid.New()
	student := uuid.New()
	e := seedExam(t, svc, tutor, baseInput())

	start := time.Date(2026, 8, 21, 10, 0, 0, 0, time.UTC)
	svc.WithClock(func() time.Time { return start })
	a, err := svc.StartAttempt(context.Background(), student, e.ID, uuid.New())
	if err != nil {
		t.Fatal(err)
	}

	// clock jumps past the limit
	svc.WithClock(func() time.Time { return start.Add(26 * time.Minute) })
	res, err := svc.SubmitAttempt(context.Background(), student, a.ID, map[string]int{
		e.Questions[0].ID.String(): 1, // answered correctly before time ran out
	})
	if err != nil {
		t.Fatal(err)
	}
	if !res.Expired {
		t.Fatal("expected expired flag")
	}
	if res.Score != 50 {
		t.Fatalf("only the answered question counts: got %d", res.Score)
	}
}

func TestUnsubmittedReviewRejected(t *testing.T) {
	svc, _ := newExamService()
	tutor := uuid.New()
	student := uuid.New()
	e := seedExam(t, svc, tutor, baseInput())
	a, err := svc.StartAttempt(context.Background(), student, e.ID, uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.GetAttemptReview(context.Background(), student, a.ID); !errors.Is(err, practice.ErrAttemptNotMarked) {
		t.Fatalf("expected ErrAttemptNotMarked, got %v", err)
	}
}

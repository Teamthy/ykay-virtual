// Package practice — the CBT practice-exam engine: tutor-authored exams,
// timed student attempts, auto-scoring and review. Mirrors the model used by
// real school/college exam systems (paper → sitting → marking → review).
package practice

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// Exam statuses.
const (
	StatusActive   = "ACTIVE"
	StatusArchived = "ARCHIVED"
)

// Sentinel errors — mapped to API errors by the transport layer.
var (
	ErrNotFound         = errors.New("practice exam not found")
	ErrNotOwner         = errors.New("practice exam does not belong to this tutor")
	ErrNotAvailable     = errors.New("this practice exam is not available to you")
	ErrAttemptNotFound  = errors.New("attempt not found")
	ErrAttemptSubmitted = errors.New("attempt already submitted")
	ErrAttemptNotMarked = errors.New("attempt is still in progress")
)

// Exam — one tutor-authored paper.
type Exam struct {
	ID              uuid.UUID
	TutorID         uuid.UUID
	Subject         string
	Title           string
	Description     string
	DurationMinutes int
	PassingScore    int // percent
	CohortID        *uuid.UUID
	Status          string
	// Premium — part of the NUVORA Plus CBT vault (migration 000066). Premium
	// exams are only accessible to users with an active Plus subscription.
	Premium   bool
	Questions []Question
	CreatedAt time.Time
	UpdatedAt time.Time
}

// Question — one item with options and the correct answer.
type Question struct {
	ID           uuid.UUID
	ExamID       uuid.UUID
	Position     int
	Text         string
	Options      []string
	CorrectIndex int
	Explanation  string
}

// Attempt — one timed sitting by one student.
type Attempt struct {
	ID          uuid.UUID
	ExamID      uuid.UUID
	StudentID   uuid.UUID
	StartedAt   time.Time
	ExpiresAt   time.Time
	SubmittedAt *time.Time
	Answers     map[string]int
	Score       *int
	Passed      *bool
}

// Repository — persistence for exams, questions and attempts.
// Implementations: internal/repository/postgres, internal/repository/memory.
type Repository interface {
	CreateExam(ctx context.Context, e *Exam) error
	UpdateExam(ctx context.Context, e *Exam) error
	DeleteExam(ctx context.Context, id uuid.UUID) error
	GetExam(ctx context.Context, id uuid.UUID) (*Exam, error)
	ListByTutor(ctx context.Context, tutorID uuid.UUID) ([]Exam, error)
	ListActive(ctx context.Context) ([]Exam, error)

	CreateAttempt(ctx context.Context, a *Attempt) error
	UpdateAttempt(ctx context.Context, a *Attempt) error
	GetAttempt(ctx context.Context, id uuid.UUID) (*Attempt, error)
	ListAttemptsByStudent(ctx context.Context, studentID uuid.UUID, limit int) ([]Attempt, error)
	ListAttemptsByExam(ctx context.Context, examID uuid.UUID, limit int) ([]Attempt, error)
}

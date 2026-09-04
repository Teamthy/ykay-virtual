// Package cbt — the shared computer-based-testing practice bank: subjects,
// exam-style questions, random per-request papers and server-side grading.
// The correct index NEVER leaves the repository in a generated paper; it is
// revealed only in the graded review.
package cbt

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var (
	ErrNotFound      = errors.New("cbt: not found")
	ErrNotEnough     = errors.New("cbt: not enough published questions for the requested paper")
	ErrInvalidInput  = errors.New("cbt: invalid input")
	ErrDuplicateStem = errors.New("cbt: question stem already exists in subject")
)

type Subject struct {
	ID            uuid.UUID
	Slug          string
	Name          string
	ClassLevel    string
	Department    string
	QuestionCount int // published questions (list views)
}

// Question — one MCQ. Options usually has 4 entries; CorrectIndex is the key.
type Question struct {
	ID           uuid.UUID
	SubjectID    uuid.UUID
	SubjectSlug  string `json:"subject_slug,omitempty"`
	Topic        string
	Difficulty   int
	Stem         string
	Options      []string
	CorrectIndex int
	Explanation  string
	Source       string
	Status       string
}

type Repository interface {
	// ListSubjects returns every subject with its published-question count.
	ListSubjects(ctx context.Context) ([]Subject, error)
	// UpsertSubject creates or updates a subject by slug.
	UpsertSubject(ctx context.Context, s *Subject) error
	// RandomQuestions draws n random published questions for a subject slug.
	RandomQuestions(ctx context.Context, subjectSlug string, n int) ([]Question, error)
	// GetByIDs fetches questions by id (published only) — used by grading.
	GetByIDs(ctx context.Context, ids []uuid.UUID) ([]Question, error)
	// CreateQuestion inserts a question; duplicate stems error/are skipped per flag.
	CreateQuestion(ctx context.Context, q *Question, skipDuplicate bool) (created bool, err error)
	// ListQuestions returns a page of questions (any status) for a subject (or all).
	ListQuestions(ctx context.Context, subjectSlug string, limit, offset int) ([]Question, int, error)
	// SetStatus publishes/unpublishes a question.
	SetStatus(ctx context.Context, id uuid.UUID, status string) error
	// DeleteQuestion removes a question.
	DeleteQuestion(ctx context.Context, id uuid.UUID) error
	// CountPublished totals published questions across the bank.
	CountPublished(ctx context.Context) (int, error)
}
